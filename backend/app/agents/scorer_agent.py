import logging
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

class ScorerAgent:
    def __init__(self, model, preprocessor):
        # model = joblib-loaded RandomForestClassifier
        # preprocessor = joblib-loaded ColumnTransformer
        self.model = model
        self.preprocessor = preprocessor
    
    def score_actions(self, transaction_data: dict) -> list[dict]:
        """
        For each candidate action, construct feature vector and predict recovery_prob.
        
        transaction_data contains all feature columns from the transaction.
        
        Candidate actions: RETRY, PAYMENT_LINK, EMAIL_OFFER, SMS_REMINDER, HUMAN_REVIEW, NONE
        """
        actions = ['RETRY', 'PAYMENT_LINK', 'EMAIL_OFFER', 'SMS_REMINDER', 'HUMAN_REVIEW', 'NONE']
        results = []
        
        feature_columns = [
            'payment_method', 'failure_reason', 'device_type', 'merchant_category', 'event_type',
            'amount', 'risk_score', 'attempt_number', 'days_since_first_attempt', 'total_failed_attempts', 
            'last_successful_payment_days_ago', 'emails_sent_today', 'sms_sent_today', 'total_recovery_messages_sent',
            'customer_consent', 'is_international', 'action_RETRY', 'action_PAYMENT_LINK', 
            'action_EMAIL_OFFER', 'action_SMS_REMINDER', 'action_HUMAN_REVIEW', 'action_NONE'
        ]
        
        for action in actions:
            # 1. Create a copy of transaction features
            features = transaction_data.copy()
            
            # 2. Set all action_* flags to 0, then set the current action flag to 1
            for act in actions:
                features[f'action_{act}'] = 0
            features[f'action_{action}'] = 1
            
            # 3. Build a DataFrame with the correct column order matching the preprocessor
            df_dict = {}
            for col in feature_columns:
                df_dict[col] = [features.get(col, 0 if col.startswith('action_') else np.nan)]
            
            df = pd.DataFrame(df_dict)
            
            try:
                # 4. Transform with preprocessor
                transformed = self.preprocessor.transform(df)
                
                # 5. Predict probability with model.predict_proba()
                proba = self.model.predict_proba(transformed)[0][1]
                
                # 6. Generate reason
                reason = self._generate_reason(action, proba, features)
                
                results.append({
                    'action': action,
                    'recovery_prob': float(proba),
                    'reason': reason
                })
            except Exception as e:
                logger.error(f"Error scoring action {action}: {e}")
                results.append({
                    'action': action,
                    'recovery_prob': 0.0,
                    'reason': f"Error computing probability: {e}"
                })
        
        # Sort results by recovery_prob descending
        results.sort(key=lambda x: x['recovery_prob'], reverse=True)
        return results

    def _generate_reason(self, action: str, proba: float, features: dict) -> str:
        if proba > 0.7:
            chance = "High"
        elif proba > 0.4:
            chance = "Moderate"
        else:
            chance = "Low"
            
        reason = f"{chance} recovery chance for {action}."
        if features.get('risk_score', 0) > 8.0:
            reason += " High risk score detected."
        if action in ['EMAIL_OFFER', 'SMS_REMINDER'] and features.get('customer_consent', 0) == 1:
            reason += " Customer has consented to outreach."
            
        return reason
