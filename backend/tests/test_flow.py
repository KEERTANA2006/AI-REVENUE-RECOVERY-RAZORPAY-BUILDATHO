import sys
import os
from fastapi.testclient import TestClient

# Add project root and backend dir to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from backend.app.db import SessionLocal, init_db
from backend.app.models import Transaction

def test_full_pipeline():
    init_db()
    with TestClient(app) as client:
        # Health check
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        
        # Upload sample CSV data
        csv_path = "backend/data/synthetic_failed_payments.csv"
        assert os.path.exists(csv_path), "Synthetic CSV file does not exist"
        
        with open(csv_path, "rb") as f:
            upload_resp = client.post("/api/transactions/upload", files={"file": ("synthetic_failed_payments.csv", f, "text/csv")})
        assert upload_resp.status_code == 200
        print("Upload result:", upload_resp.json())
        
        # List transactions
        list_resp = client.get("/api/transactions/?limit=10")
        assert list_resp.status_code == 200
        txs = list_resp.json()["items"]
        assert len(txs) > 0
        print(f"Loaded {len(txs)} transactions for test.")
        
        tx_id = txs[0]["id"]
        
        # Trigger multi-agent decision
        decide_resp = client.post(f"/api/transactions/{tx_id}/decide")
        assert decide_resp.status_code == 200
        decision = decide_resp.json()
        
        print("\n--- DECISION OUTPUT ---")
        print(f"Recommended Action: {decision['recommended_action']}")
        print(f"Recovery Probability: {decision['recovery_probability']:.2%}")
        print(f"Policy Notes: {decision['policy_notes']}")
        print(f"LLM Explanation: {decision['llm_explanation']}")
        print(f"Payment Link URL: {decision['payment_link_url']}")
        print(f"Needs Human Review: {decision['needs_human_review']}")
        print(f"All Action Scores: {decision['all_scores']}")
        
        # Get audit trail
        audit_resp = client.get(f"/api/transactions/{tx_id}/audit")
        assert audit_resp.status_code == 200
        print(f"Audit log entries count: {len(audit_resp.json())}")

if __name__ == "__main__":
    test_full_pipeline()
