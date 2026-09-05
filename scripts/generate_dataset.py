import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
import os
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def generate_dataset(num_rows=25000):
    logging.info(f"Generating dataset with {num_rows} rows...")
    np.random.seed(42)
    random.seed(42)

    event_types = ['subscription_invoice_failed', 'subscription_invoice_overdue', 'checkout_abandoned', 'payment_session_dropped']
    currencies = ['INR', 'USD']
    payment_methods = ['Card', 'UPI', 'NetBanking', 'Wallet', 'Unknown']
    failure_reasons = ['insufficient_funds', 'card_declined', 'timeout', 'authentication_failed', 'bank_declined', 'network_error', 'none']
    device_types = ['mobile', 'desktop', 'tablet']
    merchant_categories = ['SaaS', 'E-commerce', 'Digital Goods', 'Services']

    data = {
        'event_id': [f'RR-{str(i).zfill(6)}' for i in range(1, num_rows + 1)],
        'customer_id': [f'CUST-{str(random.randint(1, 10000)).zfill(6)}' for _ in range(num_rows)],
        'merchant_id': [f'MER-{str(random.randint(1, 500)).zfill(5)}' for _ in range(num_rows)],
        'event_type': np.random.choice(event_types, num_rows),
        'currency': np.random.choice(currencies, num_rows, p=[0.8, 0.2]),
        'amount': np.random.lognormal(mean=7, sigma=1.5, size=num_rows).clip(50, 50000).round(2),
        'attempt_number': np.random.randint(1, 6, num_rows),
        'payment_method': np.random.choice(payment_methods, num_rows),
        'failure_reason': np.random.choice(failure_reasons, num_rows),
        'risk_score': np.random.uniform(0.0, 10.0, num_rows).round(2),
        'days_since_first_attempt': np.random.randint(0, 30, num_rows),
        'total_failed_attempts': np.random.randint(1, 10, num_rows),
        'last_successful_payment_days_ago': np.random.randint(1, 365, num_rows),
        'session_duration_seconds': np.random.randint(10, 600, num_rows),
        'cart_value': np.random.lognormal(mean=7, sigma=1.5, size=num_rows).clip(50, 50000).round(2),
        'pages_viewed': np.random.randint(1, 20, num_rows),
        'device_type': np.random.choice(device_types, num_rows),
        'is_international': np.random.choice([0, 1], num_rows, p=[0.9, 0.1]),
        'merchant_category': np.random.choice(merchant_categories, num_rows),
        'customer_consent': np.random.choice([0, 1], num_rows, p=[0.15, 0.85]),
        'emails_sent_today': np.random.randint(0, 6, num_rows),
        'sms_sent_today': np.random.randint(0, 4, num_rows),
        'total_recovery_messages_sent': np.random.randint(0, 21, num_rows),
    }

    # Generate timestamp
    now = datetime.now()
    data['event_timestamp'] = [(now - timedelta(days=random.randint(0, 90), hours=random.randint(0, 23))).isoformat() for _ in range(num_rows)]

    df = pd.DataFrame(data)
    
    # Action flags (one-hot)
    actions = ['action_RETRY', 'action_PAYMENT_LINK', 'action_EMAIL_OFFER', 'action_SMS_REMINDER', 'action_HUMAN_REVIEW', 'action_NONE']
    for action in actions:
        df[action] = 0
        
    action_idx = np.random.randint(0, len(actions), num_rows)
    for i, row_action_idx in enumerate(action_idx):
        df.loc[i, actions[row_action_idx]] = 1

    # Simulate recovery
    logging.info("Simulating recovery target...")
    def simulate_recovery(row):
        base_prob = 0.3
        
        # Adjust based on risk score
        if row['risk_score'] < 3: base_prob += 0.2
        elif row['risk_score'] > 7: base_prob -= 0.15
            
        if row['customer_consent'] == 1: base_prob += 0.1
        if row['attempt_number'] > 2: base_prob -= 0.1
            
        # Action effectiveness
        if row['action_RETRY'] == 1 and row['failure_reason'] in ['timeout', 'network_error']: base_prob += 0.3
        if row['action_PAYMENT_LINK'] == 1 and row['event_type'] == 'checkout_abandoned': base_prob += 0.25
        if (row['action_EMAIL_OFFER'] == 1 or row['action_SMS_REMINDER'] == 1) and row['customer_consent'] == 1 and row['risk_score'] < 5: base_prob += 0.2
        if row['action_HUMAN_REVIEW'] == 1 and row['risk_score'] > 7: base_prob += 0.15
        if row['action_NONE'] == 1: base_prob -= 0.2
            
        # Add noise
        noise = random.uniform(-0.1, 0.1)
        prob = max(0, min(1, base_prob + noise))
        
        return 1 if random.random() < prob else 0

    df['recovered'] = df.apply(simulate_recovery, axis=1)

    os.makedirs('backend/data', exist_ok=True)
    out_path = 'backend/data/synthetic_failed_payments.csv'
    df.to_csv(out_path, index=False)
    logging.info(f"Dataset generated and saved to {out_path}. Recovery rate: {df['recovered'].mean():.2%}")

if __name__ == '__main__':
    generate_dataset()
