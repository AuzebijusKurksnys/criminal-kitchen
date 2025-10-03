import { useState, useEffect } from 'react';
import { showToast } from '../components/Toast';
import { initializeOpenAI, isOpenAIInitialized } from '../services/invoiceParser';
import { openaiInvoiceProcessor, OPENAI_MODELS, type OpenAIModelKey } from '../services/openaiModels';

interface SettingsData {
  autoProcessInvoices: boolean;
  defaultVatRate: number;
  invoiceNotifications: boolean;
  preferredOpenAIModel: OpenAIModelKey;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    autoProcessInvoices: false,
    defaultVatRate: 21,
    invoiceNotifications: true,
    preferredOpenAIModel: 'gpt-4o'
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const stored = localStorage.getItem('criminal-kitchen-settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({ ...prev, ...parsed }));
        
        // Apply preferred OpenAI model
        if (parsed.preferredOpenAIModel) {
          openaiInvoiceProcessor.setPreferredModel(parsed.preferredOpenAIModel);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    
    try {
      // Save to localStorage
      localStorage.setItem('criminal-kitchen-settings', JSON.stringify(settings));
      
      // OpenAI now uses environment variables - no initialization needed
      
      showToast('success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };


  const handleInputChange = (field: keyof SettingsData, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-100">Settings</h1>
        <p className="mt-2 text-gray-600">
          Configure your Criminal Kitchen application preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* OpenAI Configuration */}
        <div className="bg-gray-900 shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-medium text-gray-100">OpenAI Configuration</h2>
            <p className="mt-1 text-sm text-gray-400">
              AI-powered invoice processing status
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            {isOpenAIInitialized() ? (
              <div className="flex items-center text-sm text-green-600">
                <span className="mr-2">✅</span>
                OpenAI API key configured via environment variables
              </div>
            ) : (
              <div className="flex items-center text-sm text-red-400">
                <span className="mr-2">❌</span>
                OpenAI API key not found in environment variables
              </div>
            )}
            
            <div className="text-sm text-gray-400">
              <p>OpenAI API key is now configured via Vercel environment variables for security.</p>
              <p>Set VITE_OPENAI_API_KEY in your deployment environment.</p>
            </div>

            {isOpenAIInitialized() && (
              <div className="mt-6">
                <label htmlFor="preferred-model" className="block text-sm font-medium text-gray-200">
                  Preferred OpenAI Model
                </label>
                <select
                  id="preferred-model"
                  value={settings.preferredOpenAIModel}
                  onChange={(e) => {
                    const model = e.target.value as OpenAIModelKey;
                    handleInputChange('preferredOpenAIModel', model);
                    openaiInvoiceProcessor.setPreferredModel(model);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  {Object.entries(OPENAI_MODELS).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.name} - {config.description}
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-gray-400">
                  <div className="mb-1">
                    <strong>Current model strengths:</strong> {OPENAI_MODELS[settings.preferredOpenAIModel]?.strengths.join(', ')}
                  </div>
                  <div>
                    <strong>Cost:</strong> ${OPENAI_MODELS[settings.preferredOpenAIModel]?.costPer1kTokens}/1k tokens
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center">
              <input
                id="auto-process"
                type="checkbox"
                checked={settings.autoProcessInvoices}
                onChange={(e) => handleInputChange('autoProcessInvoices', e.target.checked)}
                className="h-4 w-4 text-blue-400 focus:ring-blue-500 border-gray-700 rounded"
              />
              <label htmlFor="auto-process" className="ml-2 block text-sm text-gray-100">
                Auto-process invoices without manual review
              </label>
            </div>
            <p className="text-sm text-gray-400 ml-6">
              When enabled, approved invoices will automatically update inventory without requiring manual confirmation
            </p>
          </div>
        </div>

        {/* Invoice Defaults */}
        <div className="bg-gray-900 shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-medium text-gray-100">Invoice Defaults</h2>
            <p className="mt-1 text-sm text-gray-400">
              Default values for invoice processing
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Default VAT Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.defaultVatRate}
                onChange={(e) => handleInputChange('defaultVatRate', parseFloat(e.target.value))}
                className="block w-32 rounded-md border-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-400">
                Applied when VAT rate is not detected in invoice
              </p>
            </div>

            <div className="flex items-center">
              <input
                id="notifications"
                type="checkbox"
                checked={settings.invoiceNotifications}
                onChange={(e) => handleInputChange('invoiceNotifications', e.target.checked)}
                className="h-4 w-4 text-blue-400 focus:ring-blue-500 border-gray-700 rounded"
              />
              <label htmlFor="notifications" className="ml-2 block text-sm text-gray-100">
                Enable invoice processing notifications
              </label>
            </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="bg-gray-900 shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-medium text-gray-100">Data & Privacy</h2>
            <p className="mt-1 text-sm text-gray-400">
              Information about data handling
            </p>
          </div>
          
          <div className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                🔒 Data Security
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your OpenAI API key is stored locally in your browser</li>
                <li>• Invoice images are processed by OpenAI's GPT-4 Vision API</li>
                <li>• Processed invoices and extracted data are stored in your Supabase database</li>
                <li>• No data is shared with third parties beyond OpenAI for processing</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <span className="animate-spin inline-block mr-2">⟳</span>
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
