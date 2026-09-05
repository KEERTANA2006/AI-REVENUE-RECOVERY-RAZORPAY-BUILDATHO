# RecoverFlow AI – Dataset Documentation

## Overview

The synthetic dataset contains ~25,000 rows of revenue-at-risk events, designed to train and evaluate an ML model that predicts recovery probability for different actions.

## Event Types

| Event Type | % of Data | Description |
|------------|-----------|-------------|
| `subscription_invoice_failed` | ~35% | Recurring subscription payment was declined by the bank |
| `subscription_invoice_overdue` | ~20% | Invoice exists but payment hasn't been attempted or is past due |
| `checkout_abandoned` | ~30% | Customer added items to cart, started payment, but didn't complete |
| `payment_session_dropped` | ~15% | Payment session started but connection lost or timed out |

## Column Reference

### Identity & Context
| Column | Type | Description |
|--------|------|-------------|
| `event_id` | string | Unique event ID (RR-000001 format) |
| `customer_id` | string | Customer ID (CUST-000001 format) |
| `merchant_id` | string | Merchant ID (MER-00001 format) |
| `event_type` | string | One of the 4 event types above |
| `event_timestamp` | datetime | ISO 8601 timestamp within last 90 days |

### Payment Details
| Column | Type | Description |
|--------|------|-------------|
| `currency` | string | INR (80%) or USD (20%) |
| `amount` | float | Payment amount (50–50,000 range, right-skewed) |
| `attempt_number` | int | Which retry attempt this is (1–5) |
| `payment_method` | string | Card, UPI, NetBanking, Wallet, Unknown |
| `failure_reason` | string | See table below |

### Failure Reasons
| Reason | Applicable Events | Recovery Potential |
|--------|-------------------|-------------------|
| `insufficient_funds` | invoice_failed | Medium (retry later) |
| `card_declined` | invoice_failed | Low (needs alternate method) |
| `timeout` | invoice_failed, session_dropped | High (retry likely works) |
| `authentication_failed` | invoice_failed | Medium (needs user action) |
| `bank_declined` | invoice_failed | Low |
| `network_error` | session_dropped | High (retry likely works) |
| `none` | checkout_abandoned, invoice_overdue | Varies |

### Risk & Behavior Features
| Column | Type | Description |
|--------|------|-------------|
| `risk_score` | float | 0.0–10.0, composite risk assessment |
| `days_since_first_attempt` | int | Days since first failed attempt |
| `total_failed_attempts` | int | Lifetime failed attempts for this customer |
| `last_successful_payment_days_ago` | int | Days since last successful payment |
| `session_duration_seconds` | int | For checkout/session events |
| `cart_value` | float | Cart value (for checkout events) |
| `pages_viewed` | int | Pages viewed before drop-off |
| `device_type` | string | mobile, desktop, tablet |
| `is_international` | int | 0 or 1 |
| `merchant_category` | string | SaaS, E-commerce, Digital Goods, Services |

### Consent & Communication Limits
| Column | Type | Description |
|--------|------|-------------|
| `customer_consent` | int | 0/1 – can we contact this customer? |
| `emails_sent_today` | int | Emails already sent today (0–5) |
| `sms_sent_today` | int | SMS already sent today (0–3) |
| `total_recovery_messages_sent` | int | Lifetime recovery messages (0–20) |

### Candidate Action Flags
| Column | Type | Description |
|--------|------|-------------|
| `action_RETRY` | int | 0/1 – attempt payment retry |
| `action_PAYMENT_LINK` | int | 0/1 – send payment link |
| `action_EMAIL_OFFER` | int | 0/1 – send email with recovery offer |
| `action_SMS_REMINDER` | int | 0/1 – send SMS reminder |
| `action_HUMAN_REVIEW` | int | 0/1 – flag for manual review |
| `action_NONE` | int | 0/1 – take no action |

### Target
| Column | Type | Description |
|--------|------|-------------|
| `recovered` | int | 0/1 – was the payment recovered? |

## Recovery Simulation Logic

The `recovered` target is simulated using rule-based probabilities:

- **Base rate**: ~30% overall recovery
- **Higher** for: low risk_score, consent=1, fewer prior attempts, recent successful payment
- **RETRY** works best for: timeout, network_error (50–60% recovery)
- **PAYMENT_LINK** works best for: checkout_abandoned (40–50%)
- **EMAIL_OFFER / SMS_REMINDER** work when: consent=1 and risk_score < 5 (35–45%)
- **HUMAN_REVIEW**: moderate recovery for high-risk cases (25–35%)
- **NONE**: lowest recovery rate (5–15%)
- **Noise**: ±10% random variation for realism

## Important Note

This dataset is **entirely synthetic** and generated for demonstration purposes only. It does not contain any real customer data, payment data, or personally identifiable information.
