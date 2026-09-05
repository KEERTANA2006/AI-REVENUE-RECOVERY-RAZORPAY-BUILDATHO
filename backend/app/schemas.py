from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class TransactionCreate(BaseModel):
    event_id: str
    customer_id: str
    merchant_id: str
    event_type: str
    event_timestamp: datetime
    currency: str
    amount: float
    attempt_number: int
    payment_method: str
    failure_reason: str
    risk_score: float
    days_since_first_attempt: int
    total_failed_attempts: int
    last_successful_payment_days_ago: int
    session_duration_seconds: Optional[int] = None
    cart_value: Optional[float] = None
    pages_viewed: Optional[int] = None
    device_type: str
    is_international: int
    merchant_category: str
    customer_consent: int
    emails_sent_today: int
    sms_sent_today: int
    total_recovery_messages_sent: int

class TransactionResponse(TransactionCreate):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class TransactionList(BaseModel):
    items: List[TransactionResponse]
    total: int

class ActionScore(BaseModel):
    action: str
    recovery_prob: float
    reason: str

class PolicyResult(BaseModel):
    allowed_actions: List[str]
    blocked_actions: List[str]
    recommended_action: str
    needs_human_review: bool

class DecideRequest(BaseModel):
    overrides: Optional[Dict[str, Any]] = None

class DecideResponse(BaseModel):
    decision_id: int
    recommended_action: str
    recovery_probability: float
    all_scores: List[ActionScore]
    policy_notes: str
    llm_explanation: Optional[str]
    customer_message: Optional[str]
    payment_link_url: Optional[str]
    needs_human_review: bool
    audit_ids: List[int]

class DecisionResponse(BaseModel):
    id: int
    transaction_id: int
    recommended_action: str
    recovery_probability: float
    all_scores: str
    blocked_actions: str
    policy_notes: str
    llm_explanation: Optional[str]
    customer_message: Optional[str]
    payment_link_url: Optional[str]
    needs_human_review: bool
    executed: bool
    outcome: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class MonitoringStats(BaseModel):
    total_transactions: int
    total_decisions: int
    recovery_rate: float
    pending_transactions: int

class DriftReportResponse(BaseModel):
    report_url: str
    generated_at: datetime

class RecoveryMetrics(BaseModel):
    revenue_at_risk: float
    recoverable_revenue: float
    revenue_recovered: float
    recovery_rate: float
    transactions_recovered: int
    active_workflows: int
    policy_blocks: int
    human_escalations: int
    stopped_workflows: int
    total_transactions: int

class BatchSimulationRequest(BaseModel):
    limit: Optional[int] = 100

class BatchSimulationResponse(BaseModel):
    total_processed: int
    recovery_attempts: int
    successful_recoveries: int
    revenue_recovered: float
    recovery_rate: float
    policy_blocked_actions: int
    human_escalations: int
    stopped_workflows: int
    results: List[Dict[str, Any]]
