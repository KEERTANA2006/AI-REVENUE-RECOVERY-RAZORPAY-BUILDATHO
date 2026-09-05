from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .db import Base

def utcnow():
    return datetime.now(timezone.utc)

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String, unique=True, index=True)
    customer_id = Column(String, index=True)
    merchant_id = Column(String, index=True)
    event_type = Column(String)
    event_timestamp = Column(DateTime)
    currency = Column(String)
    amount = Column(Float)
    attempt_number = Column(Integer)
    payment_method = Column(String)
    failure_reason = Column(String)
    risk_score = Column(Float)
    days_since_first_attempt = Column(Integer)
    total_failed_attempts = Column(Integer)
    last_successful_payment_days_ago = Column(Integer)
    session_duration_seconds = Column(Integer, nullable=True)
    cart_value = Column(Float, nullable=True)
    pages_viewed = Column(Integer, nullable=True)
    device_type = Column(String)
    is_international = Column(Integer)
    merchant_category = Column(String)
    customer_consent = Column(Integer)
    emails_sent_today = Column(Integer)
    sms_sent_today = Column(Integer)
    total_recovery_messages_sent = Column(Integer)
    status = Column(String, default='pending')  # pending, decided, recovered, failed
    created_at = Column(DateTime, default=utcnow)
    
    decisions = relationship("Decision", back_populates="transaction")
    audit_logs = relationship("AuditLog", back_populates="transaction")

class Decision(Base):
    __tablename__ = "decisions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"))
    recommended_action = Column(String)
    recovery_probability = Column(Float)
    all_scores = Column(Text)  # JSON string
    blocked_actions = Column(Text)  # JSON string
    policy_notes = Column(Text)
    llm_explanation = Column(Text, nullable=True)
    customer_message = Column(Text, nullable=True)
    payment_link_url = Column(String, nullable=True)
    needs_human_review = Column(Boolean, default=False)
    executed = Column(Boolean, default=False)
    outcome = Column(String, nullable=True)  # success, failed, pending
    created_at = Column(DateTime, default=utcnow)
    
    transaction = relationship("Transaction", back_populates="decisions")
    audit_logs = relationship("AuditLog", back_populates="decision")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"))
    decision_id = Column(Integer, ForeignKey("decisions.id"), nullable=True)
    action = Column(String)
    agent = Column(String)  # scorer, policy, executor
    details = Column(Text)  # JSON string
    blocked = Column(Boolean, default=False)
    block_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    
    transaction = relationship("Transaction", back_populates="audit_logs")
    decision = relationship("Decision", back_populates="audit_logs")

class MerchantPolicy(Base):
    __tablename__ = "merchant_policies"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    merchant_id = Column(String, unique=True, index=True)
    max_emails_per_day = Column(Integer, default=3)
    max_sms_per_day = Column(Integer, default=2)
    max_total_messages = Column(Integer, default=15)
    max_risk_for_outreach = Column(Float, default=7.0)
    quiet_hours_start = Column(Integer, default=21)
    quiet_hours_end = Column(Integer, default=8)
    allow_international_outreach = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
