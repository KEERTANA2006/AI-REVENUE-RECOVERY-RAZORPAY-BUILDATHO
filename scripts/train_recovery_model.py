import pandas as pd
import numpy as np
import os
import joblib
import logging
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def train_model():
    data_path = 'backend/data/synthetic_failed_payments.csv'
    logging.info(f"Loading data from {data_path}...")
    
    if not os.path.exists(data_path):
        logging.error(f"File not found: {data_path}")
        return
        
    df = pd.read_csv(data_path)
    
    features = [
        'payment_method', 'amount', 'failure_reason', 'risk_score', 'customer_consent', 
        'emails_sent_today', 'sms_sent_today', 'total_recovery_messages_sent', 'attempt_number', 
        'days_since_first_attempt', 'total_failed_attempts', 'last_successful_payment_days_ago', 
        'is_international', 'device_type', 'merchant_category', 'event_type',
        'action_RETRY', 'action_PAYMENT_LINK', 'action_EMAIL_OFFER', 'action_SMS_REMINDER', 
        'action_HUMAN_REVIEW', 'action_NONE'
    ]
    
    X = df[features]
    y = df['recovered']
    
    logging.info("Splitting data...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, stratify=y, random_state=42)
    
    categorical_features = ['payment_method', 'failure_reason', 'device_type', 'merchant_category', 'event_type']
    numeric_features = ['amount', 'risk_score', 'attempt_number', 'days_since_first_attempt', 'total_failed_attempts', 'last_successful_payment_days_ago', 'emails_sent_today', 'sms_sent_today', 'total_recovery_messages_sent']
    passthrough_features = ['customer_consent', 'is_international', 'action_RETRY', 'action_PAYMENT_LINK', 'action_EMAIL_OFFER', 'action_SMS_REMINDER', 'action_HUMAN_REVIEW', 'action_NONE']

    logging.info("Building preprocessor...")
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features),
            ('num', StandardScaler(), numeric_features),
            ('pass', 'passthrough', passthrough_features)
        ]
    )

    logging.info("Training Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=200, class_weight='balanced', random_state=42, n_jobs=-1)
    
    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)
    
    model.fit(X_train_processed, y_train)
    
    logging.info("Evaluating model...")
    y_pred = model.predict(X_test_processed)
    y_prob = model.predict_proba(X_test_processed)[:, 1]
    
    logging.info("\n" + classification_report(y_test, y_pred))
    logging.info(f"ROC-AUC Score: {roc_auc_score(y_test, y_prob):.4f}")
    
    os.makedirs('backend/models', exist_ok=True)
    os.makedirs('backend/reports', exist_ok=True)
    
    model_path = 'backend/models/model_recovery.pkl'
    preprocessor_path = 'backend/models/preprocessor.pkl'
    
    joblib.dump(model, model_path)
    joblib.dump(preprocessor, preprocessor_path)
    logging.info(f"Model saved to {model_path} and preprocessor to {preprocessor_path}")
    
    logging.info("Saving reference features for Evidently...")
    X_ref = X_test.copy()
    X_ref['recovered'] = y_test
    X_ref['prediction'] = y_pred
    
    reference_path = 'backend/data/reference_features.csv'
    X_ref.to_csv(reference_path, index=False)
    logging.info(f"Reference features saved to {reference_path}")

if __name__ == '__main__':
    train_model()
