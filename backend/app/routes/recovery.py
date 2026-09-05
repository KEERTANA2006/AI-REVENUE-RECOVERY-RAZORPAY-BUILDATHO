from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import json
from datetime import datetime

from .. import models, schemas
from ..db import get_db

router = APIRouter(prefix="/api/recovery", tags=["recovery"])

@router.get("/metrics", response_model=schemas.RecoveryMetrics)
def get_recovery_metrics(db: Session = Depends(get_db)):
    """
    Calculate and return real-time financial and recovery metrics strictly from DB records.
    """
    total_tx = db.query(models.Transaction).count()
    sum_at_risk = db.query(func.sum(models.Transaction.amount)).scalar() or 0.0
    
    # Calculate revenue recovered directly from DB records where status == 'recovered'
    recovered_txs = db.query(models.Transaction).filter(models.Transaction.status == "recovered").all()
    sum_recovered = sum([tx.amount for tx in recovered_txs])
    count_recovered = len(recovered_txs)
    
    # Recoverable revenue estimation from compliant transactions
    recoverable_txs = db.query(models.Transaction).filter(
        models.Transaction.risk_score < 7.5,
        models.Transaction.customer_consent == 1
    ).all()
    sum_recoverable = sum([tx.amount for tx in recoverable_txs])
    
    active_workflows = db.query(models.Transaction).filter(
        models.Transaction.status.in_(["pending", "decided", "recovering"])
    ).count()
    
    policy_blocks = db.query(models.AuditLog).filter(models.AuditLog.blocked == True).count()
    human_escalations = db.query(models.Decision).filter(models.Decision.needs_human_review == True).count()
    stopped_workflows = db.query(models.Transaction).filter(
        models.Transaction.status.in_(["recovered", "blocked", "stopped", "failed"])
    ).count()
    
    recovery_rate = (count_recovered / total_tx * 100) if total_tx > 0 else 0.0
    
    return schemas.RecoveryMetrics(
        revenue_at_risk=round(sum_at_risk, 2),
        recoverable_revenue=round(sum_recoverable, 2),
        revenue_recovered=round(sum_recovered, 2),
        recovery_rate=round(recovery_rate, 1),
        transactions_recovered=count_recovered,
        active_workflows=active_workflows,
        policy_blocks=policy_blocks,
        human_escalations=human_escalations,
        stopped_workflows=stopped_workflows,
        total_transactions=total_tx
    )

@router.post("/batch-simulate", response_model=schemas.BatchSimulationResponse)
def run_batch_simulation(req: Request, payload: Optional[schemas.BatchSimulationRequest] = None, db: Session = Depends(get_db)):
    """
    Run multi-agent batch recovery engine across transactions in DB.
    Enforces stopping rules, creates AuditLog entries for every execution, and mutates DB status.
    """
    limit = payload.limit if payload else 10
    orchestrator = getattr(req.app.state, "orchestrator", None)
    
    txs = db.query(models.Transaction).limit(limit).all()
    if not txs:
        return schemas.BatchSimulationResponse(
            total_processed=0,
            recovery_attempts=0,
            successful_recoveries=0,
            revenue_recovered=0.0,
            recovery_rate=0.0,
            policy_blocked_actions=0,
            human_escalations=0,
            stopped_workflows=0,
            results=[]
        )
        
    results = []
    attempts = 0
    successes = 0
    sum_recovered = 0.0
    blocked_count = 0
    escalated_count = 0
    stopped_count = 0
    
    for tx in txs:
        # Check stopping rule #1: If ALREADY recovered, STOP immediately (prevent double recovery)
        if tx.status == "recovered":
            stopped_count += 1
            results.append({
                "transaction_id": tx.event_id,
                "amount_at_risk": tx.amount,
                "recommended_action": "NONE",
                "policy_decision": "STOPPED",
                "execution_outcome": "no_action_already_recovered",
                "recovered_amount": tx.amount,
                "recovery_status": "recovered",
                "stopping_reason": "Stopping Rule #1: Payment already recovered -> STOP"
            })
            continue
            
        # Check stopping rule #2: Max retry attempts reached
        if tx.attempt_number >= 3 or tx.total_failed_attempts >= 5:
            tx.status = "stopped"
            stopped_count += 1
            db.commit()
            
            audit = models.AuditLog(
                transaction_id=tx.id,
                action="STOP_WORKFLOW",
                agent="policy",
                details=json.dumps({"reason": "Max retry attempts reached"}),
                blocked=True,
                block_reason="MAX_RETRIES_EXCEEDED"
            )
            db.add(audit)
            db.commit()
            
            results.append({
                "transaction_id": tx.event_id,
                "amount_at_risk": tx.amount,
                "recommended_action": "STOP",
                "policy_decision": "STOPPED",
                "execution_outcome": "workflow_stopped",
                "recovered_amount": 0.0,
                "recovery_status": "stopped",
                "stopping_reason": "Stopping Rule #2: Max retry attempts reached -> STOP"
            })
            continue

        tx_dict = {column.name: getattr(tx, column.name) for column in tx.__table__.columns}
        
        if orchestrator:
            out = orchestrator.run_decision(tx_dict)
            rec_action = out.get("recommended_action", "NONE")
            policy_res = out.get("policy_result", {})
            blocked_list = policy_res.get("blocked_actions", [])
            needs_human = out.get("needs_human_review", False)
            exec_res = out.get("execution_result", {})
            explanation = out.get("explanation", {})
            
            # Record Decision DB entry
            decision = models.Decision(
                transaction_id=tx.id,
                recommended_action=rec_action,
                recovery_probability=out.get("recovery_probability", 0.0),
                all_scores=json.dumps(out.get("scores", [])),
                blocked_actions=json.dumps(blocked_list),
                policy_notes=policy_res.get("policy_notes", ""),
                llm_explanation=explanation.get("merchant_explanation"),
                customer_message=explanation.get("customer_message"),
                payment_link_url=out.get("payment_link_url"),
                needs_human_review=needs_human,
                executed=exec_res.get("executed", False),
                outcome=exec_res.get("outcome")
            )
            db.add(decision)
            db.commit()
            db.refresh(decision)
            
            # Record AuditLog entries for blocked actions
            for blocked in blocked_list:
                blocked_count += 1
                audit_b = models.AuditLog(
                    transaction_id=tx.id,
                    decision_id=decision.id,
                    action=blocked.get("action", "OUTREACH"),
                    agent="policy",
                    details=json.dumps(blocked),
                    blocked=True,
                    block_reason=blocked.get("block_reason")
                )
                db.add(audit_b)
                
            # Record AuditLog entries for execution
            for entry in out.get("audit_entries", []):
                audit_e = models.AuditLog(
                    transaction_id=tx.id,
                    decision_id=decision.id,
                    action=entry.get("action", rec_action),
                    agent="executor",
                    details=json.dumps(entry),
                    blocked=False
                )
                db.add(audit_e)
            db.commit()

            policy_decision = "ALLOWED"
            stopping_reason = "Executing bounded recovery intervention"
            
            if needs_human:
                escalated_count += 1
                tx.status = "escalated"
                policy_decision = "ESCALATED"
                stopping_reason = "Stopping Rule #5: Risk score > 7.5 threshold -> HUMAN REVIEW"
            elif blocked_list and rec_action in ["NONE", "STOP"]:
                tx.status = "blocked"
                stopped_count += 1
                policy_decision = "BLOCKED"
                stopping_reason = f"Stopping Rule #3/4: Policy blocked action ({blocked_list[0].get('block_code', 'POLICY_BLOCK')}) -> STOP"
            else:
                attempts += 1
                prob = out.get("recovery_probability", 0.3)
                # Successful recovery simulation
                if prob >= 0.50 and tx.customer_consent == 1:
                    tx.status = "recovered"
                    successes += 1
                    sum_recovered += tx.amount
                    stopped_count += 1
                    stopping_reason = "Stopping Rule #1: Payment successfully recovered -> STOP WORKFLOW"
                    
                    # Record termination audit
                    audit_term = models.AuditLog(
                        transaction_id=tx.id,
                        decision_id=decision.id,
                        action="WORKFLOW_STOPPED",
                        agent="system",
                        details=json.dumps({"reason": "Payment recovered, workflow terminated"}),
                        blocked=False
                    )
                    db.add(audit_term)
                else:
                    tx.status = "recovering"
                    stopping_reason = "Action executed, awaiting settlement"
            
            db.commit()
            
            results.append({
                "transaction_id": tx.event_id,
                "amount_at_risk": tx.amount,
                "recommended_action": rec_action,
                "policy_decision": policy_decision,
                "execution_outcome": exec_res.get("outcome", "no_action"),
                "recovered_amount": tx.amount if tx.status == "recovered" else 0.0,
                "recovery_status": tx.status,
                "stopping_reason": stopping_reason
            })

    total_proc = len(txs)
    rate = (successes / total_proc * 100) if total_proc > 0 else 0.0
    
    return schemas.BatchSimulationResponse(
        total_processed=total_proc,
        recovery_attempts=attempts,
        successful_recoveries=successes,
        revenue_recovered=round(sum_recovered, 2),
        recovery_rate=round(rate, 1),
        policy_blocked_actions=blocked_count,
        human_escalations=escalated_count,
        stopped_workflows=stopped_count,
        results=results
    )
