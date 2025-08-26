import { Routes, Route, Navigate } from 'react-router-dom';
import { InventoryPage } from './pages/InventoryPage';
import { SupplierPricesPage } from './pages/SupplierPricesPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { InvoiceUploadPage } from './pages/InvoiceUploadPage';
import { InvoiceReviewPage } from './pages/InvoiceReviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { TechCardsPage } from './pages/TechCardsPage';
import { JournalsPage } from './pages/JournalsPage';
import { ReportsPage } from './pages/ReportsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/inventory" replace />} />
      <Route path="/inventory" element={<InventoryPage />} />
      <Route path="/supplier-prices" element={<SupplierPricesPage />} />
      <Route path="/invoices" element={<InvoicesPage />} />
      <Route path="/invoices/upload" element={<InvoiceUploadPage />} />
      <Route path="/invoices/review" element={<InvoiceReviewPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/tech-cards" element={<TechCardsPage />} />
      <Route path="/journals" element={<JournalsPage />} />
      <Route path="/reports" element={<ReportsPage />} />
    </Routes>
  );
}
