# 💰 RecoverFlow AI

### Agentic Revenue Recovery for Failed Payments
**Razorpay AI Buildathon 2026 — Track 03: AI Revenue Recovery**

# 📈 Monitoring
Evidently AI drift reports compare production data against training reference:
- **Data drift** per feature (KS test, PSI)
- **Prediction distribution drift**
- **Target drift** (if labels available)
Reports saved as interactive HTML at `backend/reports/drift_report.html`.
## 🔒 Safety & Compliance
- No automated messages without customer consent
- Hard limits on messages per day and lifetime
- High-risk transactions never auto-contacted
- All decisions logged with full input snapshot and policy snapshot
- **Dataset is synthetic; model is for demo only**
## 🚀 Live Demo

### 👉 [link to the prototype](https://recover-flow-ops.base44.app/login)

## 📁 Project Structure
```
recoverflow/
├─ README.md
├─ .gitignore
├─ backend/
│  ├─ app/
│  │  ├─ main.py          # FastAPI application
│  │  ├─ config.py         # Settings & env vars
│  │  ├─ db.py             # SQLAlchemy setup
│  │  ├─ models.py         # ORM models
│  │  ├─ schemas.py        # Pydantic schemas
│  │  ├─ routes/           # API endpoints
│  │  ├─ agents/           # Scorer, Policy, Executor, Orchestrator
│  │  ├─ services/         # LLM, Razorpay integrations
│  │  └─ workers/          # Monitoring background tasks
│  ├─ data/                # Generated datasets
│  ├─ models/              # Trained ML models
│  ├─ reports/             # Drift reports
│  └─ requirements.txt
├─ frontend/
│  ├─ index.html
│  ├─ app.js
│  └─ styles.css
├─ scripts/
│  ├─ generate_dataset.py
│  ├─ train_recovery_model.py
│  └─ generate_drift_report.py
└─ docs/
   ├─ architecture.md
   ├─ dataset.md
   └─ api.md
```
## 📄 License
MIT License — Built for the Razorpay AI Buildathon 2026.
