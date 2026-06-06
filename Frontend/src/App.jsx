import React, { useState, useEffect } from 'react';
import InvoiceTable from './components/InvoiceTable';
import SummaryView from './components/SummaryView';
import CustomerProfile from './components/CustomerProfile';
import InvoiceModal from './components/InvoiceModal';
import { invoiceService } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('list');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [masterCustomers, setMasterCustomers] = useState([]);
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch customer list for the modal selector
  useEffect(() => {
    invoiceService.getCustomers()
      .then((res) => setMasterCustomers(res.data || []))
      .catch((err) => console.error('Failed to load customers:', err));
  }, []);

  const handleNewInvoiceClick = () => {
    setInvoiceToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditInvoice = (invoice) => {
    setInvoiceToEdit(invoice);
    setIsModalOpen(true);
  };

  const handleInvoiceSaved = () => {
    setIsModalOpen(false);
    setInvoiceToEdit(null);
    setRefreshKey((prev) => prev + 1);
  };

  if (selectedCustomerId) {
    return (
      <CustomerProfile
        customerId={selectedCustomerId}
        onBack={() => setSelectedCustomerId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 max-w-6xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">Invoices</h1>
        
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
          {/* Tab switcher */}
          <div className="bg-white border border-gray-200 p-1 rounded-lg flex gap-1 shadow-sm/5 shrink-0">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'list' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'summary' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Summary
            </button>
          </div>
          
          <button
            onClick={handleNewInvoiceClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
          >
            + New Invoice
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {activeTab === 'list' ? (
          <InvoiceTable
            key={refreshKey}
            onSelectCustomer={(id) => setSelectedCustomerId(id)}
            onEditInvoice={handleEditInvoice}
          />
        ) : (
          <SummaryView key={refreshKey} onSelectCustomer={(id) => setSelectedCustomerId(id)} />
        )}
      </div>

      {/* Invoice Form Modal (Supports Create & Edit) */}
      <InvoiceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setInvoiceToEdit(null);
        }}
        invoiceToEdit={invoiceToEdit}
        masterCustomers={masterCustomers}
        onRefresh={handleInvoiceSaved}
      />
    </div>
  );
}