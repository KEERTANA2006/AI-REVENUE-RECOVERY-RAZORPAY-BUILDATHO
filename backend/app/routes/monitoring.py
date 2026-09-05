from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from .. import schemas, models
from ..db import get_db

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])

@router.get("/stats", response_model=schemas.MonitoringStats)
def get_stats(db: Session = Depends(get_db)):
    total_tx = db.query(models.Transaction).count()
    total_decisions = db.query(models.Decision).count()
    recovered = db.query(models.Transaction).filter(models.Transaction.status == "recovered").count()
    pending = db.query(models.Transaction).filter(models.Transaction.status == "pending").count()
    
    recovery_rate = recovered / total_tx if total_tx > 0 else 0.0
    
    return schemas.MonitoringStats(
        total_transactions=total_tx,
        total_decisions=total_decisions,
        recovery_rate=recovery_rate,
        pending_transactions=pending
    )

@router.post("/drift-report", response_model=schemas.DriftReportResponse)
def generate_drift_report():
    # Placeholder for actual subprocess call to Evidently/whylogs
    report_url = "/reports/drift_report.html"
    return schemas.DriftReportResponse(
        report_url=report_url,
        generated_at=datetime.now(timezone.utc)
    )

@router.get("/drift-report")
def get_latest_drift_report():
    return {"report_url": "/reports/drift_report.html"}
