import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  listProducts,
  updateProduct,
  deleteProduct,
  listSupplierPrices,
  updateSupplierPrice,
} from '../data/store';

export function AdminMergeDippers() {
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const append = (line: string) => setLog(prev => [...prev, line]);

  useEffect(() => {
    const run = async () => {
      setRunning(true);
      try {
        const canonicalName = 'Bulvės „Dippers“ 4x2,5 kg, Lamb Weston, šaldytos';
        append('Loading products...');
        const products = await listProducts();

        const candidateRegex = /bulv[ėe]s.*(dipp|diper|diger|digger)/i;
        const candidates = products.filter(p => candidateRegex.test(p.name));
        if (candidates.length === 0) {
          append('No candidates found.');
          setDone(true);
          return;
        }

        let canonical = candidates.find(p => p.name.trim() === canonicalName.trim());
        if (!canonical) {
          // Pick the longest name as fallback
          canonical = candidates.reduce((a, b) => (a.name.length >= b.name.length ? a : b));
          append(`Canonical not found by exact name. Using fallback: ${canonical.name}`);
        } else {
          append(`Canonical found: ${canonical.name}`);
        }

        // Ensure canonical has correct name and unit
        const desiredUnit = 'kg' as const;
        if (canonical.name !== canonicalName || canonical.unit !== desiredUnit) {
          append('Updating canonical name/unit...');
          canonical = await updateProduct({ ...canonical, name: canonicalName, unit: desiredUnit });
        }

        // Merge others into canonical
        let totalQuantityToAdd = 0;
        let movedSupplierPrices = 0;
        for (const p of candidates) {
          if (p.id === canonical.id) continue;
          append(`Merging ${p.name} (${p.id}) into canonical...`);

          // Move supplier prices
          const prices = await listSupplierPrices(p.id);
          for (const price of prices) {
            await updateSupplierPrice({ ...price, productId: canonical.id });
            movedSupplierPrices++;
          }

          // Re-link invoice line items product_id and product_name
          const { error } = await supabase
            .from('invoice_line_items')
            .update({ product_id: canonical.id, product_name: canonicalName })
            .eq('product_id', p.id);
          if (error) append(`Warning: failed to update line items for ${p.id}: ${error.message}`);

          // Sum quantity and delete duplicate product
          totalQuantityToAdd += p.quantity || 0;
          await deleteProduct(p.id);
          append(`Deleted duplicate product ${p.id}.`);
        }

        // Update canonical quantity once
        if (totalQuantityToAdd > 0) {
          append(`Adding ${totalQuantityToAdd} to canonical quantity...`);
          await updateProduct({ ...canonical, quantity: canonical.quantity + totalQuantityToAdd });
        }

        append(`Done. Moved supplier prices: ${movedSupplierPrices}.`);
        setDone(true);
      } catch (e) {
        append(`Error: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setRunning(false);
      }
    };

    run();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 border rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold mb-4">Admin: Merge Dippers Products</h1>
      <p className="text-sm text-gray-600 mb-4">This one-time tool merges duplicate variants into the canonical product name and unit.</p>
      <div className="mb-4">
        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-200">{running ? 'Running' : done ? 'Completed' : 'Idle'}</span>
      </div>
      <pre className="text-sm bg-gray-800 p-3 rounded border max-h-96 overflow-auto whitespace-pre-wrap">{log.join('\n')}</pre>
    </div>
  );
}




