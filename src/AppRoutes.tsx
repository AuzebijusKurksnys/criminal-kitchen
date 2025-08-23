import { Routes, Route, Navigate } from 'react-router-dom';
import { InventoryPage } from './pages/InventoryPage';
import { SupplierPricesPage } from './pages/SupplierPricesPage';
import { TechCardsPage } from './pages/TechCardsPage';
import { JournalsPage } from './pages/JournalsPage';
import { ReportsPage } from './pages/ReportsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/inventory" replace />} />
      <Route path="/inventory" element={<InventoryPage />} />
      <Route path="/supplier-prices" element={<SupplierPricesPage />} />
      <Route path="/tech-cards" element={<TechCardsPage />} />
      <Route path="/journals" element={<JournalsPage />} />
      <Route path="/reports" element={<ReportsPage />} />
    </Routes>
  );
}
