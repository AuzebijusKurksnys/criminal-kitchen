# Criminal Kitchen - Restaurant Management Platform

**"Šefas. Virtuvė"** - A comprehensive kitchen management platform for restaurants, built with React, TypeScript, and modern web technologies.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

The application will be available at `http://localhost:5173`

## Environment

Set Supabase credentials via Vite env vars (Vercel → Project Settings → Environment Variables):

```
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Tech Overview

### Core Technologies
- **React 18** - Modern UI library with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript for better development experience
- **Vite** - Fast build tool and development server
- **TailwindCSS** - Utility-first CSS framework for rapid styling
- **React Router DOM** - Client-side routing
- **Zod** - Runtime type validation for forms and data
- **Date-fns** - Modern date utility library

### Architecture
- **Component-based**: Reusable UI components with clear separation of concerns
- **Type-safe**: Full TypeScript coverage with strict type checking
- **Responsive**: Mobile-first design with TailwindCSS
- **Modular**: Clean module boundaries ready for scaling
- **Data Layer**: Abstracted storage layer (currently localStorage, ready for API)

## Folder Structure

```
src/
├── App.tsx                 # Main app component
├── main.tsx               # React entry point
├── index.css              # Global styles and Tailwind imports
├── router.tsx             # React Router configuration
├── components/            # Reusable UI components
│   ├── NavBar.tsx
│   ├── SearchInput.tsx
│   ├── Select.tsx
│   ├── Table.tsx
│   ├── Card.tsx
│   ├── Toast.tsx
│   └── ConfirmDialog.tsx
├── pages/                 # Main page components
│   ├── InventoryPage.tsx
│   ├── SupplierPricesPage.tsx
│   ├── TechCardsPage.tsx      # Skeleton
│   ├── JournalsPage.tsx       # Skeleton
│   └── ReportsPage.tsx        # Skeleton
├── inventory/             # Product management
│   ├── ProductList.tsx
│   └── ProductForm.tsx
├── suppliers/             # Supplier management
│   ├── SupplierList.tsx
│   ├── SupplierForm.tsx
│   ├── SupplierPricingTable.tsx
│   └── SupplierPriceForm.tsx
├── techcards/             # Recipe management (skeleton)
│   ├── TechCardList.tsx
│   └── TechCardForm.tsx
├── journals/              # Compliance logging (skeleton)
│   ├── JournalList.tsx
│   └── JournalForm.tsx
├── data/                  # Data layer and types
│   ├── types.ts           # TypeScript interfaces
│   ├── store.ts           # Data storage abstraction
│   ├── mockData.ts        # Sample data
│   └── constants.ts       # App constants
├── utils/                 # Utility functions
│   ├── validators.ts      # Zod validation schemas
│   ├── format.ts          # Formatting helpers
│   └── id.ts              # ID generation
└── integrations/          # External service stubs
    ├── pos.ts             # POS system integration
    └── suppliersAI.ts     # AI-powered features
```

## Data Model

### Core Entities

```typescript
// Product inventory item
type Product = {
  id: string;
  sku: string;
  name: string;
  unit: 'pcs' | 'kg' | 'g' | 'l' | 'ml';
  quantity: number;
  minStock?: number;
  category?: string;
  notes?: string;
}

// Supplier information
type Supplier = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

// Product pricing from suppliers
type SupplierPrice = {
  id: string;
  productId: string;
  supplierId: string;
  price: number;
  currency: 'EUR' | 'USD' | 'GBP';
  lastUpdated: string;
  preferred?: boolean;
}

// Recipe with ingredients (skeleton)
type TechCard = {
  id: string;
  name: string;
  items: TechCardIngredient[];
  notes?: string;
}

// Journal entry types (skeleton)
type TemperatureCheck = {
  id: string;
  location: string;
  valueC: number;
  userName: string;
  timestamp: string;
  notes?: string;
}
```

### Data Storage

Currently uses **localStorage** with a clean abstraction layer:

```typescript
// Example store functions
listProducts(): Product[]
createProduct(product: Omit<Product, 'id'>): Product
updateProduct(product: Product): Product
deleteProduct(id: string): boolean
getPreferredSupplierPrice(productId: string): SupplierPrice | undefined
```

## Current Features (MVP)

### ✅ Inventory Management
- Complete CRUD operations for products
- Search and filtering by name, SKU, category, unit
- Stock level tracking with low stock indicators
- Product categories and detailed information
- Data validation and error handling

### ✅ Supplier & Pricing Management
- Supplier CRUD operations
- Product-specific pricing from multiple suppliers
- Preferred supplier selection (one per product)
- Currency support (EUR, USD, GBP)
- Price history tracking

### 🚧 Tech Cards (Skeleton)
- Basic recipe data model
- Cost calculation using preferred supplier prices
- Suggested pricing with configurable markup multiplier
- Margin calculation and display
- Ready for full implementation

### 🚧 Journals (Skeleton)
- Temperature check logging
- Cleaning log tracking
- Equipment check recording
- Basic compliance monitoring
- Extensible for full compliance features

### 🚧 Reports (Skeleton)
- Report structure and categorization
- Export format planning (PDF, Excel, CSV)
- Ready for implementation with data visualization

## How to Replace store.ts with Supabase

The current localStorage implementation can be easily replaced with Supabase:

### 1. Install Supabase Client
```bash
npm install @supabase/supabase-js
```

### 2. Create Supabase Client
```typescript
// src/data/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### 3. Update Store Functions
```typescript
// Replace localStorage with Supabase calls
export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
  
  if (error) throw error
  return data || []
}

export async function createProduct(product: Omit<Product, 'id'>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

### 4. Database Schema
```sql
-- Create tables in Supabase
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity DECIMAL NOT NULL DEFAULT 0,
  min_stock DECIMAL,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE supplier_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  price DECIMAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  preferred BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Add Row Level Security (RLS)
```sql
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_prices ENABLE ROW LEVEL SECURITY;

-- Create policies (example for multi-tenant support)
CREATE POLICY "Users can view their tenant's products" ON products
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

## Future Roadmap

### Phase 2: Enhanced Features
- **POS Integration**: Real-time sales data from SmartOn+ and other systems
- **AI-Powered Imports**: OpenAI embeddings for supplier item matching
- **Advanced Recipes**: Full tech card management with yield calculations
- **Purchase Orders**: Automated PO generation and supplier communications

### Phase 3: Analytics & Automation
- **Variance Reporting**: Expected vs actual stock consumption analysis
- **Reconciliation**: Morning/evening weighings with automated variance detection
- **Smart Alerts**: Low stock, margin alerts, temperature anomalies
- **Predictive Analytics**: Demand forecasting and optimal ordering

### Phase 4: Enterprise Features
- **Multi-Restaurant**: Complete tenant isolation and management
- **Role-Based Access**: Granular permissions for Admin/Manager/Staff
- **Audit Logging**: Complete change tracking and compliance reporting
- **API Integration**: RESTful API for third-party integrations

### Phase 5: Advanced Compliance
- **Scheduled Checks**: Automated compliance scheduling and assignments
- **Photo Documentation**: Image capture for compliance evidence
- **Regulatory Reporting**: Automated health department report generation
- **Quality Management**: HACCP and food safety protocol enforcement

## Sample Data

The application includes sample data for "Little Big Pub":

- **Products**: Chicken Breast, Wheat Flour, Aroma Hops, Beef Tenderloin, Sea Salt
- **Suppliers**: Baltic Foods UAB, FreshPro LT, Brewmaster Supplies
- **Pricing**: Multiple supplier prices with preferred supplier relationships
- **Configuration**: EUR currency, 4.0x markup multiplier

## Development Notes

### Code Quality
- **TypeScript Strict Mode**: Full type safety with strict compiler options
- **ESLint Configuration**: Code quality and consistency enforcement
- **Component Props**: Detailed TypeScript interfaces for all component props
- **Error Handling**: Comprehensive error handling with user feedback

### Performance
- **React 18 Features**: Concurrent rendering and automatic batching
- **Code Splitting**: Ready for route-based code splitting
- **Optimized Bundles**: Vite's optimized production builds
- **Efficient Re-renders**: Proper React patterns to minimize re-renders

### Accessibility
- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **ARIA Labels**: Proper semantic markup and screen reader support
- **Focus Management**: Logical focus flow and visual indicators
- **Color Contrast**: TailwindCSS ensures proper contrast ratios

### Testing Ready
- **Component Architecture**: Easy to unit test with clear interfaces
- **Separation of Concerns**: Business logic separated from UI components
- **Mock Data**: Comprehensive test data available
- **Store Abstraction**: Easy to mock for testing

---

**Built for Little Big Pub and restaurants everywhere.** 🍺🍴

For questions or support, contact the development team.
