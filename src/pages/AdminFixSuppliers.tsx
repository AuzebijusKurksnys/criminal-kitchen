import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { listProducts, listSuppliers, setPreferredSupplier } from '../data/store';

export function AdminFixSuppliers() {
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const append = (msg: string) => {
    console.log(msg);
    setLog(prev => [...prev, msg]);
  };

  useEffect(() => {
    const run = async () => {
      setRunning(true);
      try {
        append('🔍 Loading products and suppliers...');
        const products = await listProducts();
        const suppliers = await listSuppliers();
        
        append(`Found ${products.length} products and ${suppliers.length} suppliers`);
        
        let fixed = 0;
        let skipped = 0;
        
        for (const product of products) {
          append(`\n📦 Processing: ${product.name}`);
          
          // Get all supplier prices for this product
          const { data: prices, error: pricesError } = await supabase
            .from('supplier_prices')
            .select('*, suppliers(name)')
            .eq('product_id', product.id);
          
          if (pricesError) {
            append(`   ❌ Error loading prices: ${pricesError.message}`);
            continue;
          }
          
          if (!prices || prices.length === 0) {
            append(`   ⚠️ No supplier prices found`);
            
            // Try to find which supplier this product came from via invoices
            const { data: lineItems } = await supabase
              .from('invoice_line_items')
              .select('invoice_id, invoices(supplier_id, suppliers(name))')
              .eq('product_id', product.id)
              .limit(1);
            
            if (lineItems && lineItems.length > 0) {
              const invoice = (lineItems[0] as any).invoices;
              const supplierId = invoice?.supplier_id;
              const supplierName = invoice?.suppliers?.name;
              
              if (supplierId) {
                append(`   🔍 Found supplier from invoice: ${supplierName}`);
                append(`   🔧 Creating supplier price and marking as preferred...`);
                
                // Create a supplier price entry (we don't have price data, so use 0)
                const { error: insertError } = await supabase
                  .from('supplier_prices')
                  .insert({
                    product_id: product.id,
                    supplier_id: supplierId,
                    price: 0,
                    price_excl_vat: 0,
                    price_incl_vat: 0,
                    vat_rate: 21,
                    currency: 'EUR',
                    preferred: true
                  });
                
                if (!insertError) {
                  append(`   ✅ Created supplier price for ${supplierName}`);
                  fixed++;
                } else {
                  append(`   ❌ Failed to create supplier price: ${insertError.message}`);
                }
              } else {
                append(`   ⚠️ Could not find supplier - skipping`);
                skipped++;
              }
            } else {
              append(`   ⚠️ No invoice history found - skipping`);
              skipped++;
            }
            continue;
          }
          
          // Check if any price is already marked as preferred
          const hasPreferred = prices.some((p: any) => p.preferred);
          
          if (hasPreferred) {
            const preferred = prices.find((p: any) => p.preferred);
            append(`   ✅ Already has preferred supplier: ${(preferred as any).suppliers?.name}`);
            skipped++;
            continue;
          }
          
          // No preferred supplier - set the first one as preferred
          const firstPrice = prices[0] as any;
          const supplierName = firstPrice.suppliers?.name || 'Unknown';
          
          append(`   🔧 Setting preferred supplier: ${supplierName}`);
          
          const success = await setPreferredSupplier(product.id, firstPrice.supplier_id);
          
          if (success) {
            append(`   ✅ Successfully set ${supplierName} as preferred`);
            fixed++;
          } else {
            append(`   ❌ Failed to set preferred supplier`);
          }
        }
        
        append(`\n✨ Migration complete!`);
        append(`   Fixed: ${fixed} products`);
        append(`   Skipped: ${skipped} products (already had preferred supplier)`);
        append(`   Total: ${products.length} products`);
        
        setDone(true);
      } catch (e) {
        append(`❌ Error: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setRunning(false);
      }
    };

    run();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-gray-900 rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">
            🔧 Fix Supplier Assignments
          </h1>
          <p className="text-gray-400">
            This utility will set the preferred supplier for all products that don't have one yet.
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
          {log.map((line, i) => (
            <div key={i} className={
              line.includes('❌') ? 'text-red-400' :
              line.includes('✅') ? 'text-green-400' :
              line.includes('⚠️') ? 'text-yellow-400' :
              line.includes('🔧') ? 'text-blue-400' :
              line.includes('✨') ? 'text-purple-400' :
              'text-gray-300'
            }>
              {line}
            </div>
          ))}
          {running && !done && (
            <div className="text-blue-400 animate-pulse">
              ⏳ Processing...
            </div>
          )}
        </div>

        {done && (
          <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <p className="text-green-400 font-medium">
              ✅ Migration complete! You can now close this page and refresh the Stock page to see the updated supplier folders.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

