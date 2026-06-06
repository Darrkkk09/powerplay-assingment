import React, { useState, useEffect } from 'react';
import { invoiceService } from '../services/api';

export default function InvoiceModal({ isOpen, onClose, onRefresh, masterCustomers, invoiceToEdit }) {
  const [customerId, setCustomerId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [amount, setAmount] = useState('');
  const [taxRate, setTaxRate] = useState(18);
  const [status, setStatus] = useState('Draft');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Computed values
  const baseAmt = parseFloat(amount) || 0;
  const computedTax = Math.round(baseAmt * taxRate / 100 * 100) / 100;
  const computedTotal = Math.round((baseAmt + computedTax) * 100) / 100;

  // Initialize/Reset form based on mode
  useEffect(() => {
    if (isOpen) {
      if (invoiceToEdit) {
        setCustomerId(invoiceToEdit.customer?._id || invoiceToEdit.customer || '');
        setAmount(invoiceToEdit.amount || '');
        setTaxRate(invoiceToEdit.taxRate ?? 18);
        setStatus(invoiceToEdit.status || 'Draft');
        setIssueDate(invoiceToEdit.issueDate ? invoiceToEdit.issueDate.split('T')[0] : '');
        setDueDate(invoiceToEdit.dueDate ? invoiceToEdit.dueDate.split('T')[0] : '');
      } else {
        resetForm();
      }
    }
  }, [isOpen, invoiceToEdit]);

  // Auto-fill company when customer is selected
  useEffect(() => {
    const selected = masterCustomers.find((c) => (c._id || c.id) === customerId);
    setCompanyName(selected?.companyName || selected?.company?.name || '');
  }, [customerId, masterCustomers]);

  const resetForm = () => {
    setCustomerId('');
    setCompanyName('');
    setAmount('');
    setTaxRate(18);
    setStatus('Draft');
    setIssueDate('');
    setDueDate('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const isEditMode = !!invoiceToEdit;
    
    // In edit mode we keep the same invoiceId, in create mode we generate a new one
    const invoiceId = isEditMode ? invoiceToEdit.invoiceId : `INV-${Date.now()}`;

    const payload = {
      invoiceId,
      customer: customerId,
      amount: parseFloat(amount),
      taxRate: Number(taxRate),
      status,
      issueDate,
      dueDate,
    };

    try {
      if (isEditMode) {
        await invoiceService.update(invoiceToEdit._id || invoiceToEdit.id, payload);
      } else {
        await invoiceService.create(payload);
      }
      resetForm();
      onRefresh();
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} invoice. Please try again.`;
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[calc(100vh-2rem)] flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate pr-2">
            {invoiceToEdit ? `Edit Invoice (${invoiceToEdit.invoiceId})` : 'New Invoice'}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none select-none p-1">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 break-words">{error}</div>
          )}

          {/* Customer */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Customer</label>
            <select
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select customer…</option>
              {masterCustomers.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Company (auto-filled) */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Company (Auto-filled)</label>
            <input
              type="text"
              readOnly
              value={companyName}
              placeholder="Will populate after selecting a customer…"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg text-sm cursor-not-allowed truncate"
            />
          </div>

          {/* Amount + Tax Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tax Rate (%)</label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
              >
                {[0, 3, 5, 18, 28].map((rate) => (
                  <option key={rate} value={rate}>{rate}%</option>
                ))}
              </select>
            </div>
          </div>

          {/* Issue Date + Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Issue Date</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
            >
              {['Draft', 'Sent', 'Unpaid', 'Overdue', 'Paid', 'Void'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Live computed preview */}
          <div className="p-3 bg-gray-50 rounded-xl flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between text-xs text-gray-500 font-medium">
            <span>Tax: <strong className="text-gray-900">${computedTax.toFixed(2)}</strong></span>
            <span className="truncate">
              Total: <strong className="text-gray-900 text-sm">${computedTotal.toFixed(2)}</strong>{' '}
              <span className="text-[10px] text-gray-400 font-normal inline-block">(computed)</span>
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {submitting ? 'Saving…' : (invoiceToEdit ? 'Save Changes' : 'Save Invoice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}