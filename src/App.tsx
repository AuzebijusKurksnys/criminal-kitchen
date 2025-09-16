import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './AppRoutes';
import { ToastProvider } from './components/Toast';
import { NavBar } from './components/NavBar';
import { initializeOpenAI } from './services/invoiceParser';

function App() {
  // Initialize settings on app startup
  useEffect(() => {
    try {
      const stored = localStorage.getItem('criminal-kitchen-settings');
      if (stored) {
        const settings = JSON.parse(stored);
        if (settings.openaiApiKey) {
          initializeOpenAI(settings.openaiApiKey);
        }
      }
    } catch (error) {
      console.error('Error loading settings on startup:', error);
    }
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <NavBar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AppRoutes />
          </main>
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
