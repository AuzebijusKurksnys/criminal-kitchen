# Database Schema Documentation

## Overview
The Criminal Kitchen database is built on PostgreSQL with Supabase, featuring a normalized schema designed for kitchen management operations, supplier relationships, and compliance tracking.

## Database Tables

### 1. Products Table
**Purpose**: Core inventory management for all products/ingredients

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('pcs', 'kg', 'g', 'l', 'ml')),
  quantity NUMERIC DEFAULT 0,
  min_stock NUMERIC,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints**:
- `products_unit_check`: Ensures units are valid (pcs, kg, g, l, ml)
- `products_sku_unique`: SKU must be unique across all products
- `products_quantity_check`: Quantity cannot be negative

**Business Rules**:
- SKU format: `CATEGORY-XXX` (e.g., CHICK-001, FLOUR-002)
- Units follow metric system standards
- Minimum stock triggers low stock alerts

### 2. Suppliers Table
**Purpose**: Vendor management and contact information

```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Business Rules**:
- Supplier names must be unique
- Email and phone are optional but recommended
- Used for invoice processing and price management

### 3. Supplier Prices Table
**Purpose**: Product pricing from different suppliers with VAT support

```sql
CREATE TABLE supplier_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL, -- Legacy field, use price_excl_vat
  price_excl_vat NUMERIC NOT NULL,
  price_incl_vat NUMERIC NOT NULL,
  vat_rate NUMERIC DEFAULT 21, -- Lithuanian standard VAT rate
  currency TEXT NOT NULL DEFAULT 'EUR',
  preferred BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  invoice_id UUID REFERENCES invoices(id)
);
```

**Constraints**:
- `supplier_prices_product_supplier_unique`: One price per product per supplier
- `supplier_prices_preferred_check`: Only one preferred supplier per product

**VAT Calculations**:
- `price_incl_vat = price_excl_vat * (1 + vat_rate / 100)`
- Default VAT rate: 21% (Lithuanian standard)
- Supports multiple currencies (EUR default)

### 4. Invoices Table
**Purpose**: Invoice management and processing status

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  total_excl_vat NUMERIC NOT NULL,
  total_incl_vat NUMERIC NOT NULL,
  vat_amount NUMERIC NOT NULL,
  discount_amount NUMERIC,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending',
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  extracted_data JSONB,
  processed_at TIMESTAMPTZ,
  processed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints**:
- `invoices_supplier_invoice_number_unique`: Unique invoice per supplier
- `invoices_status_check`: Status must be valid enum value

**Status Values**:
- `pending`: Uploaded, awaiting processing
- `processing`: AI extraction in progress
- `review`: Manual review required
- `approved`: Processed and inventory updated
- `rejected`: Failed processing or invalid data

### 5. Invoice Line Items Table
**Purpose**: Individual items within invoices

```sql
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_id UUID REFERENCES products(id),
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  vat_rate NUMERIC NOT NULL DEFAULT 21,
  description TEXT,
  matched_product_id UUID REFERENCES products(id),
  match_confidence NUMERIC,
  needs_review BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Business Rules**:
- `quantity * unit_price = total_price`
- VAT rate applied per line item
- Product matching with confidence scoring
- Review flag for manual intervention

### 6. Compliance Tables

#### Temperature Checks
```sql
CREATE TABLE temperature_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL,
  value_c NUMERIC NOT NULL,
  user_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Cleaning Logs
```sql
CREATE TABLE cleaning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('done', 'missed')),
  user_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Equipment Checks
```sql
CREATE TABLE equipment_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'issue')),
  user_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7. Tech Cards Table
**Purpose**: Recipe management and cost calculation

```sql
CREATE TABLE tech_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Tech Card Ingredients
```sql
CREATE TABLE tech_card_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_card_id UUID NOT NULL REFERENCES tech_cards(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  netto_qty NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  yield_pct NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Database Relationships

### Foreign Key Constraints
```
products ←── supplier_prices → suppliers
   ↑              ↑
   │              │
   └── invoice_line_items ←── invoices → suppliers
```

### Cascade Delete Rules
- **Supplier Prices**: Delete when product or supplier is deleted
- **Invoice Line Items**: Delete when invoice is deleted
- **Tech Card Ingredients**: Delete when tech card is deleted

## Row Level Security (RLS) Policies

### Products Table
```sql
CREATE POLICY "Users can view their own products" ON products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Supplier Prices Table
```sql
CREATE POLICY "Users can view supplier prices for their products" ON supplier_prices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = supplier_prices.product_id 
      AND products.user_id = auth.uid()
    )
  );
```

### Invoices Table
```sql
CREATE POLICY "Users can view their own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);
```

## Indexes and Performance

### Primary Indexes
- **Primary Keys**: All tables have UUID primary keys
- **Foreign Keys**: Indexed for join performance
- **Unique Constraints**: Automatically indexed

### Performance Indexes
```sql
-- Products table
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_quantity ON products(quantity);

-- Supplier prices table
CREATE INDEX idx_supplier_prices_product ON supplier_prices(product_id);
CREATE INDEX idx_supplier_prices_supplier ON supplier_prices(supplier_id);
CREATE INDEX idx_supplier_prices_preferred ON supplier_prices(preferred);

-- Invoices table
CREATE INDEX idx_invoices_supplier_date ON invoices(supplier_id, invoice_date);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
```

## Data Validation Rules

### Business Logic Constraints
1. **Product Units**: Must be valid metric units
2. **Quantities**: Cannot be negative
3. **VAT Rates**: Must be positive percentages
4. **Invoice Numbers**: Unique per supplier
5. **Preferred Suppliers**: Only one per product

### Check Constraints
```sql
-- Products
ALTER TABLE products ADD CONSTRAINT products_quantity_check 
  CHECK (quantity >= 0);

-- Supplier Prices
ALTER TABLE supplier_prices ADD CONSTRAINT supplier_prices_vat_rate_check 
  CHECK (vat_rate > 0 AND vat_rate <= 100);

-- Invoice Line Items
ALTER TABLE invoice_line_items ADD CONSTRAINT invoice_line_items_quantity_check 
  CHECK (quantity > 0);
```

## Data Migration and Seeding

### Initial Data
- **Sample Products**: Common kitchen ingredients
- **Sample Suppliers**: Local food suppliers
- **Sample Prices**: Realistic pricing examples
- **Sample Invoices**: Test data for development

### Migration Scripts
- **Schema Updates**: Version-controlled migrations
- **Data Seeding**: Development and testing data
- **Constraint Updates**: Business rule modifications

## Backup and Recovery

### Backup Strategy
- **Daily Backups**: Automated database snapshots
- **Point-in-time Recovery**: WAL-based recovery
- **Cross-region Replication**: Disaster recovery
- **Encrypted Backups**: Security compliance

### Recovery Procedures
- **Database Restore**: Full database recovery
- **Table Recovery**: Individual table restoration
- **Data Validation**: Post-recovery verification
- **Rollback Procedures**: Failed migration recovery
