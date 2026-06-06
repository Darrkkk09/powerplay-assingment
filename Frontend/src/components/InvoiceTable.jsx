import React, { useState, useEffect } from 'react';
import { invoiceService } from '../services/api';

export default function InvoiceTable({ onSelectCustomer, onEditInvoice }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [taxRateFilter, setTaxRateFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [sortField, setSortField] = useState('dueDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 400);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, taxRateFilter, startDateFilter, endDateFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await invoiceService.getAll({
        page,
        limit: 20,
        search: debouncedSearch,
        status: statusFilter,
        taxRate: taxRateFilter,
        issueDateStart: startDateFilter,
        issueDateEnd: endDateFilter,
        sortBy: sortField,
        sortOrder: sortOrder,
      });

      const result = response.data;
      setInvoices(result.invoices || result.data || []);
      setTotalRecords(result.pagination?.total || result.total || 0);
  } finally {
    setLoading(false);
  }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, statusFilter, taxRateFilter, startDateFilter, endDateFilter, sortField, sortOrder, debouncedSearch]);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    if (typeof dateString === 'string' && dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    return dateString;
  };

  const totalPages = Math.ceil(totalRecords / 20);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="w-full lg:max-w-md">
          <input
            type="text"
            placeholder="Search invoice / customer..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-3">
          <div className="grid grid-cols-2 sm:flex items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-606 focus:outline-none"
            >
              <option value="">Status</option>
              {['Sent', 'Unpaid', 'Overdue', 'Paid', 'Void', 'Draft'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={taxRateFilter}
              onChange={(e) => setTaxRateFilter(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-606 focus:outline-none"
            >
              <option value="">Tax Rate</option>
              {[0, 3, 5, 18, 28].map((rate) => (
                <option key={rate} value={rate}>{rate}%</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start bg-white border border-gray-200 sm:border-none p-2 sm:p-0 rounded-lg">
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-full sm:w-auto px-2 sm:px-3 py-2 bg-white border sm:border-gray-200 border-none rounded-lg text-sm text-gray-606 focus:outline-none"
              placeholder="Start Date"
            />
            <span className="text-gray-400 text-xs shrink-0">to</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="w-full sm:w-auto px-2 sm:px-3 py-2 bg-white border sm:border-gray-200 border-none rounded-lg text-sm text-gray-606 focus:outline-none"
              placeholder="End Date"
            />
            {(startDateFilter || endDateFilter) && (
              <button
                onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
                className="text-gray-400 hover:text-gray-606 text-xs font-semibold px-1 shrink-0"
                title="Clear dates"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Workspace */}
      <div className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
              <th className="p-4 cursor-pointer hover:text-gray-700 select-none whitespace-nowrap" onClick={() => toggleSort('invoiceId')}>
                Invoice {sortField === 'invoiceId' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="p-4 whitespace-nowrap">Customer</th>
              <th className="p-4 cursor-pointer hover:text-gray-700 select-none whitespace-nowrap" onClick={() => toggleSort('amount')}>
                Amount {sortField === 'amount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="p-4 whitespace-nowrap">Tax%</th>
              <th className="p-4 whitespace-nowrap">Total</th>
              <th className="p-4 cursor-pointer hover:text-gray-700 select-none whitespace-nowrap" onClick={() => toggleSort('issueDate')}>
                Issued {sortField === 'issueDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="p-4 cursor-pointer hover:text-gray-700 select-none whitespace-nowrap" onClick={() => toggleSort('dueDate')}>
                Due {sortField === 'dueDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="p-4 whitespace-nowrap">Status</th>
              <th className="p-4 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center p-8 text-gray-400">Loading invoice data...</td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center p-8 text-gray-400">No invoices found.</td>
              </tr>
            ) : invoices.map((inv) => (
              <tr key={inv._id || inv.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4 font-medium text-gray-900 whitespace-nowrap">{inv.invoiceId}</td>
                <td className="p-4 max-w-[200px] truncate">
                  <button
                    onClick={() => onSelectCustomer(inv.customer?._id || inv.customer)}
                    className="text-blue-600 hover:underline text-left font-medium block truncate w-full"
                  >
                    {inv.customerSnapshot?.name || inv.customer?.name || 'Unknown'}
                  </button>
                </td>
                <td className="p-4 whitespace-nowrap">${Number(inv.amount).toFixed(2)}</td>
                <td className="p-4 whitespace-nowrap text-gray-500">{inv.taxRate}%</td>
                <td className="p-4 whitespace-nowrap font-semibold">${Number(inv.total).toFixed(2)}</td>
                <td className="p-4 whitespace-nowrap text-gray-500">{formatDate(inv.issueDate)}</td>
                <td className="p-4 whitespace-nowrap text-gray-500">{formatDate(inv.dueDate)}</td>
                <td className="p-4 whitespace-nowrap">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-block ${
                    inv.status === 'Paid' ? 'bg-green-50 text-green-700' :
                    inv.status === 'Overdue' ? 'bg-red-50 text-red-700' :
                    inv.status === 'Unpaid' ? 'bg-amber-50 text-amber-700' :
                    inv.status === 'Sent' ? 'bg-blue-50 text-blue-700' :
                    inv.status === 'Void' ? 'bg-gray-100 text-gray-500' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {inv.status}
                  </span>
                </td>
                <td className="p-4 text-right whitespace-nowrap">
                  <button
                    onClick={() => onEditInvoice && onEditInvoice(inv)}
                    className="text-blue-600 hover:text-blue-800 font-semibold text-xs bg-blue-50 hover:bg-blue-100/70 px-2.5 py-1 rounded-md transition-colors"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Container */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500">
        <div className="text-center sm:text-left order-2 sm:order-1">
          {totalRecords > 0
            ? `Showing ${Math.min((page - 1) * 20 + 1, totalRecords)}–${Math.min(page * 20, totalRecords)} of ${totalRecords.toLocaleString()}`
            : 'No records'}
        </div>
        <div className="flex gap-2 order-1 sm:order-2 flex-wrap justify-center">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm"
          >
            Previous
          </button>
          {[...Array(Math.min(totalPages, 5))].map((_, idx) => (
            <button
              key={idx}
              onClick={() => setPage(idx + 1)}
              className={`px-3 py-1 rounded-md text-sm ${page === idx + 1 ? 'bg-blue-600 text-white font-medium' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {idx + 1}
            </button>
          ))}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}