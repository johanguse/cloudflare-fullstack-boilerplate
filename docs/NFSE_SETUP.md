# External API Integration Guide

This document describes how to integrate your SaaS application with the Fiscal Nacional External API to automatically generate NFS-e (Nota Fiscal de Serviço Eletrônica) for your customers.

## Overview

The External API allows your application to generate Brazilian electronic service invoices (NFS-e) programmatically using a simple REST API with API Key authentication. No user session or OAuth flow required.

**Base URL:**
- Production: `https://api.fiscal.guseapp.com`
- Staging: `https://api-staging.fiscal.guseapp.com`
- Local Development: `http://localhost:8787/api/v1`

## When NOT to Generate NFS-e

> ⚠️ **Important:** Do NOT call this API in these cases:

| Scenario | Reason |
|----------|--------|
| **Trial period** | No payment received - no taxable event |
| **Failed/pending payments** | Transaction not completed |

> **Amount = R$ 0,00 (free plans / 100% coupon):** You **can** call this API with `amount: 0`. The system will skip NFS-e generation (fiscal system limitation) and return a standalone commercial Invoice instead (`status: "invoice_only"`). No NFS-e is submitted to the municipality.

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
| `customer_country` | string | No | Country identifier. `BR`, `BRAZIL`, or `BRASIL` for Brazil; any other value is treated as an international/export request. Default: `BR` |
| `customer_country_iso2` | string | Conditional | **Required for international customers.** ISO 3166-1 alpha-2 code (e.g., `US`, `DE`, `GB`, `KW`). See [country list endpoint](#country-list). |
| `customer_document` | string | Conditional | CPF (11 digits) or CNPJ (14 digits). **Required for Brazilian customers.** |
| `customer_nif` | string | No | Foreign Tax ID (NIF) for international customers (max 64 chars) |
| `nif_exemption_code` | integer | No | NIF exemption code: `0`=NIF provided, `1`=not required, `2`=not provided |
| `currency_code` | string | No | BACEN currency code for foreign currency (e.g., `220`=USD, `978`=EUR) |
| `foreign_currency_amount` | number | No | Invoice value in foreign currency (for exports) |
| `customer_address` | string | No | Street address |
| `customer_number` | string | No | Address number |
| `customer_complement` | string | No | Address complement (apt, suite, etc.) |
| `customer_neighborhood` | string | No | Neighborhood/District |
| `customer_postal_code` | string | No | Postal/ZIP code |
| `customer_state` | string | No | State code (e.g., `SC`, `SP`, `RJ`) or international region |
| `customer_city_name` | string | No | City name |
| `customer_city_code` | integer | No | IBGE city code. Recommended for Brazilian customers to ensure the correct ISS rate. |
| `customer_inscricao_municipal` | string | No | Customer's municipal registration (if applicable) |
| `service_description` | string | No | Description of services used in the NFS-e XML. If omitted, the NFS-e task falls back to the company's default service description, then `"Serviços"`. |
| `product_name` | string | No | Clean product name for the commercial invoice PDF (e.g., `"Pro Plan"`). Not included in the NFS-e. Falls back to `service_description`. |
| `amount` | number | **Yes** | Invoice amount in BRL (≥ 0). Use `0` for free/fully-discounted transactions — returns a commercial invoice only, no NFS-e submitted |
| `external_reference` | string | No | Your system's reference ID (invoice ID, subscription ID, etc.) |

> **International Customers:** Any `customer_country` value other than `BR`/`BRAZIL`/`BRASIL` is treated as an export. ISS is automatically set to 0%. Provide `customer_country_iso2` and optionally `customer_nif`, `currency_code`, and `foreign_currency_amount`.
>
> **📧 Email Handling:**
> - **Brazilian customers**: Email is sent to the prefecture, and the customer receives the NFS-e PDF directly from the city government.
> - **International customers**: Email is **stored in Fiscal Nacional** but **NOT sent to the prefecture**. This prevents international customers from receiving the official NFS-e PDF in Portuguese. Instead, they receive a commercial Invoice (in their currency) generated by our system.

**Response (201 Created):**

```json
{
  "id": "nfseRecordId",
  "reference": "nfse_ABC123DEF456GHIJ",
  "status": "processing",
  "nfse_number": null,
  "value_brl": 1500.00,
  "iss_rate": 0.05,
  "iss_value": 75.00,
  "customer_name": "João da Silva",
  "created_at": "2026-01-03T12:00:00.000Z",
  "pdf_url": null,
  "invoice_url": null,
  "error_message": null
}
```

The NFS-e is processed asynchronously. Use the `reference` to poll the status endpoint or listen for webhooks.

**Response when `amount = 0` (Invoice only, no NFS-e):**

```json
{
  "id": "nfseRecordId",
  "reference": "nfse_ABC123DEF456GHIJ",
  "status": "invoice_only",
  "nfse_number": null,
  "value_brl": 0.0,
  "iss_rate": 0.0,
  "iss_value": 0.0,
  "customer_name": "João da Silva",
  "created_at": "2026-01-03T12:00:00.000Z",
  "pdf_url": null,
  "invoice_url": null,
  "error_message": null
}
```

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
  "id": "nfseRecordId",
  "reference": "nfse_ABC123DEF456GHIJ",
  "status": "authorized",
  "nfse_number": "202600001",
  "pdf_url": "https://storage.r2.cloudflarestorage.com/bucket/path/nfse.pdf",
  "xml_url": "https://storage.r2.cloudflarestorage.com/bucket/path/nfse.xml",
  "invoice_url": null,
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
  "id": "nfseRecordId",
  "reference": "nfse_ABC123DEF456GHIJ",
  "status": "authorized",
  "cancelled_at": null,
  "message": "NFS-e cancellation initiated"
}
```

Cancellation is processed asynchronously. Poll the status endpoint until `status` is `"cancelled"`.

**Error Responses:**

| Status | Reason |
|--------|--------|
| 400 | NFS-e is not in `authorized` status |
| 400 | `reason` is missing or shorter than 10 characters |
| 400 | `reason` exceeds 500 characters |
| 422 | NFS-e number or verification code missing |
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
    "id": "nfseRecordId1",
    "reference": "nfse_ABC123DEF456GHIJ",
    "status": "authorized",
    "nfse_number": "202600001",
    "pdf_url": "https://...",
    "xml_url": "https://...",
    "invoice_url": null,
    "error_message": null,
    "issued_at": "2026-01-03T12:05:00Z",
    "cancelled_at": null
  },
  {
    "id": "nfseRecordId2",
    "reference": "nfse_XYZ789",
    "status": "processing",
    "nfse_number": null,
    "pdf_url": null,
    "xml_url": null,
    "invoice_url": null,
    "error_message": null,
    "issued_at": null,
    "cancelled_at": null
  }
]
```

---

### 5. Get Download URLs

Returns download URLs for the NFS-e PDF, XML, and commercial invoice.

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
| `expires_in` | integer | 3600 | Informational only — URLs are permanent (min 60, max 86400) |

**Response (200 OK):**

```json
{
  "reference": "nfse_ABC123DEF456GHIJ",
  "pdf_url": "https://storage.r2.cloudflarestorage.com/bucket/path/nfse.pdf",
  "xml_url": "https://storage.r2.cloudflarestorage.com/bucket/path/nfse.xml",
  "invoice_url": null,
  "expires_in": 3600
}
```

**Error Responses:**

| Status | Reason |
|--------|--------|
| 202 | NFS-e is not yet issued (still processing) |
| 404 | NFS-e not found or PDF not yet available |

> Use `pdf_url` for the official NFS-e PDF (stored in R2, falling back to the prefecture link). `xml_url` contains the raw XML. `invoice_url` is populated for international customers.

---

### 6. Get Invoice

Download the commercial invoice for an NFS-e. Works regardless of NFS-e status. By default the invoice is generated on demand if not yet stored.

The Invoice is a **commercial invoice** document, separate from the NFS-e PDF. Useful for:
- International customers who need an English-language invoice
- Internal record-keeping
- Accounting system integrations

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
| `generate_if_missing` | boolean | true | Generate invoice HTML on demand if not already stored |

**Response:** The invoice file is served directly.

- `200 application/pdf` — when a PDF has been generated and stored
- `200 text/html` — when only the print-ready HTML version is available
- `302` — redirect to an external storage URL (legacy records with a CDN `invoice_url`)

**Error Responses:**

| Status | Reason |
|--------|--------|
| 404 | NFS-e not found, or invoice not stored and `generate_if_missing=false` |
| 500 | Invoice generation failed |

**Example Request:**

```bash
curl -X GET "https://api.fiscal.guseapp.com/api/v1/external/nfse/nfse_ABC123DEF456GHIJ/invoice" \
  -H "X-API-Key: your_api_key_here" \
  -o invoice.html
```

---

---

## PDF Storage & Download Flow

When an NFS-e is authorized, the system automatically:

1. **Downloads the original PDF** from the prefecture portal (via `LinkVisualizacaoNfse`)
2. **Stores it in Cloudflare R2** for fast, reliable access
3. **Generates presigned URLs** on demand for secure downloads

### Storage Structure

Files are stored in R2 with the following structure:

```
nfse/{nfseRecordId}/nfse.pdf
nfse/{nfseRecordId}/nfse.xml
nfse/{nfseRecordId}/invoice.html   (commercial invoice — print-ready HTML)
nfse/{nfseRecordId}/invoice.pdf    (commercial invoice PDF, when browser rendering is available)
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
| `processing` | NFS-e submitted to the municipality, awaiting confirmation |
| `authorized` | NFS-e successfully issued and authorized by the municipality |
| `cancelled` | NFS-e was cancelled (after refund, chargeback, or administrative cancellation) |
| `error` | Processing failed — check `errorMessage` for details |
| `invoice_only` | Amount was R$ 0,00 — a commercial Invoice was created but no NFS-e was submitted to the municipality |

---

## Country List

### <a name="country-list"></a>Get Valid Country Codes

Returns the full BACEN country list with ISO codes. Use this to populate country dropdowns and to validate `customer_country_iso2` values before sending NFS-e requests.

**Endpoint:** `GET /api/v1/ibge/countries`

> No authentication required.

**Response (200 OK):**

```json
[
  {
    "bacen_code": 2496,
    "iso2": "US",
    "name": "Estados Unidos",
    "name_en": "United States"
  },
  {
    "bacen_code": 1988,
    "iso2": "KW",
    "name": "Kuwait",
    "name_en": "Kuwait"
  }
]
```

| Field | Description |
|-------|-------------|
| `bacen_code` | BACEN/IBGE code used internally by NFS-e Nacional (E284 validation) |
| `iso2` | ISO 3166-1 alpha-2 code — use this as `customer_country_iso2` |
| `name` | Country name in Portuguese |
| `name_en` | Country name in English |

> The list covers all ~225 countries recognised by the Brazilian Central Bank (BACEN). If a country is not in this list, it cannot be used as a service delivery location in NFS-e Nacional.

---

## Code Examples

### Python

```python
import requests

API_KEY = "your_project_api_key_here"
BASE_URL = "https://api.fiscal.guseapp.com"

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
const BASE_URL = "https://api.fiscal.guseapp.com";

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
  service_description?: string; // Portuguese description for NFS-e (falls back to company default)
  product_name?: string;        // English name for commercial invoice (e.g., "100 Credits")
  amount: number;
  external_reference?: string;
}

interface NFSeResponse {
  id: string;
  reference: string;
  status: "processing" | "invoice_only";
  nfse_number: string | null;
  value_brl: number;
  iss_rate: number;
  iss_value: number;
  customer_name: string;
  created_at: string;
  pdf_url: string | null;
  invoice_url: string | null;
  error_message: string | null;
}

interface NFSeStatusResponse {
  id: string;
  reference: string;
  status: "pending" | "processing" | "authorized" | "cancelled" | "error" | "invoice_only";
  nfse_number: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  invoice_url: string | null;
  error_message: string | null;
  issued_at: string | null;
  cancelled_at: string | null;
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
curl -X POST "https://api.fiscal.guseapp.com/api/v1/external/nfse" \
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
curl -X POST "https://api.fiscal.guseapp.com/api/v1/external/nfse" \
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
curl -X GET "https://api.fiscal.guseapp.com/api/v1/external/nfse/nfse_ABC123DEF456GHIJ" \
  -H "X-API-Key: your_project_api_key_here"

# List all NFS-e
curl -X GET "https://api.fiscal.guseapp.com/api/v1/external/nfse?limit=50" \
  -H "X-API-Key: your_project_api_key_here"

# Cancel NFS-e
curl -X POST "https://api.fiscal.guseapp.com/api/v1/external/nfse/nfse_ABC123DEF456GHIJ/cancel" \
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
  "error": "Error message description"
}
```

For request validation errors (400), the response includes Zod issue details:

```json
{
  "error": "Invalid request",
  "issues": [
    {
      "code": "custom",
      "message": "customer_document is required for Brazilian customers (CPF/CNPJ)",
      "path": ["customer_document"]
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

#### 1. NFS-e Authorized (`nfse.issued`)

Sent when an NFS-e is successfully processed and authorized by the municipality.

**Payload:**

```json
{
  "event": "nfse.issued",
  "nfse": {
    "id": "rec_abc123",
    "reference": "nfse_ABC123DEF456GHIJ",
    "status": "authorized",
    "nfse_number": "202600001",
    "pdf_url": "https://storage.r2.cloudflarestorage.com/bucket/path/to/nfse.pdf",
    "xml_url": "https://storage.r2.cloudflarestorage.com/bucket/path/to/nfse.xml",
    "invoice_url": "https://api.fiscal.guseapp.com/api/v1/external/nfse/nfse_ABC123DEF456GHIJ/invoice",
    "error_message": null,
    "issued_at": "2026-01-03T12:05:00.000Z",
    "cancelled_at": null
  }
}
```

> `status` is `"authorized"` (the internal `"issued"` value is mapped to match the status values returned by other API endpoints).

#### 2. NFS-e Error (`nfse.error`)

Sent when NFS-e processing fails (e.g., validation error, rejected by the municipality).

**Payload:**

```json
{
  "event": "nfse.error",
  "nfse": {
    "id": "rec_abc123",
    "reference": "nfse_ABC123DEF456GHIJ",
    "status": "error",
    "nfse_number": null,
    "pdf_url": null,
    "xml_url": null,
    "invoice_url": null,
    "error_message": "CNPJ do tomador inválido",
    "issued_at": null,
    "cancelled_at": null
  }
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

### Quick Test with cURL

```bash
export API_KEY="your_project_api_key_here"
export BASE_URL="https://api.fiscal.guseapp.com"

# Create a test NFS-e
curl -X POST "$BASE_URL/api/v1/external/nfse" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test Customer",
    "customer_document": "12345678901",
    "customer_country": "BR",
    "customer_city_code": 4209102,
    "service_description": "Teste de integração",
    "amount": 100.00
  }'

# Check the returned reference, then poll:
curl -X GET "$BASE_URL/api/v1/external/nfse/nfse_YOUR_REF" \
  -H "X-API-Key: $API_KEY"
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

## Changelog

### v2.0.0 (2026-05-13)
- **Platform migration**: Backend rewritten from Python/FastAPI + PostgreSQL (Inngest) to **Cloudflare Workers + Hono + Drizzle ORM + D1 (SQLite) + Trigger.dev**
- **Same API contract**: All request/response shapes preserved for drop-in compatibility with existing integrations
- **Download endpoint**: Restored JSON response (`{reference, pdf_url, xml_url, invoice_url, expires_in}`) — previously regressed to a 302 redirect during migration
- **Status rename**: Internal status `authorized` → `issued` in the new DB; the external API maps it back to `authorized` for backward compatibility
- **Reference format**: New records use `nfse_` prefix (e.g. `nfse_ABC123DEF456GHIJ`) instead of `EXT-YYYYMMDDHHMMSS-XXXXXXXX`
- **Infrastructure**: Zero cold-start latency via Cloudflare edge network; background jobs via Trigger.dev (replaces Inngest)

### v1.5.0 (2026-03-16)
- **Zero-amount support**: `POST /external/nfse` now accepts `amount: 0`. Returns a standalone commercial Invoice (`status: "invoice_only"`) without submitting any NFS-e to the municipality — complies with fiscal system limitation that prohibits R$0,00 NFS-e.

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

