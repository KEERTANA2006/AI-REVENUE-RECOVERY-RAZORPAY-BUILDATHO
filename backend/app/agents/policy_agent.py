from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class PolicyAgent:
    def __init__(self, config):
        self.config = config
        
    def evaluate(self, scores: list[dict], transaction_data: dict, merchant_policy: dict = None) -> dict:
        """
        Apply policy rules to filter and rank actions.
        """
        allowed_actions = []
        blocked_actions = []
        policy = merchant_policy if merchant_policy else self.config
        
        # Merge dicts
        max_emails = policy.get('max_emails_per_day', 2)
        max_sms = policy.get('max_sms_per_day', 1)
        max_total_msgs = policy.get('max_total_messages', 3)
        max_risk = policy.get('max_risk_for_outreach', 7.5)
        quiet_start = policy.get('quiet_hours_start', 22)
        quiet_end = policy.get('quiet_hours_end', 8)
        
        customer_consent = transaction_data.get('customer_consent', 0)
        emails_sent = transaction_data.get('emails_sent_today', 0)
        sms_sent = transaction_data.get('sms_sent_today', 0)
        total_msgs = transaction_data.get('total_recovery_messages_sent', 0)
        risk_score = transaction_data.get('risk_score', 0.0)
        
        current_hour = datetime.now().hour
        in_quiet_hours = False
        if quiet_start > quiet_end:
            in_quiet_hours = current_hour >= quiet_start or current_hour < quiet_end
        else:
            in_quiet_hours = quiet_start <= current_hour < quiet_end

        needs_human_review = risk_score >= 8.0
        
        for score in scores:
            action = score['action']
            prob = score['recovery_prob']
            
            block_reason = None
            block_code = None
            
            if action in ['RETRY', 'NONE', 'HUMAN_REVIEW']:
                # Always allowed
                pass
            elif action in ['EMAIL_OFFER', 'SMS_REMINDER', 'PAYMENT_LINK']:
                if customer_consent != 1:
                    block_reason = 'Customer has not consented'
                    block_code = 'NO_CONSENT'
                elif in_quiet_hours:
                    block_reason = 'Currently in quiet hours'
                    block_code = 'QUIET_HOURS'
                elif total_msgs >= max_total_msgs:
                    block_reason = 'Total message limit exceeded'
                    block_code = 'TOTAL_MESSAGE_LIMIT_EXCEEDED'
                elif risk_score >= max_risk:
                    block_reason = 'Risk score too high for outreach'
                    block_code = 'HIGH_RISK'
                elif action == 'EMAIL_OFFER' and emails_sent >= max_emails:
                    block_reason = 'Email limit exceeded'
                    block_code = 'EMAIL_LIMIT_EXCEEDED'
                elif action == 'SMS_REMINDER' and sms_sent >= max_sms:
                    block_reason = 'SMS limit exceeded'
                    block_code = 'SMS_LIMIT_EXCEEDED'
            
            if block_code:
                blocked_actions.append({
                    'action': action,
                    'recovery_prob': prob,
                    'block_reason': block_reason,
                    'block_code': block_code
                })
            else:
                allowed_actions.append(score)
                
        allowed_actions.sort(key=lambda x: x['recovery_prob'], reverse=True)
        recommended_action = allowed_actions[0] if allowed_actions else None
        
        return {
            'allowed_actions': allowed_actions,
            'blocked_actions': blocked_actions,
            'recommended_action': recommended_action,
            'needs_human_review': needs_human_review,
            'policy_notes': f"Applied policy. {len(allowed_actions)} allowed, {len(blocked_actions)} blocked."
        }
