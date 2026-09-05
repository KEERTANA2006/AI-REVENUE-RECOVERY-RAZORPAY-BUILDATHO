import pandas as pd
import numpy as np
import os
import logging
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset, TargetDriftPreset

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def generate_drift_report():
    reference_path = 'backend/data/reference_features.csv'
    production_path = 'backend/data/production_log.csv'
    report_dir = 'backend/reports'
    
    logging.info(f"Loading reference data from {reference_path}...")
    if not os.path.exists(reference_path):
        logging.error(f"Reference data not found at {reference_path}")
        return
        
    reference_data = pd.read_csv(reference_path)
    
    if os.path.exists(production_path):
        logging.info(f"Loading production log from {production_path}...")
        current_data = pd.read_csv(production_path)
    else:
        logging.info(f"Production log not found. Generating simulated current data...")
        current_data = reference_data.sample(frac=0.5, random_state=42).copy()
        
        # Add some drift to amount and risk_score
        if 'amount' in current_data.columns:
            current_data['amount'] = current_data['amount'] * np.random.uniform(1.0, 1.5, len(current_data))
        if 'risk_score' in current_data.columns:
            current_data['risk_score'] = np.clip(current_data['risk_score'] + np.random.normal(1.0, 0.5, len(current_data)), 0.0, 10.0)
            
        current_data['prediction'] = np.random.choice([0, 1], len(current_data), p=[0.7, 0.3])

    logging.info("Generating Evidently Drift Report...")
    drift_report = Report(metrics=[
        DataDriftPreset(),
        TargetDriftPreset()
    ])
    
    drift_report.run(reference_data=reference_data, current_data=current_data, column_mapping=None)
    
    os.makedirs(report_dir, exist_ok=True)
    report_path = os.path.join(report_dir, 'drift_report.html')
    drift_report.save_html(report_path)
    
    logging.info(f"Drift report generated and saved to {report_path}")

if __name__ == '__main__':
    generate_drift_report()
