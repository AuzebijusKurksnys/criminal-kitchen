import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchInput } from '../components/SearchInput';
import { Select } from '../components/Select';
import { showToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { 
  listInvoices, 
  deleteInvoice,
  updateInvoice,
  getInvoiceFileUrl,
  deleteInvoiceFile
} from '../data/store';
import type { Invoice, InvoiceStatus } from '../data/types';
import { formatPrice } from '../utils/format';

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<(Invoice & { supplierName?: string })[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<(Invoice & { supplierName?: string })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; invoice: Invoice | null }>({
    show: false,
    invoice: null
  });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm, statusFilter]);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      console.log('Loading invoices...');
      const data = await listInvoices();
      console.log('Loaded invoices:', data);
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
      showToast('error', `Failed to load invoices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filterInvoices = () => {
    let filtered = invoices;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(term) ||
        invoice.supplierName?.toLowerCase().includes(term) ||
        invoice.notes?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    setFilteredInvoices(filtered);
  };

  // Group invoices by supplier
  const groupedBySupplier = () => {
    const groups = new Map<string, (Invoice & { supplierName?: string })[]>();
    
    filteredInvoices.forEach(invoice => {
      const supplierKey = invoice.supplierId;
      const supplierName = invoice.supplierName || 'Unknown Supplier';
      
      if (!groups.has(supplierKey)) {
        groups.set(supplierKey, []);
      }
      groups.get(supplierKey)!.push(invoice);
    });

    // Convert to array and sort by supplier name
    return Array.from(groups.entries())
      .map(([supplierId, invoices]) => ({
        supplierId,
        supplierName: invoices[0]?.supplierName || 'Unknown Supplier',
        invoices: invoices.sort((a, b) => 
          new Date(b.invoiceDate || b.createdAt).getTime() - 
          new Date(a.invoiceDate || a.createdAt).getTime()
        ),
        totalAmount: invoices.reduce((sum, inv) => sum + (inv.totalInclVat || 0), 0),
        count: invoices.length
      }))
      .sort((a, b) => a.supplierName.localeCompare(b.supplierName));
  };

  const toggleSupplier = (supplierId: string) => {
    const newExpanded = new Set(expandedSuppliers);
    if (newExpanded.has(supplierId)) {
      newExpanded.delete(supplierId);
    } else {
      newExpanded.add(supplierId);
    }
    setExpandedSuppliers(newExpanded);
  };

  const expandAll = () => {
    const allSupplierIds = groupedBySupplier().map(g => g.supplierId);
    setExpandedSuppliers(new Set(allSupplierIds));
  };

  const collapseAll = () => {
    setExpandedSuppliers(new Set());
  };

  const handleStatusChange = async (invoiceId: string, newStatus: InvoiceStatus) => {
    try {
      await updateInvoice(invoiceId, { status: newStatus });
      await loadInvoices();
      showToast('success', 'Invoice status updated');
    } catch (error) {
      console.error('Error updating invoice status:', error);
      showToast('error', 'Failed to update invoice status');
    }
  };

  const handleSelectInvoice = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedInvoices.size === filteredInvoices.length) {
      // Deselect all
      setSelectedInvoices(new Set());
    } else {
      // Select all filtered invoices
      setSelectedInvoices(new Set(filteredInvoices.map(invoice => invoice.id)));
    }
  };

  const handleBulkDelete = async () => {
    try {
      console.log('Bulk deleting invoices:', Array.from(selectedInvoices));
      
      for (const invoiceId of selectedInvoices) {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (invoice) {
          // Delete file if it exists
          if (invoice.filePath) {
            await deleteInvoiceFile(invoice.filePath);
          }
          
          // Delete invoice record
          await deleteInvoice(invoice.id);
        }
      }
      
      setSelectedInvoices(new Set());
      await loadInvoices();
      showToast('success', `${selectedInvoices.size} invoices deleted successfully`);
    } catch (error) {
      console.error('Error bulk deleting invoices:', error);
      showToast('error', 'Failed to delete invoices');
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    try {
      // Delete file if exists
      if (invoice.filePath) {
        await deleteInvoiceFile(invoice.filePath);
      }
      
      // Delete invoice record
      await deleteInvoice(invoice.id);
      
      await loadInvoices();
      showToast('success', 'Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      showToast('error', 'Failed to delete invoice');
    }
  };

  const handleViewFile = async (invoice: Invoice) => {
    if (!invoice.filePath) {
      showToast('error', 'No file attached to this invoice');
      return;
    }

    try {
      const url = await getInvoiceFileUrl(invoice.filePath);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error getting file URL:', error);
      showToast('error', 'Failed to open file');
    }
  };


  if (isLoading) {
    return <div className="text-center py-8">Loading invoices...</div>;
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-2 text-gray-600">
            Manage supplier invoices and track inventory updates
          </p>
        </div>
        
        <button
          onClick={() => navigate('/invoices/upload')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          📄 Upload Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex space-x-4">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search invoices..."
          className="flex-1 max-w-md"
        />
        
        <Select
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as InvoiceStatus | 'all')}
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'processing', label: 'Processing' },
            { value: 'review', label: 'Review Required' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' }
          ]}
          className="w-40"
        />

        <button
          onClick={expandAll}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 whitespace-nowrap"
        >
          📂 Expand All
        </button>

        <button
          onClick={collapseAll}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 whitespace-nowrap"
        >
          📁 Collapse All
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedInvoices.size > 0 && (
        <div className="mb-4 flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-700">
            {selectedInvoices.size} invoice{selectedInvoices.size !== 1 ? 's' : ''} selected
          </div>
          <button
            onClick={() => setBulkDeleteConfirm(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            🗑️ Delete Selected ({selectedInvoices.size})
          </button>
        </div>
      )}

      {/* Invoice Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {(['pending', 'review', 'approved', 'rejected'] as InvoiceStatus[]).map(status => {
          const count = invoices.filter(inv => inv.status === status).length;
          const total = invoices
            .filter(inv => inv.status === status)
            .reduce((sum, inv) => sum + (inv.totalInclVat || 0), 0);
          
          return (
            <div key={status} className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatPrice(total, 'EUR')}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoices Grouped by Supplier */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your filters or search terms'
              : 'Upload your first invoice to get started'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={() => navigate('/invoices/upload')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Upload First Invoice
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedBySupplier().map(group => {
            const isExpanded = expandedSuppliers.has(group.supplierId);
            
            return (
              <div key={group.supplierId} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Supplier Folder Header */}
                <button
                  onClick={() => toggleSupplier(group.supplierId)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{isExpanded ? '📂' : '📁'}</span>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-gray-900">{group.supplierName}</h3>
                      <p className="text-sm text-gray-500">
                        {group.count} invoice{group.count !== 1 ? 's' : ''} · Total: {formatPrice(group.totalAmount, 'EUR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                  </div>
                </button>

                {/* Invoices List */}
                {isExpanded && (
                  <div className="border-t bg-gray-50">
                    {group.invoices.map(invoice => (
                      <div
                        key={invoice.id}
                        className="px-6 py-4 border-b last:border-b-0 hover:bg-white transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedInvoices.has(invoice.id)}
                              onChange={() => handleSelectInvoice(invoice.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            
                            <div className="flex-1 grid grid-cols-6 gap-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                                <div className="text-xs text-gray-500">
                                  {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '-'}
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-gray-700">{formatPrice(invoice.totalInclVat || 0, invoice.currency || 'EUR')}</div>
                                <div className="text-xs text-gray-500">incl. VAT</div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-gray-700">{formatPrice(invoice.totalExclVat || 0, invoice.currency || 'EUR')}</div>
                                <div className="text-xs text-gray-500">excl. VAT</div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-gray-700">
                                  {(invoice.discountAmount || 0) > 0 ? formatPrice(invoice.discountAmount || 0, invoice.currency || 'EUR') : '-'}
                                </div>
                                <div className="text-xs text-gray-500">discount</div>
                              </div>
                              
                              <div>
                                <Select
                                  value={invoice.status}
                                  onChange={(value) => handleStatusChange(invoice.id, value as InvoiceStatus)}
                                  options={[
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'processing', label: 'Processing' },
                                    { value: 'review', label: 'Review' },
                                    { value: 'approved', label: 'Approved' },
                                    { value: 'rejected', label: 'Rejected' }
                                  ]}
                                  className="w-32"
                                />
                              </div>
                              
                              <div className="flex space-x-2 justify-end">
                                {invoice.filePath && (
                                  <button
                                    onClick={() => handleViewFile(invoice)}
                                    className="text-blue-600 hover:text-blue-900 text-sm px-2 py-1"
                                    title="View/Download file"
                                  >
                                    📎 File
                                  </button>
                                )}
                                <button
                                  onClick={() => setDeleteConfirm({ show: true, invoice })}
                                  className="text-red-600 hover:text-red-900 text-sm px-2 py-1"
                                  title="Delete invoice"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${deleteConfirm.invoice?.invoiceNumber}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (deleteConfirm.invoice) {
            handleDeleteInvoice(deleteConfirm.invoice);
          }
          setDeleteConfirm({ show: false, invoice: null });
        }}
        onCancel={() => setDeleteConfirm({ show: false, invoice: null })}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        title="Delete Multiple Invoices"
        message={`Are you sure you want to delete ${selectedInvoices.size} selected invoice${selectedInvoices.size !== 1 ? 's' : ''}? This action cannot be undone and will also delete associated files.`}
        confirmLabel={`Delete ${selectedInvoices.size} Invoice${selectedInvoices.size !== 1 ? 's' : ''}`}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          handleBulkDelete();
          setBulkDeleteConfirm(false);
        }}
        onCancel={() => setBulkDeleteConfirm(false)}
      />
    </div>
  );
}
