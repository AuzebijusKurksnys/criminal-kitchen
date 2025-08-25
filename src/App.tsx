import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './AppRoutes';
import { ToastProvider } from './components/Toast';
import { NavBar } from './components/NavBar';

function App() {
  // No auto-seeding - database starts clean

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
