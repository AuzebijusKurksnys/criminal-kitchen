import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
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
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <RouterProvider router={router} />
        </main>
      </div>
    </ToastProvider>
  );
}

export default App;
