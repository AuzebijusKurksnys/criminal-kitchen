import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './AppRoutes';
import { ToastProvider } from './components/Toast';
import { NavBar } from './components/NavBar';
import { seed } from './data/store';

function App() {
  useEffect(() => {
    // Initialize data with seed if needed
    seed();
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
