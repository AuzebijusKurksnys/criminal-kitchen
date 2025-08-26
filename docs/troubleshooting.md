# Troubleshooting Guide - Criminal Kitchen

## Overview
This guide provides solutions to common issues encountered when using or developing Criminal Kitchen. It covers both user-facing problems and technical development issues.

## Quick Diagnosis

### System Status Check
1. **Database Connection**: Verify Supabase connectivity
2. **API Services**: Check OpenAI API status
3. **File Storage**: Confirm storage bucket access
4. **Authentication**: Verify user login status

### Common Error Patterns
- **Network Errors**: Connection timeouts, CORS issues
- **Authentication Errors**: Invalid tokens, expired sessions
- **Data Errors**: Validation failures, constraint violations
- **File Errors**: Upload failures, storage access denied

## User-Facing Issues

### 1. Login Problems

#### Can't Log In
**Symptoms**:
- Login form shows error
- Redirects back to login page
- "Invalid credentials" message

**Solutions**:
```typescript
// Check browser console for errors
// Verify Supabase URL and key
// Clear browser cache and cookies
// Check network connectivity
```

**Prevention**:
- Use strong passwords
- Enable 2FA if available
- Regular password updates
- Monitor login attempts

#### Session Expired
**Symptoms**:
- Sudden logout during use
- "Session expired" messages
- Need to re-authenticate frequently

**Solutions**:
```typescript
// Check token expiration settings
// Verify refresh token logic
// Clear expired tokens
// Re-login if necessary
```

### 2. Inventory Management Issues

#### Products Not Loading
**Symptoms**:
- Empty product list
- Loading spinner never stops
- Error messages in console

**Diagnosis**:
```typescript
// Check browser console for errors
// Verify database connection
// Check RLS policies
// Test API endpoints directly
```

**Solutions**:
1. **Database Connection**:
   ```sql
   -- Test connection
   SELECT COUNT(*) FROM products;
   
   -- Check RLS policies
   SELECT * FROM pg_policies WHERE tablename = 'products';
   ```

2. **API Testing**:
   ```bash
   # Test with curl
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        "https://your-project.supabase.co/rest/v1/products"
   ```

3. **Clear Cache**:
   ```typescript
   // Clear local storage
   localStorage.clear();
   
   // Refresh page
   window.location.reload();
   ```

#### Can't Add/Edit Products
**Symptoms**:
- Form submission fails
- Validation errors
- "Permission denied" messages

**Solutions**:
1. **Check Permissions**:
   ```sql
   -- Verify user permissions
   SELECT * FROM auth.users WHERE id = auth.uid();
   
   -- Check RLS policies
   SELECT * FROM pg_policies WHERE tablename = 'products';
   ```

2. **Validate Data**:
   ```typescript
   // Check required fields
   if (!product.sku || !product.name || !product.unit) {
     throw new Error('Missing required fields');
   }
   
   // Validate unit values
   const validUnits = ['pcs', 'kg', 'g', 'l', 'ml'];
   if (!validUnits.includes(product.unit)) {
     throw new Error('Invalid unit');
   }
   ```

3. **Check Constraints**:
   ```sql
   -- Verify unique constraints
   SELECT * FROM products WHERE sku = 'DUPLICATE-SKU';
   
   -- Check check constraints
   SELECT * FROM information_schema.check_constraints 
   WHERE constraint_name = 'products_unit_check';
   ```

### 3. Supplier Management Issues

#### Supplier Prices Not Updating
**Symptoms**:
- Price changes don't save
- "Preferred supplier" not working
- Price history not showing

**Diagnosis**:
```typescript
// Check console for errors
// Verify database transactions
// Check foreign key relationships
// Validate business logic
```

**Solutions**:
1. **Database Integrity**:
   ```sql
   -- Check foreign key relationships
   SELECT 
     sp.id,
     sp.product_id,
     sp.supplier_id,
     p.name as product_name,
     s.name as supplier_name
   FROM supplier_prices sp
   JOIN products p ON sp.product_id = p.id
   JOIN suppliers s ON sp.supplier_id = s.id;
   ```

2. **Business Logic**:
   ```typescript
   // Ensure only one preferred supplier per product
   if (supplierPrice.preferred) {
     await supabase
       .from('supplier_prices')
       .update({ preferred: false })
       .eq('product_id', supplierPrice.productId);
   }
   ```

3. **Transaction Handling**:
   ```typescript
   // Use database transactions for complex operations
   const { data, error } = await supabase.rpc('update_supplier_prices', {
     product_id: supplierPrice.productId,
     supplier_id: supplierPrice.supplierId,
     price: supplierPrice.price,
     preferred: supplierPrice.preferred
   });
   ```

### 4. Invoice Processing Issues

#### Invoice Upload Fails
**Symptoms**:
- File upload doesn't work
- "Upload failed" messages
- File size errors

**Diagnosis**:
```typescript
// Check file size and format
// Verify storage permissions
// Check network connectivity
// Validate file content
```

**Solutions**:
1. **File Validation**:
   ```typescript
   // Check file size (max 10MB)
   if (file.size > 10 * 1024 * 1024) {
     throw new Error('File too large. Maximum size is 10MB.');
   }
   
   // Check file format
   const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'];
   if (!allowedTypes.includes(file.type)) {
     throw new Error('Invalid file type. Use PDF, JPG, PNG, or HEIC.');
   }
   ```

2. **Storage Permissions**:
   ```sql
   -- Check storage bucket policies
   SELECT * FROM storage.policies WHERE bucket_id = 'invoices';
   
   -- Verify bucket exists
   SELECT * FROM storage.buckets WHERE id = 'invoices';
   ```

3. **Network Issues**:
   ```typescript
   // Implement retry logic
   const uploadWithRetry = async (file: File, maxRetries = 3) => {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await uploadFile(file);
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
       }
     }
   };
   ```

#### AI Extraction Fails
**Symptoms**:
- "Extraction failed" messages
- Incomplete data extraction
- Poor quality results

**Solutions**:
1. **Image Quality**:
   ```typescript
   // Ensure good image quality
   const minResolution = { width: 800, height: 600 };
   const img = new Image();
   img.onload = () => {
     if (img.width < minResolution.width || img.height < minResolution.height) {
       showWarning('Image resolution too low for accurate extraction');
     }
   };
   ```

2. **API Configuration**:
   ```typescript
   // Optimize OpenAI parameters
   const response = await openai.chat.completions.create({
     model: "gpt-4o",
     messages: [
       {
         role: "system",
         content: "You are a highly accurate invoice data extraction specialist..."
       }
     ],
     max_tokens: 4000,
     temperature: 0,
     response_format: { type: "json_object" }
   });
   ```

3. **Error Handling**:
   ```typescript
   // Implement fallback extraction
   try {
     const aiResult = await parseInvoiceWithAI(file);
     return aiResult;
   } catch (error) {
     console.warn('AI extraction failed, using manual input:', error);
     return await manualInvoiceInput();
   }
   ```

### 5. Data Synchronization Issues

#### Data Not Updating
**Symptoms**:
- Changes don't appear immediately
- Stale data displayed
- Real-time updates not working

**Solutions**:
1. **Real-time Subscriptions**:
   ```typescript
   // Subscribe to database changes
   const subscription = supabase
     .channel('products')
     .on('postgres_changes', 
       { event: '*', schema: 'public', table: 'products' },
       (payload) => {
         console.log('Change received!', payload);
         // Update local state
         updateProducts(payload);
       }
     )
     .subscribe();
   ```

2. **Manual Refresh**:
   ```typescript
   // Implement manual refresh
   const refreshData = async () => {
     setLoading(true);
     try {
       const data = await fetchData();
       setData(data);
     } catch (error) {
       showError('Failed to refresh data');
     } finally {
       setLoading(false);
     }
   };
   ```

3. **Optimistic Updates**:
   ```typescript
   // Update UI immediately, then sync with server
   const handleUpdate = async (id: string, changes: Partial<Product>) => {
     // Optimistic update
     setProducts(prev => prev.map(p => 
       p.id === id ? { ...p, ...changes } : p
     ));
     
     try {
       await updateProduct(id, changes);
     } catch (error) {
       // Revert on failure
       setProducts(prev => prev.map(p => 
         p.id === id ? { ...p, ...originalData } : p
       ));
       showError('Update failed');
     }
   };
   ```

## Technical Development Issues

### 1. Build and Compilation Errors

#### TypeScript Errors
**Common Issues**:
- Type mismatches
- Missing properties
- Incorrect imports

**Solutions**:
```typescript
// Fix type mismatches
const product: Product = {
  id: row.id,
  sku: row.sku,
  name: row.name,
  unit: row.unit as Unit, // Type assertion
  quantity: Number(row.quantity), // Convert to number
  // ... other properties
};

// Handle optional properties
const optionalField = row.optional_field || undefined;

// Use type guards
function isProduct(obj: any): obj is Product {
  return obj && typeof obj.sku === 'string' && typeof obj.name === 'string';
}
```

#### Build Failures
**Diagnosis**:
```bash
# Check TypeScript compilation
npm run type-check

# Check for linting errors
npm run lint

# Verify dependencies
npm ls

# Clear build cache
rm -rf dist node_modules/.cache
```

**Solutions**:
1. **Fix Type Errors**:
   ```typescript
   // Use proper types
   import type { Product, Supplier } from '../types';
   
   // Handle null/undefined values
   const quantity = row.quantity ?? 0;
   const category = row.category || undefined;
   ```

2. **Update Dependencies**:
   ```bash
   # Update packages
   npm update
   
   # Fix security vulnerabilities
   npm audit fix
   
   # Update major versions carefully
   npx npm-check-updates -u
   npm install
   ```

### 2. Database Connection Issues

#### Connection Failures
**Symptoms**:
- "Connection failed" errors
- Timeout errors
- Authentication failures

**Diagnosis**:
```typescript
// Test connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('Connection successful');
  } catch (error) {
    console.error('Connection failed:', error);
  }
};
```

**Solutions**:
1. **Environment Variables**:
   ```bash
   # Verify environment variables
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   
   # Check .env file
   cat .env.local
   ```

2. **Network Issues**:
   ```typescript
   // Implement connection retry
   const connectWithRetry = async (maxRetries = 3) => {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await testConnection();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
       }
     }
   };
   ```

3. **CORS Configuration**:
   ```sql
   -- Configure CORS in Supabase
   INSERT INTO auth.config (key, value) 
   VALUES ('cors_origins', '["http://localhost:5173", "https://yourdomain.com"]');
   ```

#### RLS Policy Issues
**Symptoms**:
- "Row-level security policy violation" errors
- Data not visible to users
- Permission denied errors

**Solutions**:
```sql
-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'products';

-- Create proper RLS policy
CREATE POLICY "Users can view their own products" ON products
  FOR SELECT USING (auth.uid() = user_id);

-- Enable RLS on table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

### 3. Performance Issues

#### Slow Loading
**Symptoms**:
- Long loading times
- Unresponsive UI
- Memory usage spikes

**Diagnosis**:
```typescript
// Performance monitoring
const measurePerformance = (operation: string) => {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    console.log(`${operation} took ${duration}ms`);
  };
};

// Use in components
useEffect(() => {
  const endMeasure = measurePerformance('Data loading');
  loadData().finally(endMeasure);
}, []);
```

**Solutions**:
1. **Data Pagination**:
   ```typescript
   // Implement pagination
   const [page, setPage] = useState(1);
   const [pageSize, setPageSize] = useState(50);
   
   const loadProducts = async () => {
     const { data } = await supabase
       .from('products')
       .select('*')
       .range((page - 1) * pageSize, page * pageSize - 1);
     
     setProducts(data || []);
   };
   ```

2. **Memoization**:
   ```typescript
   // Memoize expensive calculations
   const filteredProducts = useMemo(() => {
     return products.filter(product => {
       if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
         return false;
       }
       return true;
     });
   }, [products, searchQuery]);
   ```

3. **Lazy Loading**:
   ```typescript
   // Lazy load components
   const LazyComponent = lazy(() => import('./HeavyComponent'));
   
   // Use Suspense
   <Suspense fallback={<div>Loading...</div>}>
     <LazyComponent />
   </Suspense>
   ```

### 4. State Management Issues

#### State Synchronization
**Symptoms**:
- Inconsistent UI state
- Data not reflecting changes
- Multiple state sources

**Solutions**:
1. **Single Source of Truth**:
   ```typescript
   // Use centralized state
   const [products, setProducts] = useState<Product[]>([]);
   
   // Update state consistently
   const updateProduct = async (id: string, changes: Partial<Product>) => {
     const updated = await api.updateProduct(id, changes);
     setProducts(prev => prev.map(p => p.id === id ? updated : p));
   };
   ```

2. **State Normalization**:
   ```typescript
   // Normalize state structure
   interface NormalizedState {
     entities: {
       products: Record<string, Product>;
       suppliers: Record<string, Supplier>;
     };
     ids: {
       products: string[];
       suppliers: string[];
     };
   }
   ```

3. **Context for Global State**:
   ```typescript
   // Create context for shared state
   const AppContext = createContext<AppState | undefined>(undefined);
   
   export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
     const [state, setState] = useState<AppState>(initialState);
     
     return (
       <AppContext.Provider value={{ state, setState }}>
         {children}
       </AppContext.Provider>
     );
   };
   ```

## Debugging Tools and Techniques

### 1. Browser Developer Tools

#### Console Debugging
```typescript
// Strategic console logging
const debugLog = (message: string, data?: any) => {
  if (import.meta.env.DEV) {
    console.group(`🔍 ${message}`);
    console.log('Data:', data);
    console.trace('Stack trace');
    console.groupEnd();
  }
};

// Use in components
useEffect(() => {
  debugLog('Component mounted', { props, state });
}, []);
```

#### Network Tab
- Monitor API requests
- Check response times
- Verify request/response data
- Identify failed requests

#### React DevTools
- Inspect component hierarchy
- Monitor state changes
- Profile performance
- Debug hooks

### 2. Database Debugging

#### Query Logging
```sql
-- Enable query logging
SET log_statement = 'all';
SET log_min_duration_statement = 0;

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

#### Performance Analysis
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM products WHERE category = 'Meat';

-- Check table statistics
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables;
```

### 3. Error Tracking

#### Error Boundaries
```typescript
class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service
    logError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

#### Error Logging
```typescript
// Centralized error logging
const logError = (error: Error, context?: any) => {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // Send to logging service
  console.error('Error logged:', errorLog);
  
  // Store locally for debugging
  const errors = JSON.parse(localStorage.getItem('errorLog') || '[]');
  errors.push(errorLog);
  localStorage.setItem('errorLog', JSON.stringify(errors.slice(-10)));
};
```

## Prevention and Best Practices

### 1. Code Quality

#### Type Safety
```typescript
// Use strict TypeScript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}

// Proper error handling
const handleApiCall = async <T>(apiCall: () => Promise<T>): Promise<T> => {
  try {
    return await apiCall();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`API call failed: ${error.message}`);
    }
    throw new Error('Unknown error occurred');
  }
};
```

#### Testing
```typescript
// Unit tests for critical functions
describe('Product validation', () => {
  it('should validate required fields', () => {
    const product = { sku: '', name: '', unit: 'invalid' as any };
    expect(validateProduct(product)).toBeFalsy();
  });
  
  it('should accept valid product', () => {
    const product = { sku: 'TEST-001', name: 'Test Product', unit: 'pcs' as const };
    expect(validateProduct(product)).toBeTruthy();
  });
});
```

### 2. Monitoring and Alerting

#### Health Checks
```typescript
// Implement health check endpoint
const healthCheck = async () => {
  try {
    // Check database connection
    await supabase.from('products').select('count').limit(1);
    
    // Check OpenAI API
    await openai.models.list();
    
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
  }
};
```

#### Performance Monitoring
```typescript
// Monitor key metrics
const monitorPerformance = () => {
  // Page load time
  window.addEventListener('load', () => {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    console.log(`Page load time: ${loadTime}ms`);
  });
  
  // API response times
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const start = performance.now();
    const response = await originalFetch(...args);
    const duration = performance.now() - start;
    console.log(`API call took ${duration}ms`);
    return response;
  };
};
```

## Getting Help

### 1. Self-Service Resources
- **Documentation**: Check this troubleshooting guide
- **GitHub Issues**: Search existing issues
- **Stack Overflow**: Look for similar problems
- **Community Forums**: Ask the community

### 2. Escalation Process
1. **Document the Issue**: Screenshots, error messages, steps to reproduce
2. **Check Logs**: Browser console, network tab, server logs
3. **Research Solutions**: Search documentation and community resources
4. **Contact Support**: Provide detailed information about the issue

### 3. Issue Reporting Template
```markdown
## Issue Description
Brief description of what's not working

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Browser: Chrome 120.0.6099.109
- OS: Windows 11
- App Version: 1.0.0

## Error Messages
Copy any error messages from console

## Screenshots
Attach relevant screenshots

## Additional Context
Any other relevant information
```

## Conclusion
This troubleshooting guide covers the most common issues you may encounter. Always start with the quick diagnosis steps and work through the solutions systematically. If you continue to experience issues, document everything thoroughly and reach out for support.
