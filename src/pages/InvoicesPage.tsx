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
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
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

  // Group invoices by supplier, then by year, then by month
  const groupedBySupplier = () => {
    const groups = new Map<string, (Invoice & { supplierName?: string })[]>();
    
    filteredInvoices.forEach(invoice => {
      const supplierKey = invoice.supplierId;
      
      if (!groups.has(supplierKey)) {
        groups.set(supplierKey, []);
      }
      groups.get(supplierKey)!.push(invoice);
    });

    // Convert to array and sort by supplier name
    return Array.from(groups.entries())
      .map(([supplierId, invoices]) => {
        // Group invoices by year
        const yearGroups = new Map<number, (Invoice & { supplierName?: string })[]>();
        
        invoices.forEach(invoice => {
          const date = new Date(invoice.invoiceDate || invoice.createdAt);
          const year = date.getFullYear();
          
          if (!yearGroups.has(year)) {
            yearGroups.set(year, []);
          }
          yearGroups.get(year)!.push(invoice);
        });

        // Convert year groups to array and sort by year (newest first)
        const years = Array.from(yearGroups.entries())
          .map(([year, yearInvoices]) => {
            // Group invoices by month within the year
            const monthGroups = new Map<number, (Invoice & { supplierName?: string })[]>();
            
            yearInvoices.forEach(invoice => {
              const date = new Date(invoice.invoiceDate || invoice.createdAt);
              const month = date.getMonth();
              
              if (!monthGroups.has(month)) {
                monthGroups.set(month, []);
              }
              monthGroups.get(month)!.push(invoice);
            });

            // Convert month groups to array and sort by month (newest first)
            const months = Array.from(monthGroups.entries())
              .map(([month, monthInvoices]) => {
                const date = new Date(year, month);
                
                return {
                  monthKey: `${year}-${String(month + 1).padStart(2, '0')}`,
                  monthLabel: date.toLocaleDateString('en-US', { month: 'long' }),
                  invoices: monthInvoices.sort((a, b) => 
                    new Date(b.invoiceDate || b.createdAt).getTime() - 
                    new Date(a.invoiceDate || a.createdAt).getTime()
                  ),
                  totalAmount: monthInvoices.reduce((sum, inv) => sum + (inv.totalInclVat || 0), 0),
                  count: monthInvoices.length
                };
              })
              .sort((a, b) => b.monthKey.localeCompare(a.monthKey)); // Newest month first

            return {
              year,
              yearLabel: year.toString(),
              months,
              totalAmount: yearInvoices.reduce((sum, inv) => sum + (inv.totalInclVat || 0), 0),
              count: yearInvoices.length
            };
          })
          .sort((a, b) => b.year - a.year); // Newest year first

        return {
          supplierId,
          supplierName: invoices[0]?.supplierName || 'Unknown Supplier',
          years,
          totalAmount: invoices.reduce((sum, inv) => sum + (inv.totalInclVat || 0), 0),
          count: invoices.length
        };
      })
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

  const toggleYear = (yearKey: string) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(yearKey)) {
      newExpanded.delete(yearKey);
    } else {
      newExpanded.add(yearKey);
    }
    setExpandedYears(newExpanded);
  };

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  const expandAll = () => {
    const grouped = groupedBySupplier();
    const allSupplierIds = grouped.map(g => g.supplierId);
    const allYearKeys: string[] = [];
    const allMonthKeys: string[] = [];
    
    grouped.forEach(supplier => {
      supplier.years.forEach(year => {
        const yearKey = `${supplier.supplierId}_${year.year}`;
        allYearKeys.push(yearKey);
        
        year.months.forEach(month => {
          allMonthKeys.push(`${yearKey}_${month.monthKey}`);
        });
      });
    });
    
    setExpandedSuppliers(new Set(allSupplierIds));
    setExpandedYears(new Set(allYearKeys));
    setExpandedMonths(new Set(allMonthKeys));
  };

  const collapseAll = () => {
    setExpandedSuppliers(new Set());
    setExpandedYears(new Set());
    setExpandedMonths(new Set());
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
            const isSupplierExpanded = expandedSuppliers.has(group.supplierId);
            
            return (
              <div key={group.supplierId} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Supplier Folder Header */}
                <button
                  onClick={() => toggleSupplier(group.supplierId)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{isSupplierExpanded ? '📂' : '📁'}</span>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-gray-900">{group.supplierName}</h3>
                      <p className="text-sm text-gray-500">
                        {group.count} invoice{group.count !== 1 ? 's' : ''} · Total: {formatPrice(group.totalAmount, 'EUR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">{isSupplierExpanded ? '▼' : '▶'}</span>
                  </div>
                </button>

                {/* Year Folders */}
                {isSupplierExpanded && (
                  <div className="border-t bg-gray-50">
                    {group.years.map(year => {
                      const yearKey = `${group.supplierId}_${year.year}`;
                      const isYearExpanded = expandedYears.has(yearKey);
                      
                      return (
                        <div key={yearKey} className="border-b last:border-b-0">
                          {/* Year Subfolder Header */}
                          <button
                            onClick={() => toggleYear(yearKey)}
                            className="w-full px-8 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">{isYearExpanded ? '📂' : '📁'}</span>
                              <div className="text-left">
                                <h4 className="text-md font-semibold text-gray-800">{year.yearLabel}</h4>
                                <p className="text-xs text-gray-500">
                                  {year.count} invoice{year.count !== 1 ? 's' : ''} · {formatPrice(year.totalAmount, 'EUR')}
                                </p>
                              </div>
                            </div>
                            <span className="text-gray-400 text-sm">{isYearExpanded ? '▼' : '▶'}</span>
                          </button>

                          {/* Month Folders within Year */}
                          {isYearExpanded && (
                            <div className="bg-gray-100">
                              {year.months.map(month => {
                                const monthKey = `${yearKey}_${month.monthKey}`;
                                const isMonthExpanded = expandedMonths.has(monthKey);
                                
                                return (
                                  <div key={monthKey} className="border-b last:border-b-0">
                                    {/* Month Subfolder Header */}
                                    <button
                                      onClick={() => toggleMonth(monthKey)}
                                      className="w-full px-12 py-2.5 flex items-center justify-between hover:bg-gray-200 transition-colors"
                                    >
                                      <div className="flex items-center space-x-3">
                                        <span className="text-base">{isMonthExpanded ? '📂' : '📁'}</span>
                                        <div className="text-left">
                                          <h5 className="text-sm font-medium text-gray-700">{month.monthLabel}</h5>
                                          <p className="text-xs text-gray-500">
                                            {month.count} invoice{month.count !== 1 ? 's' : ''} · {formatPrice(month.totalAmount, 'EUR')}
                                          </p>
                                        </div>
                                      </div>
                                      <span className="text-gray-400 text-xs">{isMonthExpanded ? '▼' : '▶'}</span>
                                    </button>

                                    {/* Invoices in Month */}
                                    {isMonthExpanded && (
                                      <div className="bg-white">
                                        {month.invoices.map(invoice => (
                                <div
                                  key={invoice.id}
                                  className="px-10 py-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
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
                                            {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
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
                      </div>
                    );
                  })}
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
