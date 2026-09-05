import sys
import os
import json
import random
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db import SessionLocal, init_db, engine, Base
from backend.app.models import Transaction, AuditLog, Decision
from scripts.generate_dataset import generate_dataset

def execute_judge_demo():
    print("================================================================================")
    print(" RECOVERFLOW AI - DETERMINISTIC 100-TRANSACTION JUDGE DEMO BATCH RUNNER")
    print("================================================================ algorithm\n")

    # 1. Reset Database & Generate Deterministic 100-Row Dataset (Seed = 42)
    np.random.seed(42)
    random.seed(42)
    
    # Generate 100 synthetic failed payment rows
    generate_dataset(num_rows=100)
    
    # Re-create clean DB tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Load 100 CSV rows into DB
    with TestClient(app) as client:
        csv_path = "backend/data/synthetic_failed_payments.csv"
        with open(csv_path, "rb") as f:
            upload_resp = client.post("/api/transactions/upload", files={"file": ("synthetic_failed_payments.csv", f, "text/csv")})
        print(f"Uploaded 100 deterministic transactions to DB: {upload_resp.json()}")

        # 2. Run Batch Simulate for all 100 transactions through Scorer -> Policy -> Executor pipeline
        batch_resp = client.post("/api/recovery/batch-simulate", json={"limit": 100})
        demo_json = batch_resp.json()

        # 3. Query GET /api/recovery/metrics directly from DB
        metrics_resp = client.get("/api/recovery/metrics")
        metrics_json = metrics_resp.json()

        # Verify DB sum vs batch summary
        db = SessionLocal()
        recovered_db_txs = db.query(Transaction).filter(Transaction.status == "recovered").all()
        db_sum = sum([tx.amount for tx in recovered_db_txs])
        db.close()

        # Build clean JSON output
        output_payload = {
            "demo_metadata": {
                "system": "RecoverFlow AI",
                "mode": "Razorpay Test Mode / Sandboxed Simulation",
                "random_seed": 42,
                "reproducible": True,
                "note": "All recovered revenue amounts are computed strictly from database records where payment status == 'recovered'."
            },
            "judge_summary": {
                "headline": f"Actual simulated revenue recovered: INR {metrics_json['revenue_recovered']:,.2f}",
                "total_transactions": demo_json["total_processed"],
                "revenue_at_risk": metrics_json["revenue_at_risk"],
                "recoverable_revenue": metrics_json["recoverable_revenue"],
                "recovery_attempts": demo_json["recovery_attempts"],
                "successful_recoveries": demo_json["successful_recoveries"],
                "actual_revenue_recovered": metrics_json["revenue_recovered"],
                "recovery_rate": f"{metrics_json['recovery_rate']}%",
                "policy_blocks": demo_json["policy_blocked_actions"],
                "human_escalations": demo_json["human_escalations"],
                "stopped_workflows": demo_json["stopped_workflows"]
            },
            "db_verification": {
                "db_recovered_rows_count": len(recovered_db_txs),
                "db_sum_recovered_amount": round(db_sum, 2),
                "api_metrics_recovered_amount": metrics_json["revenue_recovered"],
                "exact_match": abs(db_sum - metrics_json["revenue_recovered"]) < 0.01
            },
            "transaction_results": demo_json["results"]
        }

        # Print JSON output to console
        print("\n" + "=" * 80)
        print(" EXACT DEMO JSON OUTPUT FOR 100-TRANSACTION BATCH RUN")
        print("=" * 80)
        print(json.dumps(output_payload, indent=2))

        # Save JSON artifact
        os.makedirs("docs", exist_ok=True)
        with open("docs/judge_demo_100_results.json", "w") as f:
            f.write(json.dumps(output_payload, indent=2))

if __name__ == "__main__":
    execute_judge_demo()
