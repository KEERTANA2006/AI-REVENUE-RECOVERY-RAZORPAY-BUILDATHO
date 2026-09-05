import logging
from .scorer_agent import ScorerAgent
from .policy_agent import PolicyAgent
from .executor_agent import ExecutorAgent
from ..services.llm_service import LLMService

logger = logging.getLogger(__name__)

class Orchestrator:
    def __init__(self, scorer: ScorerAgent, policy: PolicyAgent, executor: ExecutorAgent, llm_service: LLMService = None):
        self.scorer = scorer
        self.policy = policy
        self.executor = executor
        self.llm_service = llm_service
    
    def run_decision(self, transaction_data: dict) -> dict:
        """
        Full decision pipeline.
        """
        try:
            scores = self.scorer.score_actions(transaction_data)
        except Exception as e:
            logger.error(f"Scoring failed: {e}")
            scores = []
            
        try:
            policy_result = self.policy.evaluate(scores, transaction_data)
        except Exception as e:
            logger.error(f"Policy evaluation failed: {e}")
            policy_result = {
                'allowed_actions': [],
                'blocked_actions': [],
                'recommended_action': {'action': 'NONE', 'recovery_prob': 0.0, 'reason': 'Error in policy'},
                'needs_human_review': True,
                'policy_notes': 'Error during policy evaluation'
            }

        rec_action = policy_result.get('recommended_action')
        
        try:
            execution_result = self.executor.execute(rec_action, transaction_data)
        except Exception as e:
            logger.error(f"Execution failed: {e}")
            execution_result = {
                'executed': False,
                'outcome': 'error',
                'details': str(e),
                'payment_link_url': None,
                'audit_entries': []
            }
            
        action_name = rec_action['action'] if rec_action else 'NONE'
        prob = rec_action['recovery_prob'] if rec_action else 0.0
        
        if self.llm_service:
            try:
                explanation = self.llm_service.generate_explanation(
                    transaction_data, action_name, prob, policy_result.get('policy_notes', '')
                )
            except Exception as e:
                logger.error(f"LLM explanation failed: {e}")
                explanation = self.llm_service._template_explanation(transaction_data, action_name, prob, policy_result.get('policy_notes', ''))
        else:
            explanation = {
                'merchant_explanation': f"Action {action_name} selected with probability {prob}.",
                'customer_message': "Please complete your payment.",
                'risk_note': "Standard risk assessment.",
                'needs_human_review': policy_result.get('needs_human_review', False)
            }
            
        return {
            'scores': scores,
            'policy_result': policy_result,
            'execution_result': execution_result,
            'explanation': explanation,
            'recommended_action': action_name,
            'recovery_probability': prob,
            'payment_link_url': execution_result.get('payment_link_url'),
            'needs_human_review': policy_result.get('needs_human_review', False),
            'audit_entries': execution_result.get('audit_entries', [])
        }
