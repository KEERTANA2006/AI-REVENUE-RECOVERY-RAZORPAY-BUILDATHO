from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io
import json
from datetime import datetime

from .. import models, schemas
from ..db import get_db

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

@router.get("/", response_model=schemas.TransactionList)
def list_transactions(skip: int = 0, limit: int = 100, status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Transaction)
    if status:
        query = query.filter(models.Transaction.status == status)
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total}

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    
    count = 0
    for row in reader:
        try:
            row_data = {k: v if v != "" else None for k, v in row.items()}
            if "event_timestamp" in row_data and isinstance(row_data["event_timestamp"], str):
                try:
                    row_data["event_timestamp"] = datetime.fromisoformat(row_data["event_timestamp"])
                except ValueError:
                    pass
            tx_data = schemas.TransactionCreate(**row_data)
            db_tx = models.Transaction(**tx_data.model_dump())
            db.add(db_tx)
            count += 1
        except Exception as e:
            print(f"Error parsing row: {e}")
            continue
            
    db.commit()
    return {"message": f"Successfully uploaded {count} transactions"}

@router.get("/{transaction_id}", response_model=schemas.TransactionResponse)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx

@router.post("/{transaction_id}/decide", response_model=schemas.DecideResponse)
def decide_transaction(transaction_id: int, req: Request, request: Optional[schemas.DecideRequest] = None, db: Session = Depends(get_db)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    tx_dict = {column.name: getattr(tx, column.name) for column in tx.__table__.columns}
    
    orchestrator = getattr(req.app.state, "orchestrator", None)
    if not orchestrator:
        raise HTTPException(status_code=500, detail="Orchestrator agent not initialized")
    
    out = orchestrator.run_decision(tx_dict)
    
    scores = [schemas.ActionScore(action=s['action'], recovery_prob=s['recovery_prob'], reason=s['reason']) for s in out['scores']]
    explanation = out.get('explanation', {})
    policy_res = out.get('policy_result', {})
    exec_res = out.get('execution_result', {})
    
    decision = models.Decision(
        transaction_id=tx.id,
        recommended_action=out.get('recommended_action', 'NONE'),
        recovery_probability=out.get('recovery_probability', 0.0),
        all_scores=json.dumps(out.get('scores', [])),
        blocked_actions=json.dumps(policy_res.get('blocked_actions', [])),
        policy_notes=policy_res.get('policy_notes', ''),
        llm_explanation=explanation.get('merchant_explanation'),
        customer_message=explanation.get('customer_message'),
        payment_link_url=out.get('payment_link_url'),
        needs_human_review=out.get('needs_human_review', False),
        executed=exec_res.get('executed', False),
        outcome=exec_res.get('outcome')
    )
    db.add(decision)
    tx.status = 'decided'
    db.commit()
    db.refresh(decision)
    
    audit_ids = []
    
    # Log blocked actions audit trail
    for blocked in policy_res.get('blocked_actions', []):
        audit = models.AuditLog(
            transaction_id=tx.id,
            decision_id=decision.id,
            action=blocked['action'],
            agent="policy",
            details=json.dumps(blocked),
            blocked=True,
            block_reason=blocked.get('block_reason')
        )
        db.add(audit)
        db.commit()
        db.refresh(audit)
        audit_ids.append(audit.id)
        
    # Log execution audit trail
    for entry in out.get('audit_entries', []):
        audit = models.AuditLog(
            transaction_id=tx.id,
            decision_id=decision.id,
            action=entry.get('action', 'execution'),
            agent="executor",
            details=json.dumps(entry),
            blocked=False
        )
        db.add(audit)
        db.commit()
        db.refresh(audit)
        audit_ids.append(audit.id)
        
    return schemas.DecideResponse(
        decision_id=decision.id,
        recommended_action=decision.recommended_action,
        recovery_probability=decision.recovery_probability,
        all_scores=scores,
        policy_notes=decision.policy_notes,
        llm_explanation=decision.llm_explanation,
        customer_message=decision.customer_message,
        payment_link_url=decision.payment_link_url,
        needs_human_review=decision.needs_human_review,
        audit_ids=audit_ids
    )

@router.get("/{transaction_id}/decisions", response_model=List[schemas.DecisionResponse])
def get_transaction_decisions(transaction_id: int, db: Session = Depends(get_db)):
    decisions = db.query(models.Decision).filter(models.Decision.transaction_id == transaction_id).all()
    return decisions

@router.get("/{transaction_id}/audit")
def get_transaction_audit(transaction_id: int, db: Session = Depends(get_db)):
    logs = db.query(models.AuditLog).filter(models.AuditLog.transaction_id == transaction_id).all()
    return logs

@router.post("/decide-batch")
def decide_batch(transaction_ids: List[int], req: Request, db: Session = Depends(get_db)):
    results = []
    for tx_id in transaction_ids:
        try:
            res = decide_transaction(tx_id, req, None, db)
            results.append({"transaction_id": tx_id, "success": True, "decision": res})
        except Exception as e:
            results.append({"transaction_id": tx_id, "success": False, "error": str(e)})
    return results
