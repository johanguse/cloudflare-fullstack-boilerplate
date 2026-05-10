# NFSe setup — Fiscal Nacional External API

This document is the **Fiscal Nacional External API** reference: REST under `/api/v1/external/...` and `/api/v1/invoices/...`, `X-API-Key` auth, and customer-centric JSON (`customer_name`, `amount` in BRL, etc.).

## Relationship to this boilerplate

The Cloudflare SaaS boilerplate **does not** call this External API surface today. It uses [`src/server/services/nfse.ts`](../src/server/services/nfse.ts) (`FiscalNacionalService`), which targets the **app API** documented in that file (`Bearer` token, Portuguese payload shape, different paths).

| Topic | This repo (`FiscalNacionalService`) | This guide (External API) |
|--------|--------------------------------------|----------------------------|
| Auth header | `Authorization: Bearer <key>` | `X-API-Key: <key>` |
| Production host | `https://app.fiscalnacional.com.br/api/v1` | `https://api.fiscalnacional.com.br` |
| Staging host | `https://sandbox.fiscalnacional.com.br/api/v1` | `https://api-staging.fiscalnacional.com.br` |
| Create NFSe | `POST /notas` (`prestador`, `tomador`, `servico`, amounts in centavos in TS → reais in JSON) | `POST /api/v1/external/nfse` (flat customer fields, `amount` in BRL) |
| Get status | `GET /notas/{id}` (UUID from create response) | `GET /api/v1/external/nfse/{reference}` (e.g. `EXT-…`) |
| Cancel | `POST /notas/{id}/cancelar` | `POST /api/v1/external/nfse/{reference}/cancel` with `{ reason }` |
| Status values (examples) | Mapped from Portuguese: `emitida` → `issued`, `pendente` → `pending`, … | English: `authorized`, `processing`, `invoice_only`, … |

Use **this guide** when building or calling the External API directly (e.g. another service, or a future refactor). Use **`nfse.ts`** as the source of truth for what the boilerplate sends **today**.

---

## Overview

The External API allows your application to generate Brazilian electronic service invoices (NFS-e) programmatically using a simple REST API with API Key authentication. No user session or OAuth flow required.

**Base URL:**
- Production: `https://api.fiscalnacional.com.br`
- Staging: `https://api-staging.fiscalnacional.com.br`
- Local Development: `http://localhost:8000`

## When NOT to Generate NFS-e

> ⚠️ **Important:** Do NOT call this API in these cases:

| Scenario | Reason |
|----------|--------|
| **Trial period** | No payment received - no taxable event |
| **Failed/pending payments** | Transaction not completed |

> **Amount = R$ 0,00 (free plans / 100% coupon):** You **can** call this API with `amount: 0`. The system will skip NFS-e generation (fiscal system limitation) and return a standalone commercial Invoice instead (`status: "INVOICE_ONLY"`). No NFS-e is submitted to the municipality.

---

## Authentication

All requests must include an API Key in the `X-API-Key` header:

```
X-API-Key: your_project_api_key_here
```

You can obtain your API Key from the dashboard by:
1. Go to **Projects**
2. Select your project
3. Copy the **API Key** from project settings

### Project Configuration

Each project can be configured with specific service codes for NFS-e generation:

| Setting | Description | Default |
|---------|-------------|---------|
| **Service Code** | Item Lista Serviço (e.g., 1.03, 1.04, 1.05) | 1.03 (SaaS) |
| **NBS Code** | Código NBS for exports (e.g., 115062100) | 115062100 |
| **ISS Rate** | Tax rate for domestic transactions | 2% |

**Service Code Options:**

| Code | Description | NBS Code | Use Case |
|------|-------------|----------|----------|
| **1.03** | SaaS/Hospedagem | 115062100 | Subscription SaaS products |
| **1.04** | Desenvolvimento | 115022000 | Custom software development |
| **1.05** | Licenciamento | 111032200 | Software licensing |

Configure these in the dashboard under **Projects > Edit > Service Code**.

> **Important:** The project's configured `service_code` and `nbs_code` are automatically used when generating NFS-e via the API. No need to pass these values in the request.

⚠️ **Keep your API Key secret!** Do not expose it in client-side code.

---

## Endpoints

### 1. Create NFS-e

Generate a new NFS-e for a customer.

**Endpoint:** `POST /api/v1/external/nfse`

**Headers:**
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `X-API-Key` | string | Yes | Your project API key |
| `Content-Type` | string | Yes | Must be `application/json` |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customer_name` | string | **Yes** | Customer's full name or company name (max 255 chars) |
| `customer_email` | string | No | Customer's email (stored in Fiscal Nacional, see note below) |
| `customer_country` | string | No | Country code: `BR` for Brazil, or ISO 2-letter code for other countries. Default: `EXTERIOR` |
| `customer_country_iso2` | string | Conditional | **REQUIRED for international customers**. ISO 3166-1 alpha-2 country code (e.g., `US`, `DE`, `GB`). Used to get BACEN country code for NFS-e Nacional standard. |
| `customer_document` | string | Conditional | CPF (11 digits) or CNPJ (14 digits) **for Brazilian customers only** |
| `customer_nif` | string | No | Foreign Tax ID (NIF) **for international customers** (max 50 chars) |
| `nif_exemption_code` | integer | No | NIF exemption code: `0`=NIF provided, `1`=not required, `2`=not provided |
| `currency_code` | string | No | BACEN currency code for foreign currency (e.g., `220`=USD, `978`=EUR). Default: `220` for exports |
| `foreign_currency_amount` | number | No | Invoice value in foreign currency (for exports) |
| `customer_address` | string | No* | Street address |
| `customer_number` | string | No* | Address number |
| `customer_complement` | string | No | Address complement (apt, suite, etc.) |
| `customer_neighborhood` | string | No* | Neighborhood/District |
| `customer_postal_code` | string | No* | Postal/ZIP code (up to 20 chars for international) |
| `customer_state` | string | No* | State code (e.g., `SC`, `SP`, `RJ`) or international region |
| `customer_city_name` | string | No* | City name |
| `customer_city_code` | integer | Conditional | IBGE city code (required for Brazilian customers) |
| `customer_inscricao_municipal` | string | No | Customer's municipal registration (if applicable) |
| `service_description` | string | **Yes** | Detailed description of services provided (used in NFS-e, should be in Portuguese for tax compliance) |
| `product_name` | string | No | Clean product name for commercial invoice (e.g., "100 Credits", "Pro Plan"). Used on English invoice PDF for international customers. If not provided, `service_description` is used. |
| `amount` | number | **Yes** | Invoice amount in BRL (≥ 0). Use `0` for free/fully-discounted transactions — returns a commercial Invoice only, no NFS-e |
| `external_reference` | string | No | Your system's reference ID (invoice ID, subscription ID, etc.) |

> *These address fields are required for Brazilian customers to ensure proper NFS-e generation.
> 
> **International Customers:** For export/international NFS-e, provide `customer_nif` (foreign tax ID) and optionally `currency_code` + `foreign_currency_amount` for proper foreign trade information.
>
> **📧 Email Handling:**
> - **Brazilian customers**: Email is sent to the prefecture, and the customer receives the NFS-e PDF directly from the city government.
> - **International customers**: Email is **stored in Fiscal Nacional** but **NOT sent to the prefecture**. This prevents international customers from receiving the official NFS-e PDF in Portuguese. Instead, they receive a commercial Invoice (in their currency) generated by our system.

**Response (201 Created):**

```json
{
  "id": "uuid-of-nfse-record",
  "reference": "EXT-20260103120000-A1B2C3D4",
  "status": "processing",
  "nfse_number": null,
  "value_brl": 1500.00,
  "iss_rate": 0.02,
  "iss_value": 30.00,
  "customer_name": "Cliente Exemplo",
  "created_at": "2026-01-03T12:00:00Z",
  "pdf_url": null,
  "invoice_url": null,
  "error_message": null
}
```

**Response when `amount = 0` (Invoice only, no NFS-e):**

```json
{
  "id": "uuid-of-nfse-record",
  "reference": "EXT-20260103120000-A1B2C3D4",
  "status": "invoice_only",
  "nfse_number": null,
  "value_brl": 0.00,
  "iss_rate": 0.0,
  "iss_value": 0.0,
  "customer_name": "Cliente Exemplo",
  "created_at": "2026-01-03T12:00:00Z",
  "pdf_url": null,
  "invoice_url": "https://storage.r2.cloudflarestorage.com/bucket/path/to/invoice.pdf",
  "error_message": null
}
```

> `invoice_url` is populated synchronously — the commercial Invoice PDF is generated and stored in R2 before the response is returned. `pdf_url` remains `null` as no NFS-e document exists.

---

### 2. Check NFS-e Status

Check the processing status of a previously created NFS-e.

**Endpoint:** `GET /api/v1/external/nfse/{reference}`

**Headers:**
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `X-API-Key` | string | Yes | Your project API key |

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `reference` | string | The NFS-e reference returned when creating |

**Response (200 OK):**

```json
{
  "id": "uuid-of-nfse-record",
  "reference": "EXT-20260103120000-A1B2C3D4",
  "status": "authorized",
  "nfse_number": "202600001",
  "pdf_url": "https://storage.example.com/nfse/xxx.pdf",
  "xml_url": "https://storage.example.com/nfse/xxx.xml",
  "invoice_url": "https://storage.example.com/invoice/xxx.pdf",
  "error_message": null,
  "issued_at": "2026-01-03T12:05:00Z",
  "cancelled_at": null
}
```

---

### 3. Cancel NFS-e

Cancel an authorized NFS-e.

**Endpoint:** `POST /api/v1/external/nfse/{reference}/cancel`

**Headers:**
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `X-API-Key` | string | Yes | Your project API key |
| `Content-Type` | string | Yes | Must be `application/json` |

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `reference` | string | The NFS-e reference returned when creating |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | **Yes** | Cancellation reason (10-500 characters) |

**Response (200 OK):**

```json
{
  "id": "uuid-of-nfse-record",
  "reference": "EXT-20260103120000-A1B2C3D4",
  "status": "cancelled",
  "cancelled_at": "2026-01-03T14:30:00Z",
  "message": "NFS-e cancelled successfully"
}
```

**Error Responses:**

| Status | Reason |
|--------|--------|
| 400 | NFS-e is not in `authorized` status |
| 400 | NFS-e has no number assigned yet |
| 400 | Cancellation reason too short (min 10 chars) |
| 404 | NFS-e not found |

> **Note:** Only NFS-e with status `authorized` can be cancelled. The cancellation is processed with the municipality and cannot be undone.

---

### 4. List NFS-e Records

List all NFS-e records for your project.

**Endpoint:** `GET /api/v1/external/nfse`

**Headers:**
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `X-API-Key` | string | Yes | Your project API key |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Maximum number of records to return (max 100) |
| `status_filter` | string | - | Filter by status: `pending`, `processing`, `authorized`, `cancelled`, `error` |

**Response (200 OK):**

```json
[
  {
    "id": "uuid-1",
    "reference": "EXT-20260103120000-A1B2C3D4",
    "status": "authorized",
    "nfse_number": "202600001",
    "pdf_url": "https://...",
    "xml_url": "https://...",
    "invoice_url": "https://...",
    "error_message": null,
    "issued_at": "2026-01-03T12:05:00Z"
  },
  {
    "id": "uuid-2",
    "reference": "EXT-20260103130000-E5F6G7H8",
    "status": "processing",
    "nfse_number": null,
    "pdf_url": null,
    "xml_url": null,
    "invoice_url": null,
    "error_message": null,
    "issued_at": null
  }
]
```

---

### 5. Get Download URLs

Generate presigned download URLs for NFS-e documents (PDF and XML).

**Endpoint:** `GET /api/v1/external/nfse/{reference}/download`

**Headers:**
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `X-API-Key` | string | Yes | Your project API key |

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `reference` | string | The NFS-e reference returned when creating |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `expires_in` | integer | 3600 | URL expiration time in seconds (min 60, max 86400 = 24h) |

**Response (200 OK):**

```json
{
  "reference": "EXT-20260103120000-A1B2C3D4",
  "pdf_url": "https://storage.r2.cloudflarestorage.com/bucket/...",
  "xml_url": "https://storage.r2.cloudflarestorage.com/bucket/...",
  "invoice_url": null,
  "expires_in": 3600
}
```

**Error Responses:**

| Status | Reason |
|--------|--------|
| 400 | NFS-e is not yet authorized |
| 404 | NFS-e not found |
| 503 | Storage service unavailable |

> **Use Cases:**
> - Embedding download links in your application
> - Email notifications with download links  
> - Webhook integrations where you need to pass the PDF/XML URL

---

### 6. Get Invoice (Legacy — NFSe-linked)

Get or generate a commercial invoice for an NFS-e. Works regardless of NFS-e status — invoice is generated from the transaction data whether or not the NFS-e was authorized.

**Important:** The Invoice is a **commercial invoice** document, separate from the NFS-e PDF. It's useful for:
- International customers who need an English invoice
- Internal record-keeping
- Integration with accounting systems

**Endpoint:** `GET /api/v1/external/nfse/{reference}/invoice`

**Headers:**
| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `X-API-Key` | string | Yes | Your project API key |

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `reference` | string | The NFS-e reference returned when creating |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `generate_if_missing` | boolean | true | Generate invoice if not already stored |
| `expires_in` | integer | 3600 | URL expiration time in seconds (min 60, max 86400 = 24h) |

**Response (200 OK):**

```json
{
  "reference": "EXT-20260103120000-A1B2C3D4",
  "pdf_url": null,
  "xml_url": null,
  "invoice_url": "https://storage.r2.cloudflarestorage.com/bucket/...",
  "expires_in": 3600
}
```

**Error Responses:**

| Status | Reason |
|--------|--------|
| 404 | NFS-e not found or invoice not found and generation not requested |
| 500 | Failed to generate invoice |
| 503 | Storage service unavailable |

**Example Request:**

```bash
curl -X GET "https://api.fiscalnacional.com.br/api/v1/external/nfse/EXT-20260103120000-A1B2C3D4/invoice?expires_in=7200" \
  -H "X-API-Key: your_api_key_here"
```

---

## Invoice Records API

The Invoice Records API manages standalone commercial invoices that are independent of NFS-e authorization status. Use this API to:

- Generate invoices even when NFS-e is pending or failed
- Issue refund, cancellation, or chargeback invoices
- Access the full invoice audit trail

### Invoice Types

| Type | Prefix | NFS-e Action | Description |
|------|--------|-------------|-------------|
| `standard` | `INV-` | None | Normal commercial invoice |
| `cancellation` | `CANCEL-` | NFSe → cancelled | Service was cancelled |
| `refund` | `REFUND-` | NFSe → cancelled | Full refund issued |
| `partial_refund` | `PREF-` | None (manual) | Partial refund — NFSe must be cancelled and re-issued separately |
| `chargeback` | `CB-` | NFSe → cancelled | Lost chargeback dispute |
| `credit_note` | `CN-` | None | Manual credit issued |

### 7. List Invoices

**Endpoint:** `GET /api/v1/invoices`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `nfse_id` | uuid | Filter by linked NFS-e |
| `invoice_type` | string | Filter by type (e.g., `refund`) |
| `limit` | integer | Max records (default 50, max 200) |
| `offset` | integer | Pagination offset |

**Response (200 OK):**

```json
[
  {
    "id": "uuid",
    "reference": "INV-202600001",
    "type": "standard",
    "amount_brl": 1500.00,
    "amount_foreign": 280.00,
    "currency_code": "220",
    "customer_name": "Acme Corp",
    "pdf_url": "https://...",
    "triggered_by": "manual",
    "issued_at": "2026-03-13T12:00:00Z"
  }
]
```

---

### 8. Get Invoice PDF

Download an invoice PDF. Generated on-demand if not yet stored.

**Endpoint:** `GET /api/v1/invoices/{invoice_id}/pdf`

---

### 9. Create Invoice

Create a standalone invoice, optionally linked to an NFS-e. Invoice is generated regardless of NFS-e status.

**Endpoint:** `POST /api/v1/invoices`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nfse_id` | uuid | No | Link to an existing NFS-e (pre-fills customer/amount) |
| `type` | string | No | Invoice type (default: `standard`) |
| `amount_brl` | number | **Yes** | Amount in BRL |
| `customer_name` | string | **Yes** | Customer name |
| `service_description` | string | **Yes** | Service description |
| `amount_foreign` | number | No | Amount in foreign currency |
| `currency_code` | string | No | BACEN currency code |
| `customer_email` | string | No | Customer email |
| `customer_country` | string | No | Customer country |
| `customer_address` | string | No | Customer address |
| `customer_tax_id` | string | No | NIF or CPF/CNPJ |
| `product_name` | string | No | Clean product name for PDF |
| `parent_invoice_id` | uuid | No | Invoice being superseded |

**Query Parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| `store_pdf` | true | Upload PDF to R2 after generation |

**Response (201 Created):** `InvoiceRecord`

---

### 10. Create Special Invoice (Refund / Cancellation / Chargeback)

Create a refund, cancellation, or chargeback invoice from an existing NFS-e.

**Endpoint:** `POST /api/v1/invoices/nfse/{nfse_id}/special`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | **Yes** | `cancellation`, `refund`, `partial_refund`, `chargeback`, or `credit_note` |
| `amount_brl` | number | No | Override amount (defaults to original NFS-e amount). Required for `partial_refund`. |
| `amount_foreign` | number | No | Override foreign amount |
| `store_pdf` | boolean | No | Store PDF in R2 (default: true) |

**Behavior by type:**

| Type | NFSe Status Updated | Use Case |
|------|---------------------|----------|
| `cancellation` | → `cancelled` | Administrative cancellation |
| `refund` | → `cancelled` | Full money-back refund |
| `chargeback` | → `cancelled` | Lost chargeback — merchant owes money |
| `partial_refund` | No change | Partial refund — cancel & re-issue NFSe manually |
| `credit_note` | No change | Manual credit, no payment reversal |

> **Brazilian fiscal law note:** NFSe cannot be partially cancelled. For partial refunds, you must cancel the original NFSe and issue a new one with the corrected amount. The `partial_refund` invoice type handles the paper trail without auto-cancelling.

**Example — full refund:**

```bash
curl -X POST "https://api.fiscalnacional.com.br/api/v1/invoices/nfse/{nfse_id}/special" \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{"type": "refund"}'
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "reference": "REFUND-202600001",
  "type": "refund",
  "parent_invoice_id": "uuid-of-original-invoice",
  "amount_brl": 1500.00,
  "pdf_url": "https://...",
  "triggered_by": "manual",
  "issued_at": "2026-03-13T14:00:00Z"
}
```

---

### 11. Stripe Webhook (Built-in)

Fiscal Nacional includes a built-in Stripe webhook endpoint that automatically creates the appropriate invoice when a refund or chargeback event is received. The NFS-e is looked up via the stored Stripe invoice ID.

**Endpoint:** `POST /api/v1/invoices/webhook/stripe`

**Supported Events:**

| Stripe Event | Invoice Type Created | NFSe Action |
|---|---|---|
| `charge.refunded` (full) | `refund` | → cancelled |
| `charge.refunded` (partial) | `partial_refund` | No change |
| `charge.dispute.funds_withdrawn` | `chargeback` | → cancelled |

**Setup in Stripe Dashboard:**

1. Go to **Developers → Webhooks → Add endpoint**
2. URL: `https://api.fiscalnacional.com.br/api/v1/invoices/webhook/stripe`
3. Select events: `charge.refunded`, `charge.dispute.funds_withdrawn`

> **Note:** Duplicate events (same Stripe event ID) are automatically ignored.

> **Important:** You must store the Stripe invoice ID in the `invoice_id` field when creating the NFS-e so the webhook can look it up. Pass it in the `external_reference` field or map it after creation.

---

## PDF Storage & Download Flow

When an NFS-e is authorized, the system automatically:

1. **Downloads the original PDF** from the prefecture portal (via `LinkVisualizacaoNfse`)
2. **Stores it in Cloudflare R2** for fast, reliable access
3. **Generates presigned URLs** on demand for secure downloads

### Storage Structure

Files are stored in R2 with the following structure:

```
{project_id}/{year}/{month}/NFSE/{reference}.pdf
{project_id}/{year}/{month}/NFSE/{reference}.xml
```

### PDF Fallback Chain

The `/nfse/{id}/pdf` endpoint uses a fallback chain to ensure PDF availability:

| Priority | Source | Description |
|----------|--------|-------------|
| 1 | **R2 Storage** | Pre-stored PDF (fastest, most reliable) |
| 2 | **Prefecture Link** | Download from prefecture if not in R2 |
| 3 | **DANFSE Generation** | Generate representation if all else fails |

> **Note:** The original PDF from the prefecture is preferred over DANFSE generation because it's the official document issued by the municipality.

---

## NFS-e Status Values

| Status | Description |
|--------|-------------|
| `pending` | NFS-e created, waiting to be processed |
| `processing` | NFS-e is being processed by the municipality |
| `authorized` | NFS-e successfully authorized and issued |
| `cancelled` | NFS-e was cancelled (after refund, chargeback, or administrative cancellation) |
| `error` | Processing failed - check `error_message` for details |
| `disputed` | A dispute/chargeback has been opened (funds not yet withdrawn) |
| `invoice_only` | Amount was R$0,00 — a commercial Invoice was created but no NFS-e was submitted to the municipality |

---

## Code Examples

### Python

```python
import requests

API_KEY = "your_project_api_key_here"
BASE_URL = "https://api.fiscalnacional.com.br"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

# Create NFS-e for Brazilian customer
def create_nfse_brazil(customer_data, service_description, amount):
    payload = {
        "customer_name": customer_data["name"],
        "customer_email": customer_data["email"],
        "customer_country": "BR",
        "customer_document": customer_data["cpf_cnpj"],  # CPF or CNPJ
        "customer_address": customer_data["address"],
        "customer_number": customer_data["number"],
        "customer_neighborhood": customer_data["neighborhood"],
        "customer_postal_code": customer_data["postal_code"],
        "customer_state": customer_data["state"],
        "customer_city_name": customer_data["city"],
        "customer_city_code": customer_data["city_code"],  # IBGE code
        "service_description": service_description,
        "amount": amount,
        "external_reference": f"INV-{customer_data['invoice_id']}"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/v1/external/nfse",
        json=payload,
        headers=headers
    )
    return response.json()

# Create NFS-e for international customer (export)
def create_nfse_international(customer_data, service_description, amount_brl, amount_foreign=None):
    payload = {
        "customer_name": customer_data["name"],
        "customer_email": customer_data["email"],
        "customer_country": customer_data["country"],  # e.g., "US", "DE", "GB"
        "customer_country_iso2": customer_data["country"],  # ISO 3166-1 alpha-2 (REQUIRED for international)
        "customer_nif": customer_data.get("tax_id"),  # Foreign Tax ID (NIF)
        "customer_address": customer_data.get("address"),
        "customer_number": customer_data.get("number"),
        "customer_city_name": customer_data["city"],
        "customer_state": customer_data["state"],
        "customer_postal_code": customer_data.get("postal_code"),
        "service_description": service_description,
        "amount": amount_brl,
        # Foreign currency fields (optional but recommended for exports)
        "currency_code": customer_data.get("currency_code", "220"),  # 220=USD (BACEN)
        "foreign_currency_amount": amount_foreign,
        "external_reference": f"SUB-{customer_data['subscription_id']}"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/v1/external/nfse",
        json=payload,
        headers=headers
    )
    return response.json()

# Check NFS-e status
def check_nfse_status(reference):
    response = requests.get(
        f"{BASE_URL}/api/v1/external/nfse/{reference}",
        headers=headers
    )
    return response.json()

# Cancel NFS-e
def cancel_nfse(reference, reason):
    response = requests.post(
        f"{BASE_URL}/api/v1/external/nfse/{reference}/cancel",
        json={"reason": reason},
        headers=headers
    )
    return response.json()

# Poll until authorized or error
def wait_for_nfse(reference, max_attempts=30, interval=10):
    import time
    
    for _ in range(max_attempts):
        status = check_nfse_status(reference)
        
        if status["status"] == "authorized":
            return status
        elif status["status"] == "error":
            raise Exception(f"NFS-e failed: {status['error_message']}")
        
        time.sleep(interval)
    
    raise Exception("Timeout waiting for NFS-e")
```

### Node.js / TypeScript

```typescript
const API_KEY = "your_project_api_key_here";
const BASE_URL = "https://api.fiscalnacional.com.br";

interface NFSeRequest {
  customer_name: string;
  customer_email?: string;
  customer_country?: string;
  customer_country_iso2?: string;  // REQUIRED for international (e.g., "US", "DE")
  customer_document?: string;  // CPF/CNPJ for Brazilian customers
  // International customer fields
  customer_nif?: string;       // Foreign Tax ID (NIF)
  nif_exemption_code?: 0 | 1 | 2;  // 0=provided, 1=not required, 2=not provided
  currency_code?: string;      // BACEN code: "220"=USD, "978"=EUR
  foreign_currency_amount?: number;  // Value in foreign currency
  // Address fields
  customer_address?: string;
  customer_number?: string;
  customer_complement?: string;
  customer_neighborhood?: string;
  customer_postal_code?: string;
  customer_state?: string;
  customer_city_name?: string;
  customer_city_code?: number;
  customer_inscricao_municipal?: string;
  service_description: string;  // Portuguese description for NFS-e
  product_name?: string;        // English name for commercial invoice (e.g., "100 Credits")
  amount: number;
  external_reference?: string;
}

interface NFSeResponse {
  id: string;
  reference: string;
  status: "pending" | "processing" | "authorized" | "cancelled" | "error" | "invoice_only";
  nfse_number: string | null;
  value_brl: number;
  iss_rate: number;
  iss_value: number;
  customer_name: string;
  created_at: string;
  pdf_url: string | null;
  error_message: string | null;
}

interface NFSeStatusResponse {
  id: string;
  reference: string;
  status: string;
  nfse_number: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  error_message: string | null;
  issued_at: string | null;
}

// Create NFS-e
async function createNFSe(data: NFSeRequest): Promise<NFSeResponse> {
  const response = await fetch(`${BASE_URL}/api/v1/external/nfse`, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create NFS-e");
  }

  return response.json();
}

// Check status
async function checkNFSeStatus(reference: string): Promise<NFSeStatusResponse> {
  const response = await fetch(`${BASE_URL}/api/v1/external/nfse/${reference}`, {
    headers: {
      "X-API-Key": API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error("NFS-e not found");
  }

  return response.json();
}

// Example: Create NFS-e for Brazilian customer
async function createBrazilianNFSe() {
  const nfse = await createNFSe({
    customer_name: "João da Silva",
    customer_email: "joao@example.com",
    customer_country: "BR",
    customer_document: "12345678901", // CPF
    customer_address: "Rua das Flores",
    customer_number: "123",
    customer_neighborhood: "Centro",
    customer_postal_code: "89201-000",
    customer_state: "SC",
    customer_city_name: "Joinville",
    customer_city_code: 4209102, // IBGE code for Joinville
    service_description: "Desenvolvimento de software - Plano Mensal",
    amount: 1500.0,
    external_reference: "SUB-2026-001",
  });

  console.log("NFS-e created:", nfse.reference);
  return nfse;
}

// Example: Create NFS-e for international customer (with NIF and foreign currency)
async function createInternationalNFSe() {
  const nfse = await createNFSe({
    customer_name: "Acme Corporation",
    customer_email: "billing@acme.com",
    customer_country: "US",
    customer_country_iso2: "US",  // REQUIRED for international
    customer_nif: "12-3456789",  // US EIN/Tax ID
    customer_address: "123 Silicon Valley Blvd",
    customer_number: "100",
    customer_neighborhood: "Financial District",  // Optional, defaults to "Exterior"
    customer_city_name: "San Francisco",
    customer_state: "CA",
    customer_postal_code: "94105",
    service_description: "SaaS subscription - Professional Plan",
    amount: 299.0,  // Value in BRL
    currency_code: "220",  // USD (BACEN code)
    foreign_currency_amount: 55.0,  // Value in USD
    external_reference: "INV-2026-001",
  });

  console.log("Export NFS-e created:", nfse.reference);
  return nfse;
}
```

### cURL

```bash
# Create NFS-e for Brazilian customer
curl -X POST "https://api.fiscalnacional.com.br/api/v1/external/nfse" \
  -H "X-API-Key: your_project_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "João da Silva",
    "customer_email": "joao@example.com",
    "customer_country": "BR",
    "customer_document": "12345678901",
    "customer_address": "Rua das Flores",
    "customer_number": "123",
    "customer_neighborhood": "Centro",
    "customer_postal_code": "89201-000",
    "customer_state": "SC",
    "customer_city_name": "Joinville",
    "customer_city_code": 4209102,
    "service_description": "Desenvolvimento de software - Plano Mensal",
    "amount": 1500.00,
    "external_reference": "SUB-2026-001"
  }'

# Create NFS-e for international customer (export with NIF and foreign currency)
curl -X POST "https://api.fiscalnacional.com.br/api/v1/external/nfse" \
  -H "X-API-Key: your_project_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Acme Corporation",
    "customer_email": "billing@acme.com",
    "customer_country": "US",
    "customer_country_iso2": "US",
    "customer_nif": "12-3456789",
    "customer_address": "123 Silicon Valley Blvd",
    "customer_number": "100",
    "customer_neighborhood": "Financial District",
    "customer_city_name": "San Francisco",
    "customer_state": "CA",
    "customer_postal_code": "94105",
    "service_description": "SaaS subscription - Professional Plan",
    "amount": 299.00,
    "currency_code": "220",
    "foreign_currency_amount": 55.00,
    "external_reference": "INV-2026-001"
  }'

# Check NFS-e status
curl -X GET "https://api.fiscalnacional.com.br/api/v1/external/nfse/EXT-20260103120000-A1B2C3D4" \
  -H "X-API-Key: your_project_api_key_here"

# List all NFS-e
curl -X GET "https://api.fiscalnacional.com.br/api/v1/external/nfse?limit=50" \
  -H "X-API-Key: your_project_api_key_here"

# Cancel NFS-e
curl -X POST "https://api.fiscalnacional.com.br/api/v1/external/nfse/EXT-20260103120000-A1B2C3D4/cancel" \
  -H "X-API-Key: your_project_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Service was cancelled by customer request"
  }'
```

---

## Common IBGE City Codes

Here are some common IBGE codes for major Brazilian cities:

| City | State | IBGE Code |
|------|-------|-----------|
| São Paulo | SP | 3550308 |
| Rio de Janeiro | RJ | 3304557 |
| Belo Horizonte | MG | 3106200 |
| Curitiba | PR | 4106902 |
| Porto Alegre | RS | 4314902 |
| Florianópolis | SC | 4205407 |
| Joinville | SC | 4209102 |
| Blumenau | SC | 4202404 |
| Brasília | DF | 5300108 |
| Salvador | BA | 2927408 |
| Fortaleza | CE | 2304400 |
| Recife | PE | 2611606 |

You can query the full list via our IBGE API:
```
GET /api/v1/ibge/cities?state=SC
```

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created successfully |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing API key |
| 403 | Forbidden - Company is inactive |
| 404 | Not Found - NFS-e not found |
| 422 | Validation Error - Check error details |
| 500 | Server Error - Contact support |

### Error Response Format

```json
{
  "detail": "Error message description"
}
```

Or for validation errors:

```json
{
  "detail": [
    {
      "loc": ["body", "customer_name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Webhooks

Configure a Webhook URL in your project settings to receive real-time notifications about NFS-e status changes. This eliminates the need for polling and ensures your system is updated immediately when an NFS-e is authorized or fails.

### Configuration

1. Go to **Projects** in the dashboard
2. Edit your project
3. Enter your **Webhook URL** (must be a valid public HTTPS URL)
4. Save changes

### Events

The system sends HTTP `POST` requests to your configured URL for the following events:

#### 1. NFS-e Authorized (`nfse.authorized`)

Sent when an NFS-e is successfully processed and authorized by the municipality.

**Payload:**

```json
{
  "event": "nfse.authorized",
  "reference": "EXT-20260103120000-A1B2C3D4",
  "external_reference": "INV-12345",
  "status": "authorized",
  "nfse_number": "202600001",
  "verification_code": "AB12CD34",
  "pdf_url": "https://storage.r2.cloudflarestorage.com/bucket/path/to/nfse.pdf",
  "xml_url": "https://storage.r2.cloudflarestorage.com/bucket/path/to/nfse.xml",
  "invoice_url": "https://storage.r2.cloudflarestorage.com/bucket/path/to/invoice.pdf",
  "issued_at": "2026-01-03T12:05:00.123456"
}
```

> **Note:** The `pdf_url` points to the stored PDF in R2 (or the prefecture link if R2 is unavailable). You can save this URL directly in your database.

#### 2. NFS-e Error (`nfse.error`)

Sent when NFS-e processing fails (e.g., validation error, rejected by prefecture).

**Payload:**

```json
{
  "event": "nfse.error",
  "reference": "EXT-20260103120000-A1B2C3D4",
  "external_reference": "INV-12345",
  "status": "error",
  "error": "CNPJ do tomador inválido or user not found",
  "error_code": "E174",
  "updated_at": "2026-01-03T12:05:00.123456"
}
```

### Best Practices

- **Idempotency:** Your webhook endpoint should handle duplicate events gracefully. Use the `reference` field to identify the transaction.
- **Async Processing:** Return a `200 OK` response immediately upon receiving the webhook, then process the payload asynchronously if needed.
- **Failures:** The system will attempt to send the webhook once. If your server is down or returns an error, the event may be lost (retry mechanism is coming soon).
- **Security:** Provide a secret or token in the query parameters of your Webhook URL if you need to verify the source (e.g., `https://myapp.com/webhooks/fiscalnacional?token=secret123`).


## Best Practices

1. **Store the reference**: Always store the `reference` returned when creating an NFS-e. This is your primary identifier for status checks.

2. **Use external_reference**: Pass your internal invoice/subscription ID in the `external_reference` field for easy cross-referencing.

3. **Handle async processing**: NFS-e generation is asynchronous. After creation, poll the status endpoint or (when available) listen for webhooks.

4. **Brazilian customers require address**: For Brazilian customers, provide complete address information including the IBGE city code.

5. **International = Export**: Any `customer_country` that is not `BR`, `BRAZIL`, or `BRASIL` is treated as an export service. ISS rate is automatically set to 0%.

6. **Retry on errors**: If you receive a 5xx error, implement exponential backoff retry logic.

---

## Rate Limits

| Plan | Requests/minute | NFS-e/month |
|------|-----------------|-------------|
| Free | 10 | 50 |
| Starter | 60 | 500 |
| Professional | 120 | 2,000 |
| Enterprise | Unlimited | Unlimited |

---

## Support

- Documentation: https://docs.fiscalnacional.com.br
- API Status: https://status.fiscalnacional.com.br
- Email: suporte@fiscalnacional.com.br

---

## Testing the API

### Quick Test Script

We provide a test script to validate your integration:

```bash
# From the backend directory
cd backend

# Run the test script with your API key
python scripts/test_external_api.py YOUR_PROJECT_API_KEY

# Or set as environment variable
export NFE_TEST_API_KEY=nfe_xxx
python scripts/test_external_api.py
```

The script will:
1. Test authentication (invalid/missing API key)
2. Test request validation
3. Create a test NFS-e for Brazilian customer
4. Create a test NFS-e for international customer (export)
5. Check status of created NFS-e
6. List all NFS-e records

### Running Backend Tests

```bash
cd backend

# Install test dependencies
uv pip install pytest pytest-asyncio httpx

# Run all tests
uv run pytest tests/ -v

# Run only external API tests
uv run pytest tests/integration/test_external_api.py -v
```

---

## BACEN Currency Codes

For international NFS-e, use BACEN codes (not ISO 4217):

| Currency | BACEN Code | ISO Code |
|----------|------------|----------|
| US Dollar (USD) | 220 | 840 |
| Euro (EUR) | 978 | 978 |
| British Pound (GBP) | 540 | 826 |
| Canadian Dollar (CAD) | 165 | 124 |
| Australian Dollar (AUD) | 150 | 036 |
| Japanese Yen (JPY) | 470 | 392 |
| Swiss Franc (CHF) | 510 | 756 |

> Full list: https://www.bcb.gov.br/estabilidadefinanceira/cotacoestodas

---

## Cloudflare SaaS boilerplate

The Worker in this repository does **not** call the External API above. It uses [`src/server/services/nfse.ts`](../src/server/services/nfse.ts) (`FiscalNacionalService`): **Bearer** auth, `POST /notas`, and Portuguese `prestador` / `tomador` / `servico` payloads. See the comparison table under **Relationship to this boilerplate** at the top.

When operating **this template** (app API path):

1. **API key** — Create an account at [Fiscal Nacional](https://fiscalnacional.com.br), then store the key with Wrangler (never commit):

   ```bash
   wrangler secret put FISCAL_NACIONAL_API_KEY
   wrangler secret put FISCAL_NACIONAL_API_KEY --env staging
   ```

2. **Environment** — `FISCAL_NACIONAL_ENVIRONMENT` in `wrangler.jsonc` selects staging vs production hosts used by `nfse.ts` (`sandbox…` / `app…` under `…/api/v1`), not the `api.` / `api-staging.` hosts from the External API table above.

3. **Company (prestador)** — In the app dashboard, **Settings → Company**: CNPJ, inscrição municipal, razão social, IBGE city code, CNAE, ISS where required.

4. **Customer (tomador)** — Billing/invoice flows should supply name, document (CPF/CNPJ), and email (e.g. from Stripe) so emission payloads are valid.

5. **Background jobs** — NFSe work may run via Trigger.dev; deploy workers and tasks (`bun run trigger:deploy`). Configure `TRIGGER_API_KEY` and `INTERNAL_API_KEY`. Paid invoice webhooks can enqueue generation—see `invoice.payment_succeeded` in the Worker.

---

## Changelog

### v1.5.0 (2026-03-16)
- **Zero-amount support**: `POST /external/nfse` now accepts `amount: 0`. Returns a standalone commercial Invoice (`status: "INVOICE_ONLY"`) without submitting any NFS-e to the municipality — complies with fiscal system limitation that prohibits R$0,00 NFS-e.

### v1.4.0 (2026-03-13)
- **Invoice Records**: New standalone `InvoiceRecord` system — invoices can be generated independently of NFS-e authorization status
- **Special Invoices**: New `POST /invoices/nfse/{nfse_id}/special` endpoint for refund, cancellation, chargeback, partial_refund, and credit_note invoices
- **Built-in Stripe Webhook**: `POST /invoices/webhook/stripe` automatically creates refund/chargeback invoices and cancels the NFS-e
- **Decoupled invoice generation**: Removed the requirement for NFS-e to be in `AUTHORIZED` status before generating a commercial invoice
- **Invoice types**: `standard`, `cancellation`, `refund`, `partial_refund`, `chargeback`, `credit_note` with audit trail and parent invoice linking
- **NFS-e status**: Added `disputed` status for open chargeback disputes

### v1.3.0 (2026-01-29)
- **Webhooks**: Added support for webhook notifications (`nfse.authorized`, `nfse.error`).
- **International**: Added `customer_country_iso2` (ISO 3166-1 alpha-2) as a **required** field for international customers to support NFS-e Nacional country codes.
- **Documentation**: Updated integration guide with webhook payloads and configuration steps.

### v1.2.0 (2026-01-28)
- Added `/nfse/{reference}/download` endpoint for presigned download URLs
- PDF storage now uses original prefecture PDF instead of generated DANFSE
- PDFs are automatically downloaded from prefecture and stored in Cloudflare R2
- Added PDF fallback chain: R2 → Prefecture → DANFSE generation
- Added Cancel NFS-e endpoint for external API

### v1.1.0 (2026-01-05)
- Added international customer fields: `customer_nif`, `nif_exemption_code`
- Added foreign currency fields: `currency_code`, `foreign_currency_amount`
- Increased `customer_postal_code` max length to 20 chars for international codes
- Improved export NFS-e support with proper `comExt` (foreign trade) information

### v1.0.0 (2026-01-03)
- Initial release
- Create NFS-e endpoint
- Check status endpoint
- List NFS-e endpoint
- Support for Brazilian and international customers

