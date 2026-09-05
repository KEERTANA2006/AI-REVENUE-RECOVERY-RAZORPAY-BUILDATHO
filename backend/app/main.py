from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import logging

from .db import init_db
from .routes import transactions, monitoring, recovery
from .config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RecoverFlow AI")

# CORS for hackathon
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import joblib
from .agents.scorer_agent import ScorerAgent
from .agents.policy_agent import PolicyAgent
from .agents.executor_agent import ExecutorAgent
from .agents.orchestrator import Orchestrator
from .services.llm_service import LLMService
from .services.razorpay_service import RazorpayService

# Startup event
@app.on_event("startup")
def on_startup():
    logger.info("Initializing database...")
    init_db()
    
    logger.info("Loading ML Model and Preprocessor...")
    if os.path.exists(settings.MODEL_PATH) and os.path.exists(settings.PREPROCESSOR_PATH):
        model = joblib.load(settings.MODEL_PATH)
        preprocessor = joblib.load(settings.PREPROCESSOR_PATH)
        scorer = ScorerAgent(model, preprocessor)
        policy_config = {
            "max_emails_per_day": settings.MAX_EMAILS_PER_DAY,
            "max_sms_per_day": settings.MAX_SMS_PER_DAY,
            "max_total_messages": settings.MAX_TOTAL_MESSAGES,
            "max_risk_for_outreach": settings.MAX_RISK_FOR_OUTREACH,
            "quiet_hours_start": settings.QUIET_HOURS_START,
            "quiet_hours_end": settings.QUIET_HOURS_END
        }
        policy = PolicyAgent(policy_config)
        razorpay = RazorpayService(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        executor = ExecutorAgent(razorpay)
        llm = LLMService(settings.LLM_API_KEY, settings.LLM_PROVIDER, settings.LLM_MODEL)
        app.state.orchestrator = Orchestrator(scorer, policy, executor, llm)
        logger.info("Scorer, Policy, Executor agents and Orchestrator loaded successfully.")
    else:
        logger.warning(f"Model files not found at {settings.MODEL_PATH}")
    logger.info("Startup complete.")

# Include routers
app.include_router(transactions.router)
app.include_router(monitoring.router)
app.include_router(recovery.router)

# Mount static files
os.makedirs("reports", exist_ok=True)
app.mount("/reports", StaticFiles(directory="reports"), name="reports")

frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/")
def serve_frontend():
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found. API is running."}
