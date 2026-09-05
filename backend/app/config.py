from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = 'sqlite:///./recoverflow.db'
    RAZORPAY_KEY_ID: str = ''
    RAZORPAY_KEY_SECRET: str = ''
    LLM_API_KEY: str = ''
    LLM_PROVIDER: str = 'groq'  # or 'openrouter'
    LLM_MODEL: str = 'llama-3.1-8b-instant'
    MODEL_PATH: str = 'backend/models/model_recovery.pkl'
    PREPROCESSOR_PATH: str = 'backend/models/preprocessor.pkl'
    MAX_EMAILS_PER_DAY: int = 3
    MAX_SMS_PER_DAY: int = 2
    MAX_TOTAL_MESSAGES: int = 15
    MAX_RISK_FOR_OUTREACH: float = 7.0
    QUIET_HOURS_START: int = 21
    QUIET_HOURS_END: int = 8

    class Config:
        env_file = ".env"

settings = Settings()
