// Check environment variables at build time
console.log('\n🔍 Environment Variables Check:');
console.log('================================');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ SET' : '❌ NOT SET');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ SET' : '❌ NOT SET');
console.log('VITE_OPENAI_API_KEY:', process.env.VITE_OPENAI_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT:', process.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT ? '✅ SET' : '❌ NOT SET');
console.log('VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY:', process.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY ? '✅ SET' : '❌ NOT SET');
console.log('================================\n');

// Fail build if critical vars are missing
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ ERROR: Supabase environment variables are required!');
  process.exit(1);
}

if (!process.env.VITE_OPENAI_API_KEY && !process.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT) {
  console.warn('⚠️  WARNING: No OCR service configured. Set either VITE_OPENAI_API_KEY or VITE_AZURE_DOCUMENT_INTELLIGENCE_* variables.');
}

