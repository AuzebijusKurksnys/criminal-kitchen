import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function AdminCleanup() {
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const append = (message: string) => {
    setLog((prev) => [...prev, message]);
    console.log(message);
  };

  const handleCleanup = async () => {
    setRunning(true);
    setLog([]);
    append('🗑️ Starting cleanup...');

    try {
      // Delete invoice line items first (foreign key constraint)
      append('Deleting invoice line items...');
      const { error: lineItemsError, count: lineItemsCount } = await supabase
        .from('invoice_line_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (lineItemsError) {
        append(`❌ Error deleting line items: ${lineItemsError.message}`);
      } else {
        append(`✅ Deleted ${lineItemsCount || 0} invoice line items`);
      }

      // Delete invoices
      append('Deleting invoices...');
      const { error: invoicesError, count: invoicesCount } = await supabase
        .from('invoices')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (invoicesError) {
        append(`❌ Error deleting invoices: ${invoicesError.message}`);
      } else {
        append(`✅ Deleted ${invoicesCount || 0} invoices`);
      }

      // Delete supplier prices
      append('Deleting supplier prices...');
      const { error: pricesError, count: pricesCount } = await supabase
        .from('supplier_prices')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (pricesError) {
        append(`❌ Error deleting supplier prices: ${pricesError.message}`);
      } else {
        append(`✅ Deleted ${pricesCount || 0} supplier prices`);
      }

      // Delete products
      append('Deleting products...');
      const { error: productsError, count: productsCount } = await supabase
        .from('products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (productsError) {
        append(`❌ Error deleting products: ${productsError.message}`);
      } else {
        append(`✅ Deleted ${productsCount || 0} products`);
      }

      append('');
      append('✨ Cleanup complete!');
      append('All invoices, products, and supplier prices have been deleted.');
      append('You can now start uploading fresh invoices.');
      setDone(true);
    } catch (e) {
      append(`❌ Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-gray-900 rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">
            🗑️ Database Cleanup
          </h1>
          <p className="text-gray-400">
            This will delete ALL invoices, products, and supplier prices from the database.
          </p>
          <p className="text-red-400 font-medium mt-2">
            ⚠️ Warning: This action cannot be undone!
          </p>
        </div>

        {!running && !done && (
          <button
            onClick={handleCleanup}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-medium"
          >
            🗑️ Delete All Data
          </button>
        )}

        {log.length > 0 && (
          <div className="mt-6 bg-gray-800 p-4 rounded-md h-96 overflow-y-auto text-sm text-gray-300 font-mono">
            {log.map((line, index) => (
              <p 
                key={index} 
                className={
                  line.startsWith('❌') ? 'text-red-400' : 
                  line.startsWith('✅') ? 'text-green-400' : 
                  line.startsWith('⚠️') ? 'text-yellow-400' : 
                  line.startsWith('✨') ? 'text-blue-400' : ''
                }
              >
                {line}
              </p>
            ))}
          </div>
        )}

        {done && (
          <div className="mt-6 text-center">
            <p className="text-lg font-medium text-green-400 mb-4">
              ✅ Database cleaned successfully!
            </p>
            <a 
              href="/invoices/batch-upload"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
            >
              📤 Start Uploading Invoices
            </a>
          </div>
        )}

        {running && (
          <div className="mt-6 text-center">
            <p className="text-lg font-medium text-blue-400">
              Processing... <span className="animate-spin inline-block">⟳</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

