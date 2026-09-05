# RecoverFlow AI – Architecture

## High-Level Architecture

```
┌──────────────────────┐
│   Frontend (React)   │
│  index.html, app.js  │
└──────────┬───────────┘
           │ HTTPS REST API
           v
┌─────────────────────────────────────┐
│        FastAPI Backend              │
│  /api/transactions, /monitoring     │
└──────────┬──────────────────────────┘
           │
   ┌───────┴────────┬───────────────┬───────────────┐
   v                v               v               v
┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐
│   DB    │   │  Agents  │   │   LLM    │   │  Razorpay    │
│ SQLite/ │   │ Scorer,  │   │  Groq/   │   │  Test Mode   │
│ Postgres│   │ Policy,  │   │OpenRouter│   │  (links)     │
│         │   │ Executor │   │          │   │              │
└─────────┘   └──────────┘   └──────────┘   └──────────────┘
     │
     v
┌─────────────────────┐
│  Monitoring Worker  │
│  (Evidently AI)     │
│  Drift reports HTML │
└─────────────────────┘
```

## Decision Flow

```
Transaction → Scorer Agent → Policy Agent → Executor Agent → Audit Log
                  │                │               │
                  │                │               ├─ Razorpay Test Link
                  │                │               ├─ Simulated Retry
                  │                │               ├─ Email/SMS Simulation
                  │                │               └─ Human Review Flag
                  │                │
                  │                ├─ Consent Check
                  │                ├─ Message Limits
                  │                ├─ Risk Thresholds
                  │                └─ Quiet Hours
                  │
                  ├─ ML Model Prediction
                  └─ Per-Action Recovery Probability
```

## Key Design Decisions

1. **Deterministic decisions, LLM explanations**: The ML model + policy rules make all decisions. The LLM only generates human-readable explanations. This ensures safety and auditability.

2. **SQLite for dev, PostgreSQL for production**: Zero-config local development with seamless upgrade path.

3. **CDN React frontend**: No build step needed. Judges can open `index.html` directly or serve via FastAPI.

4. **Simulation fallbacks**: If Razorpay API keys or LLM keys are not configured, the system uses simulation/template fallbacks so the demo always works.

5. **Per-action scoring**: The model scores each candidate action independently by toggling action flags, allowing true comparison of recovery strategies.
