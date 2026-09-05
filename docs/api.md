# RecoverFlow AI – API Documentation

## Base URL

```
http://localhost:8000
```

## Authentication

No authentication required for hackathon demo. In production, use API keys or OAuth2.

---

## Transactions

### List Transactions

```
GET /api/transactions?skip=0&limit=50&status=pending
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `skip` | int | 0 | Pagination offset |
| `limit` | int | 50 | Max results |
| `status` | string | null | Filter by status: pending, decided, recovered, failed |

**Response:** `200 OK`
```json
{
  "transactions": [...],
  "total": 25000,
  "skip": 0,
  "limit": 50
}
```

### Get Transaction

```
GET /api/transactions/{transaction_id}
```

**Response:** `200 OK` – Full transaction object.

### Upload Transactions (CSV)

```
POST /api/transactions/upload
Content-Type: multipart/form-data
```

**Body:** CSV file with columns matching the dataset schema.

**Response:** `200 OK`
```json
{
  "imported": 25000,
  "message": "Successfully imported 25000 transactions"
}
```

### Trigger Decision

```
POST /api/transactions/{transaction_id}/decide
```

Runs the full multi-agent decision pipeline (Scorer → Policy → Executor).

**Response:** `200 OK`
```json
{
  "transaction_id": 1,
  "recommended_action": "RETRY",
  "recovery_probability": 0.73,
  "scores": [
    {"action": "RETRY", "recovery_prob": 0.73, "reason": "..."},
    {"action": "PAYMENT_LINK", "recovery_prob": 0.61, "reason": "..."},
    ...
  ],
  "policy_result": {
    "allowed_actions": [...],
    "blocked_actions": [
      {"action": "EMAIL_OFFER", "block_reason": "NO_CONSENT", "block_code": "NO_CONSENT"}
    ],
    "needs_human_review": false,
    "policy_notes": "..."
  },
  "execution_result": {
    "executed": true,
    "action": "RETRY",
    "outcome": "retry_initiated",
    "payment_link_url": null,
    "details": "..."
  },
  "explanation": {
    "merchant_explanation": "...",
    "customer_message": "...",
    "risk_note": "..."
  },
  "payment_link_url": null,
  "needs_human_review": false,
  "audit_ids": [1, 2, 3]
}
```

### Batch Decision

```
POST /api/transactions/decide-batch
Content-Type: application/json
```

**Body:**
```json
{
  "transaction_ids": [1, 2, 3, 4, 5]
}
```

**Response:** `200 OK`
```json
{
  "results": [...],
  "total": 5,
  "succeeded": 4,
  "failed": 1
}
```

### Get Decision History

```
GET /api/transactions/{transaction_id}/decisions
```

### Get Audit Log

```
GET /api/transactions/{transaction_id}/audit
```

---

## Monitoring

### System Stats

```
GET /api/monitoring/stats
```

**Response:** `200 OK`
```json
{
  "total_transactions": 25000,
  "total_decisions": 150,
  "total_recovered": 45,
  "recovery_rate": 0.30,
  "total_blocked_actions": 23,
  "total_human_reviews": 8,
  "actions_breakdown": {
    "RETRY": 50,
    "PAYMENT_LINK": 35,
    "EMAIL_OFFER": 20,
    "SMS_REMINDER": 15,
    "HUMAN_REVIEW": 8,
    "NONE": 22
  }
}
```

### Generate Drift Report

```
POST /api/monitoring/drift-report
```

Triggers Evidently AI drift report generation.

**Response:** `200 OK`
```json
{
  "report_url": "/reports/drift_report.html",
  "generated_at": "2026-08-28T12:00:00Z"
}
```

### Get Drift Report

```
GET /api/monitoring/drift-report
```

Returns the path to the latest drift report HTML.

---

## Health Check

```
GET /health
```

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "model_loaded": true,
  "database": "connected"
}
```
