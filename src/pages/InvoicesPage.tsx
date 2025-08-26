import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table } from '../components/Table';
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; invoice: Invoice | null }>({
    show: false,
    invoice: null
  });
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
      const data = await listInvoices();
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
      showToast('error', 'Failed to load invoices');
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



  const columns = [
    {
      key: 'invoiceNumber',
      label: 'Invoice #',
      render: (invoice: Invoice & { supplierName?: string }) => (
        <div>
          <div className="font-medium text-gray-900">{invoice.invoiceNumber}</div>
          <div className="text-sm text-gray-500">{invoice.supplierName}</div>
        </div>
      )
    },
    {
      key: 'invoiceDate',
      label: 'Date',
      render: (invoice: Invoice) => invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '-'
    },
    {
      key: 'totalInclVat',
      label: 'Total (incl. VAT)',
      render: (invoice: Invoice) => formatPrice(invoice.totalInclVat || 0, invoice.currency || 'EUR')
    },
    {
      key: 'totalExclVat',
      label: 'Total (excl. VAT)',
      render: (invoice: Invoice) => formatPrice(invoice.totalExclVat || 0, invoice.currency || 'EUR')
    },
    {
      key: 'discountAmount',
      label: 'Discount',
      render: (invoice: Invoice) => 
        (invoice.discountAmount || 0) > 0 ? formatPrice(invoice.discountAmount || 0, invoice.currency || 'EUR') : '-'
    },
    {
      key: 'status',
      label: 'Status',
      render: (invoice: Invoice) => (
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
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (invoice: Invoice) => (
        <div className="flex space-x-2">
          {invoice.filePath && (
            <button
              onClick={() => handleViewFile(invoice)}
              className="text-blue-600 hover:text-blue-900 text-sm"
              title="View/Download file"
            >
              📎 File
            </button>
          )}
          <button
            onClick={() => setDeleteConfirm({ show: true, invoice })}
            className="text-red-600 hover:text-red-900 text-sm"
            title="Delete invoice"
          >
            🗑️ Delete
          </button>
        </div>
      )
    }
  ];

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
      </div>

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

      {/* Invoices Table */}
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
        <Table
          data={filteredInvoices}
          columns={columns}
          sortable
        />
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
    </div>
  );
}
