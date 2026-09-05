import json
import logging
import requests

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self, api_key: str, provider: str = 'groq', model: str = 'llama-3.1-8b-instant'):
        self.api_key = api_key
        self.provider = provider
        self.model = model
        if provider == 'groq':
            self.base_url = 'https://api.groq.com/openai/v1/chat/completions'
        elif provider == 'openrouter':
            self.base_url = 'https://openrouter.ai/api/v1/chat/completions'
        else:
            self.base_url = 'https://api.openai.com/v1/chat/completions'
    
    def generate_explanation(self, transaction_data: dict, recommended_action: str, 
                            recovery_prob: float, policy_notes: str) -> dict:
        """
        Call LLM API (OpenAI-compatible) with structured prompt.
        """
        if not self.api_key:
            return self._template_explanation(transaction_data, recommended_action, recovery_prob, policy_notes)
            
        system_prompt = '''You are a payment recovery AI assistant. Provide a structured explanation in strict JSON format:
{
    "merchant_explanation": "str",
    "customer_message": "str",
    "risk_note": "str",
    "needs_human_review": bool
}'''
        user_prompt = f"Action: {recommended_action}\nProb: {recovery_prob}\nNotes: {policy_notes}\nData: {json.dumps(transaction_data)}"

        headers = {
            'Authorization': f"Bearer {self.api_key}",
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': self.model,
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ],
            'response_format': {'type': 'json_object'},
            'temperature': 0.1
        }
        
        try:
            response = requests.post(self.base_url, headers=headers, json=payload, timeout=10)
            response.raise_for_status()
            content = response.json()['choices'][0]['message']['content']
            return json.loads(content)
        except Exception as e:
            logger.error(f"LLM API call failed: {e}")
            return self._template_explanation(transaction_data, recommended_action, recovery_prob, policy_notes)

    def _template_explanation(self, transaction_data: dict, recommended_action: str, 
                            recovery_prob: float, policy_notes: str) -> dict:
        return {
            'merchant_explanation': f"Recommended {recommended_action} based on a {recovery_prob*100:.1f}% recovery probability. {policy_notes}",
            'customer_message': "We noticed your recent payment attempt failed. Please update your payment method to avoid service interruption.",
            'risk_note': f"Risk score is {transaction_data.get('risk_score', 'unknown')}.",
            'needs_human_review': transaction_data.get('risk_score', 0) >= 8.0
        }
