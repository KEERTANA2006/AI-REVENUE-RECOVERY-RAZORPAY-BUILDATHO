import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ExecutorAgent:
    def __init__(self, razorpay_service=None):
        self.razorpay_service = razorpay_service
    
    def execute(self, recommended_action: dict, transaction_data: dict) -> dict:
        """
        Execute the recommended action.
        """
        if not recommended_action:
            return {
                'executed': False,
                'action': None,
                'outcome': 'no_action_recommended',
                'payment_link_url': None,
                'details': 'No action was recommended.',
                'audit_entries': []
            }
            
        action = recommended_action['action']
        amount = transaction_data.get('amount', 0)
        
        result = {
            'executed': True,
            'action': action,
            'outcome': '',
            'payment_link_url': None,
            'details': '',
            'audit_entries': [{
                'timestamp': datetime.now().isoformat(),
                'action': action,
                'message': f"Started execution of {action}"
            }]
        }
        
        if action == 'RETRY':
            result['outcome'] = 'retry_initiated'
            result['details'] = 'Payment retry has been simulated.'
        elif action == 'PAYMENT_LINK':
            if self.razorpay_service:
                rp_res = self.razorpay_service.create_payment_link(
                    amount=int(amount * 100),
                    currency='INR',
                    customer_id=transaction_data.get('customer_id', 'cust_123'),
                    description='Payment Recovery'
                )
                result['payment_link_url'] = rp_res.get('payment_link_url')
                result['details'] = 'Payment link created via Razorpay.'
            else:
                result['payment_link_url'] = 'https://simulated.razorpay.com/link'
                result['details'] = 'Payment link simulated.'
            result['outcome'] = 'payment_link_created'
        elif action == 'EMAIL_OFFER':
            result['outcome'] = 'email_sent'
            result['details'] = 'Simulated sending email with recovery offer.'
        elif action == 'SMS_REMINDER':
            result['outcome'] = 'sms_sent'
            result['details'] = 'Simulated sending SMS reminder.'
        elif action == 'HUMAN_REVIEW':
            result['outcome'] = 'flagged_for_review'
            result['details'] = 'Transaction flagged for manual review.'
        elif action == 'NONE':
            result['outcome'] = 'no_action'
            result['details'] = 'No action taken as per recommendation.'
            
        result['audit_entries'].append({
            'timestamp': datetime.now().isoformat(),
            'action': action,
            'message': f"Completed execution: {result['outcome']}"
        })
        
        return result
