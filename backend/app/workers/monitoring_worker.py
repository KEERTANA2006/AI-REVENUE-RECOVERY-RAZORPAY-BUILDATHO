import subprocess
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def run_drift_report():
    """Run the drift report generation script."""
    try:
        result = subprocess.run(
            ['python', 'scripts/generate_drift_report.py'],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            logging.info('Drift report generated successfully')
        else:
            logging.error(f'Drift report failed: {result.stderr}')
        return result.returncode == 0
    except Exception as e:
        logging.error(f'Drift report error: {e}')
        return False
