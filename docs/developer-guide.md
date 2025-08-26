# Developer Guide - Criminal Kitchen

## Development Environment Setup

### Prerequisites
- **Node.js**: Version 18+ (LTS recommended)
- **npm**: Version 9+ or yarn
- **Git**: Version control system
- **Code Editor**: VS Code recommended with extensions
- **Browser**: Chrome/Edge for development tools

### Initial Setup
```bash
# Clone the repository
git clone https://github.com/rokas2025/criminal-kitchen.git
cd criminal-kitchen

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

### Environment Variables
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration
VITE_OPENAI_API_KEY=your_openai_api_key

# Development Settings
VITE_APP_ENV=development
VITE_DEBUG_MODE=true
```

## Project Structure

### Directory Organization
```
src/
├── components/          # Reusable UI components
│   ├── Table.tsx       # Data table component
│   ├── Select.tsx      # Dropdown component
│   ├── SearchInput.tsx # Search input component
│   ├── Card.tsx        # Content container
│   ├── Toast.tsx       # Notification system
│   └── ConfirmDialog.tsx # Confirmation dialogs
├── pages/              # Route-based page components
│   ├── InventoryPage.tsx
│   ├── SupplierPricesPage.tsx
│   ├── InvoicesPage.tsx
│   └── InvoiceReviewPage.tsx
├── inventory/          # Inventory-specific components
│   ├── ProductList.tsx
│   └── ProductForm.tsx
├── suppliers/          # Supplier management components
│   ├── SupplierList.tsx
│   ├── SupplierForm.tsx
│   └── SupplierPricingTable.tsx
├── data/              # Data layer and business logic
│   ├── types.ts       # TypeScript interfaces
│   └── store.ts       # Supabase data operations
├── services/          # External service integrations
│   ├── invoiceParser.ts # OpenAI invoice processing
│   └── pos.ts         # POS integration stubs
├── utils/             # Utility functions
│   ├── format.ts      # Data formatting utilities
│   ├── validators.ts  # Data validation
│   └── id.ts          # ID generation utilities
├── lib/               # Third-party configurations
│   └── supabase.ts    # Supabase client setup
├── hooks/             # Custom React hooks
├── styles/            # Global styles and Tailwind config
└── App.tsx            # Main application component
```

### Key Files
- **`src/App.tsx`**: Main application component and routing
- **`src/data/store.ts`**: Central data access layer
- **`src/data/types.ts`**: TypeScript type definitions
- **`src/lib/supabase.ts`**: Supabase client configuration
- **`src/services/invoiceParser.ts`**: AI invoice processing logic

## Development Workflow

### Code Style and Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Conventional Commits**: Git commit message format

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature description"

# Push and create pull request
git push origin feature/new-feature
```

### Testing Strategy
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API and data layer testing
- **E2E Tests**: User workflow testing
- **Manual Testing**: UI and user experience validation

## Component Development

### Component Structure
```typescript
import React, { useState, useEffect } from 'react';
import { useToast } from '../hooks/useToast';
import type { ComponentProps } from '../types';

interface ComponentProps {
  // Props interface
}

export const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // State management
  const [state, setState] = useState<StateType>(initialState);
  
  // Hooks and effects
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  // Event handlers
  const handleAction = () => {
    // Action logic
  };
  
  // Render
  return (
    <div className="component">
      {/* Component content */}
    </div>
  );
};
```

### Component Guidelines
- **Single Responsibility**: Each component has one clear purpose
- **Props Interface**: Define clear prop interfaces
- **State Management**: Use appropriate state management patterns
- **Error Handling**: Implement proper error boundaries
- **Accessibility**: Follow WCAG guidelines

### Styling with TailwindCSS
```typescript
// Utility-first approach
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200">
  <h2 className="text-lg font-semibold text-gray-900">Title</h2>
  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
    Action
  </button>
</div>

// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>

// Dark mode support
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  {/* Dark mode compatible */}
</div>
```

## Data Layer Development

### Supabase Integration
```typescript
// Client configuration
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Data operations
export async function createProduct(product: Omit<Product, 'id'>): Promise<Product> {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();
    
    if (error) throw error;
    return mapSupabaseRowToProduct(data);
  } catch (error) {
    handleSupabaseError(error, 'create product');
    throw error;
  }
}
```

### Type Safety
```typescript
// Database types
export interface Product {
  id: string;
  sku: string;
  name: string;
  unit: Unit;
  quantity: number;
  minStock?: number;
  category?: string;
  notes?: string;
}

// Supabase row mapping
function mapSupabaseRowToProduct(row: any): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    unit: row.unit as Unit,
    quantity: Number(row.quantity),
    minStock: row.min_stock ? Number(row.min_stock) : undefined,
    category: row.category || undefined,
    notes: row.notes || undefined,
  };
}
```

### Error Handling
```typescript
function handleSupabaseError(error: any, operation: string): void {
  console.error(`Supabase error during ${operation}:`, error);
  
  if (error.code === '23505') {
    throw new Error(`Duplicate entry: ${error.detail}`);
  }
  
  if (error.code === '23514') {
    throw new Error(`Validation failed: ${error.detail}`);
  }
  
  throw new Error(`Failed to ${operation}: ${error.message}`);
}
```

## Service Integration

### OpenAI API Integration
```typescript
export async function parseInvoice(file: File): Promise<InvoiceProcessingResult> {
  try {
    // Convert file to base64
    const base64Image = await fileToBase64(file);
    
    // Prepare OpenAI request
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a highly accurate invoice data extraction specialist..."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this invoice image with EXTREME PRECISION..."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${file.type};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0,
      response_format: { type: "json_object" }
    });
    
    return parseOpenAIResponse(response);
  } catch (error) {
    throw new Error(`Failed to parse invoice: ${error.message}`);
  }
}
```

### File Upload Service
```typescript
export async function uploadInvoiceFile(
  file: File, 
  invoiceId: string
): Promise<string> {
  try {
    const filePath = `invoices/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${file.name}`;
    
    const { error } = await supabase.storage
      .from('invoices')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) throw error;
    
    return filePath;
  } catch (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}
```

## State Management

### React Hooks Pattern
```typescript
// Custom hook for data fetching
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadProducts();
  }, []);
  
  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await listProducts();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      const newProduct = await createProduct(product);
      setProducts(prev => [...prev, newProduct]);
      return newProduct;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
  
  return { products, loading, error, addProduct, loadProducts };
}
```

### Context for Global State
```typescript
// App context
interface AppContextType {
  user: User | null;
  suppliers: Supplier[];
  loading: boolean;
  refreshSuppliers: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Context value
  const value: AppContextType = {
    user,
    suppliers,
    loading,
    refreshSuppliers: async () => {
      const data = await listSuppliers();
      setSuppliers(data);
    }
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
```

## Performance Optimization

### React Optimization
```typescript
// Memoization for expensive calculations
const filteredProducts = useMemo(() => {
  return products.filter(product => {
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (categoryFilter && product.category !== categoryFilter) {
      return false;
    }
    return true;
  });
}, [products, searchQuery, categoryFilter]);

// Callback memoization
const handleDelete = useCallback(async (id: string) => {
  try {
    await deleteProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  } catch (error) {
    showError('Failed to delete product');
  }
}, []);
```

### Data Fetching Optimization
```typescript
// Debounced search
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    setSearchQuery(query);
  }, 300),
  []
);

// Pagination for large datasets
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(50);

const loadProducts = async () => {
  const data = await listProducts({
    page,
    pageSize,
    search: searchQuery,
    category: categoryFilter
  });
  setProducts(data);
};
```

## Testing

### Unit Testing Setup
```typescript
// Component testing
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductForm } from '../ProductForm';

describe('ProductForm', () => {
  it('should submit form with valid data', async () => {
    const mockSubmit = jest.fn();
    
    render(<ProductForm onSubmit={mockSubmit} />);
    
    fireEvent.change(screen.getByLabelText('SKU'), {
      target: { value: 'TEST-001' }
    });
    
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Test Product' }
    });
    
    fireEvent.click(screen.getByText('Save'));
    
    expect(mockSubmit).toHaveBeenCalledWith({
      sku: 'TEST-001',
      name: 'Test Product',
      unit: 'pcs',
      quantity: 0
    });
  });
});
```

### Integration Testing
```typescript
// API testing
describe('Product API', () => {
  it('should create and retrieve product', async () => {
    const productData = {
      sku: 'TEST-001',
      name: 'Test Product',
      unit: 'pcs' as const,
      quantity: 10
    };
    
    const created = await createProduct(productData);
    expect(created.id).toBeDefined();
    
    const retrieved = await getProduct(created.id);
    expect(retrieved).toEqual(created);
  });
});
```

## Deployment

### Build Process
```bash
# Development build
npm run build:dev

# Production build
npm run build

# Preview build
npm run preview
```

### Environment Configuration
```typescript
// Environment-specific configuration
const config = {
  development: {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL_DEV,
    supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY_DEV,
    openaiKey: import.meta.env.VITE_OPENAI_API_KEY_DEV
  },
  production: {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL_PROD,
    supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY_PROD,
    openaiKey: import.meta.env.VITE_OPENAI_API_KEY_PROD
  }
};

const env = import.meta.env.VITE_APP_ENV || 'development';
export const appConfig = config[env];
```

### Vercel Deployment
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "env": {
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "VITE_OPENAI_API_KEY": "@openai_api_key"
  }
}
```

## Debugging and Troubleshooting

### Development Tools
- **React DevTools**: Component inspection and state debugging
- **Redux DevTools**: State management debugging
- **Network Tab**: API request/response inspection
- **Console Logging**: Strategic console.log placement

### Common Issues
```typescript
// TypeScript errors
// Solution: Check type definitions and interfaces

// Supabase connection issues
// Solution: Verify environment variables and network

// Component rendering issues
// Solution: Check props and state management

// Performance issues
// Solution: Use React DevTools Profiler
```

### Debug Patterns
```typescript
// Debug logging
const debugLog = (message: string, data?: any) => {
  if (import.meta.env.DEV) {
    console.log(`[DEBUG] ${message}`, data);
  }
};

// Error boundaries
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error reporting service
  }
}
```

## Contributing Guidelines

### Code Review Process
1. **Self-Review**: Review your own code before submitting
2. **Peer Review**: Request review from team members
3. **Automated Checks**: Ensure all tests pass and linting is clean
4. **Documentation**: Update relevant documentation

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements in production code
```

### Development Standards
- **Code Quality**: Maintain high code quality standards
- **Performance**: Consider performance implications
- **Security**: Follow security best practices
- **Accessibility**: Ensure accessibility compliance
- **Testing**: Maintain good test coverage
