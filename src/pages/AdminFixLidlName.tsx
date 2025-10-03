import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function AdminFixLidlName() {
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const append = (message: string) => {
    setLog((prev) => [...prev, message]);
    console.log(message);
  };

  const handleFix = async () => {
    setRunning(true);
    setLog([]);
    append('🔧 Starting Lidl supplier name fix...');

    try {
      // Find the LiDL supplier
      append('Looking for LiDL supplier...');
      const { data: suppliers, error: findError } = await supabase
        .from('suppliers')
        .select('*')
        .ilike('name', '%lidl%');

      if (findError) {
        append(`❌ Error finding supplier: ${findError.message}`);
        return;
      }

      if (!suppliers || suppliers.length === 0) {
        append('⚠️ No Lidl supplier found in database');
        setDone(true);
        return;
      }

      append(`✅ Found ${suppliers.length} Lidl supplier(s)`);

      // Update each one
      for (const supplier of suppliers) {
        append(`Updating "${supplier.name}" to "UAB Lidl Lietuva"...`);
        
        const { error: updateError } = await supabase
          .from('suppliers')
          .update({ name: 'UAB Lidl Lietuva' })
          .eq('id', supplier.id);

        if (updateError) {
          append(`❌ Error updating ${supplier.name}: ${updateError.message}`);
        } else {
          append(`✅ Updated ${supplier.name} → UAB Lidl Lietuva`);
        }
      }

      append('');
      append('✨ Lidl supplier name fixed!');
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
            🔧 Fix Lidl Supplier Name
          </h1>
          <p className="text-gray-400">
            This will update "LiDL" to "UAB Lidl Lietuva" in the database.
          </p>
        </div>

        {!running && !done && (
          <button
            onClick={handleFix}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
          >
            🔧 Fix Supplier Name
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
              ✅ Supplier name fixed!
            </p>
            <a 
              href="/invoices"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
            >
              📋 View Invoices
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

