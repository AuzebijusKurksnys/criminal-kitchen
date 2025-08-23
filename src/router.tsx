
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { InventoryPage } from './pages/InventoryPage';
import { SupplierPricesPage } from './pages/SupplierPricesPage';
import { TechCardsPage } from './pages/TechCardsPage';
import { JournalsPage } from './pages/JournalsPage';
import { ReportsPage } from './pages/ReportsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/inventory" replace />,
  },
  {
    path: '/inventory',
    element: <InventoryPage />,
  },
  {
    path: '/supplier-prices',
    element: <SupplierPricesPage />,
  },
  {
    path: '/tech-cards',
    element: <TechCardsPage />,
  },
  {
    path: '/journals',
    element: <JournalsPage />,
  },
  {
    path: '/reports',
    element: <ReportsPage />,
  },
]);
