import logging
import requests
from requests.auth import HTTPBasicAuth

logger = logging.getLogger(__name__)

class RazorpayService:
    def __init__(self, key_id: str, key_secret: str):
        self.key_id = key_id
        self.key_secret = key_secret
        self.enabled = bool(key_id and key_secret)
        self.base_url = "https://api.razorpay.com/v1/payment_links"
    
    def create_payment_link(self, amount: float, currency: str, 
                           customer_id: str, description: str) -> dict:
        """
        Create a Razorpay test payment link.
        """
        if not self.enabled:
            return {
                'success': True,
                'payment_link_url': 'https://simulated.razorpay.com/plink_123',
                'payment_link_id': 'plink_simulated_123',
                'simulated': True
            }
            
        payload = {
            "amount": amount,
            "currency": currency,
            "description": description,
            "customer": {
                "name": customer_id,
                "contact": "9999999999",
                "email": f"{customer_id}@example.com"
            },
            "notify": {
                "sms": False,
                "email": False
            }
        }
        
        try:
            response = requests.post(
                self.base_url,
                auth=HTTPBasicAuth(self.key_id, self.key_secret),
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            return {
                'success': True,
                'payment_link_url': data.get('short_url'),
                'payment_link_id': data.get('id'),
                'simulated': False
            }
        except Exception as e:
            logger.error(f"Razorpay API error: {e}")
            return {
                'success': False,
                'payment_link_url': None,
                'payment_link_id': None,
                'simulated': False,
                'error': str(e)
            }
