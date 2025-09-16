# API Reference Documentation

## Overview
The Criminal Kitchen API is built on Supabase, providing RESTful endpoints for all system operations. This document details the available endpoints, request/response formats, and authentication requirements.

## Authentication
All API endpoints require authentication via JWT tokens obtained through Supabase Auth.

### Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Core API Endpoints

### 1. Products API

#### List Products
```http
GET /rest/v1/products
```

**Query Parameters**:
- `select`: Fields to return (default: `*`)
- `order`: Sort order (e.g., `name.asc`)
- `limit`: Number of records (default: 1000)
- `offset`: Pagination offset

**Response**:
```json
[
  {
    "id": "uuid",
    "sku": "CHICK-001",
    "name": "Chicken Breast",
    "unit": "kg",
    "quantity": 12.5,
    "min_stock": 5,
    "category": "Meat",
    "notes": "Fresh chicken breast",
    "created_at": "2025-08-26T20:00:00Z",
    "updated_at": "2025-08-26T20:00:00Z"
  }
]
```

#### Get Product by ID
```http
GET /rest/v1/products?id=eq.{product_id}
```

#### Create Product
```http
POST /rest/v1/products
```

**Request Body**:
```json
{
  "sku": "FLOUR-002",
  "name": "Wheat Flour 550",
  "unit": "kg",
  "quantity": 40,
  "min_stock": 20,
  "category": "Dry",
  "notes": "Professional grade flour"
}
```

#### Update Product
```http
PATCH /rest/v1/products?id=eq.{product_id}
```

#### Delete Product
```http
DELETE /rest/v1/products?id=eq.{product_id}
```

### 2. Suppliers API

#### List Suppliers
```http
GET /rest/v1/suppliers
```

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "Foodlevel, UAB",
    "email": "sales@foodlevel.lt",
    "phone": "+370 5 123 4567",
    "created_at": "2025-08-26T20:00:00Z",
    "updated_at": "2025-08-26T20:00:00Z"
  }
]
```

#### Create Supplier
```http
POST /rest/v1/suppliers
```

**Request Body**:
```json
{
  "name": "Sanitex, UAB",
  "email": "info@sanitex.lt",
  "phone": "+370 5 234 5678"
}
```

### 3. Supplier Prices API

#### List Supplier Prices
```http
GET /rest/v1/supplier_prices
```

**Query Parameters**:
- `product_id`: Filter by product
- `supplier_id`: Filter by supplier
- `preferred`: Filter by preferred status

**Response**:
```json
[
  {
    "id": "uuid",
    "product_id": "uuid",
    "supplier_id": "uuid",
    "price": 19.13,
    "price_excl_vat": 19.13,
    "price_incl_vat": 23.15,
    "vat_rate": 21,
    "currency": "EUR",
    "preferred": true,
    "last_updated": "2025-08-26T20:00:00Z",
    "invoice_id": "uuid"
  }
]
```

#### Create Supplier Price
```http
POST /rest/v1/supplier_prices
```

**Request Body**:
```json
{
  "product_id": "uuid",
  "supplier_id": "uuid",
  "price": 19.13,
  "price_excl_vat": 19.13,
  "price_incl_vat": 23.15,
  "vat_rate": 21,
  "currency": "EUR",
  "preferred": true,
  "invoice_id": "uuid"
}
```

### 4. Invoices API

#### List Invoices
```http
GET /rest/v1/invoices
```

**Query Parameters**:
- `supplier_id`: Filter by supplier
- `status`: Filter by status
- `date_from`: Filter by start date
- `date_to`: Filter by end date

**Response**:
```json
[
  {
    "id": "uuid",
    "supplier_id": "uuid",
    "invoice_number": "0009754",
    "invoice_date": "2025-08-22",
    "total_excl_vat": 63.29,
    "total_incl_vat": 76.58,
    "vat_amount": 13.29,
    "discount_amount": 0,
    "currency": "EUR",
    "status": "approved",
    "file_name": "invoice_0009754.pdf",
    "file_path": "invoices/2025/08/invoice_0009754.pdf",
    "file_size": 245760,
    "mime_type": "application/pdf",
    "extracted_data": {...},
    "processed_at": "2025-08-26T20:00:00Z",
    "processed_by": "user@example.com",
    "notes": "Processed successfully"
  }
]
```

#### Create Invoice
```http
POST /rest/v1/invoices
```

**Request Body**:
```json
{
  "supplier_id": "uuid",
  "invoice_number": "0009755",
  "invoice_date": "2025-08-26",
  "total_excl_vat": 45.50,
  "total_incl_vat": 55.06,
  "vat_amount": 9.56,
  "currency": "EUR",
  "status": "pending"
}
```

#### Update Invoice Status
```http
PATCH /rest/v1/invoices?id=eq.{invoice_id}
```

**Request Body**:
```json
{
  "status": "approved",
  "processed_at": "2025-08-26T20:00:00Z",
  "processed_by": "user@example.com"
}
```

### 5. Invoice Line Items API

#### List Line Items
```http
GET /rest/v1/invoice_line_items
```

**Query Parameters**:
- `invoice_id`: Filter by invoice
- `product_id`: Filter by product
- `needs_review`: Filter by review status

**Response**:
```json
[
  {
    "id": "uuid",
    "invoice_id": "uuid",
    "product_name": "Chicken Breast",
    "product_id": "uuid",
    "quantity": 5.5,
    "unit": "kg",
    "unit_price": 3.48,
    "total_price": 19.14,
    "vat_rate": 21,
    "description": "Fresh chicken breast fillets",
    "matched_product_id": "uuid",
    "match_confidence": 0.95,
    "needs_review": false,
    "notes": "Auto-matched successfully"
  }
]
```

### 6. Compliance API

#### Temperature Checks
```http
GET /rest/v1/temperature_checks
POST /rest/v1/temperature_checks
```

#### Cleaning Logs
```http
GET /rest/v1/cleaning_logs
POST /rest/v1/cleaning_logs
```

#### Equipment Checks
```http
GET /rest/v1/equipment_checks
POST /rest/v1/equipment_checks
```

### 7. Tech Cards API

#### List Tech Cards
```http
GET /rest/v1/tech_cards
```

#### Create Tech Card
```http
POST /rest/v1/tech_cards
```

**Request Body**:
```json
{
  "name": "Classic Burger",
  "notes": "Traditional beef burger recipe",
  "ingredients": [
    {
      "product_id": "uuid",
      "netto_qty": 0.15,
      "unit": "kg",
      "yield_pct": 100,
      "notes": "Beef patty"
    }
  ]
}
```

## Real-time Subscriptions

### Subscribe to Changes
```javascript
const subscription = supabase
  .channel('products')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'products' },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()
```

### Channel Types
- `products`: Product inventory changes
- `supplier_prices`: Price updates
- `invoices`: Invoice status changes
- `compliance`: Compliance log updates

## File Storage API

### Upload File
```http
POST /storage/v1/object/invoices/{file_path}
```

**Headers**:
```http
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Form Data**:
- `file`: File to upload
- `metadata`: Optional file metadata

### Download File
```http
GET /storage/v1/object/invoices/{file_path}
```

### Delete File
```http
DELETE /storage/v1/object/invoices/{file_path}
```

## Error Handling

### Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details",
  "hint": "Helpful suggestion"
}
```

### Common Error Codes
- `PGRST116`: Resource not found
- `PGRST301`: Invalid request
- `PGRST302`: Unauthorized
- `PGRST303`: Forbidden
- `PGRST304`: Conflict
- `PGRST500`: Internal server error

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

## Rate Limiting

### Limits
- **Authenticated Users**: 1000 requests per hour
- **File Uploads**: 10 files per hour
- **Real-time Connections**: 5 concurrent connections

### Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Pagination

### Pagination Headers
```http
Content-Range: 0-99/1000
```

### Pagination Parameters
- `limit`: Number of records per page (default: 1000)
- `offset`: Number of records to skip
- `order`: Sort order for consistent pagination

## Filtering and Sorting

### Filter Operators
- `eq`: Equal to
- `neq`: Not equal to
- `gt`: Greater than
- `gte`: Greater than or equal to
- `lt`: Less than
- `lte`: Less than or equal to
- `like`: Pattern matching
- `ilike`: Case-insensitive pattern matching
- `in`: Value in array
- `is`: IS NULL or IS NOT NULL

### Examples
```http
# Filter products by category
GET /rest/v1/products?category=eq.Meat

# Filter by price range
GET /rest/v1/supplier_prices?price_excl_vat=gte.10&price_excl_vat=lte.50

# Search by name pattern
GET /rest/v1/products?name=ilike.*chicken*

# Multiple filters
GET /rest/v1/products?category=eq.Meat&quantity=gt.5
```

### Sorting
```http
# Sort by name ascending
GET /rest/v1/products?order=name.asc

# Sort by multiple fields
GET /rest/v1/products?order=category.asc,name.asc

# Sort by created date descending
GET /rest/v1/products?order=created_at.desc
```

## Data Validation

### Required Fields
- **Products**: `sku`, `name`, `unit`
- **Suppliers**: `name`
- **Supplier Prices**: `product_id`, `supplier_id`, `price_excl_vat`, `price_incl_vat`, `vat_rate`
- **Invoices**: `supplier_id`, `invoice_number`, `invoice_date`, `total_excl_vat`, `total_incl_vat`

### Field Constraints
- **SKU**: Unique, alphanumeric with hyphens
- **Units**: Must be valid metric units (pcs, kg, g, l, ml)
- **Quantities**: Non-negative numbers
- **VAT Rates**: 0-100 percentage values
- **Email**: Valid email format
- **Phone**: International phone format

## Webhooks (Future)

### Webhook Events
- `product.created`: New product added
- `product.updated`: Product modified
- `supplier_price.updated`: Price changed
- `invoice.status_changed`: Invoice status updated
- `low_stock.alert`: Product below minimum stock

### Webhook Format
```json
{
  "event": "product.created",
  "timestamp": "2025-08-26T20:00:00Z",
  "data": {
    "id": "uuid",
    "sku": "NEW-001",
    "name": "New Product"
  }
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)

// Create product
const { data, error } = await supabase
  .from('products')
  .insert({
    sku: 'NEW-001',
    name: 'New Product',
    unit: 'kg',
    quantity: 10
  })

// Query with filters
const { data, error } = await supabase
  .from('supplier_prices')
  .select('*, products(name), suppliers(name)')
  .eq('preferred', true)
  .order('last_updated', { ascending: false })
```

### Python
```python
from supabase import create_client

supabase = create_client(url, key)

# Create supplier
data = supabase.table('suppliers').insert({
    'name': 'New Supplier',
    'email': 'info@newsupplier.lt'
}).execute()

# Query products
data = supabase.table('products').select('*').eq('category', 'Meat').execute()
```

## Testing

### Test Endpoints
- **Development**: `https://dev-project.supabase.co`
- **Staging**: `https://staging-project.supabase.co`
- **Production**: `https://prod-project.supabase.co`

### Test Data
- **Sample Products**: Pre-loaded test products
- **Sample Suppliers**: Test supplier accounts
- **Sample Invoices**: Test invoice files
- **Test Users**: Development user accounts

### Postman Collection
Import the provided Postman collection for testing all endpoints with pre-configured authentication and sample requests.
