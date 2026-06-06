import React, { useState, useEffect } from 'react';
import { invoiceService } from '../services/api';

export default function CustomerProfile({ customerId, onBack }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    invoiceService.getCustomerProfile(customerId)
      .then((res) => setProfileData(res.data))
      .catch((err) => {
        console.error('Error loading customer profile:', err);
        setError('Could not load customer profile.');
      })
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) {
    return <div className="text-center p-12 text-gray-500">Loading profile…</div>;
  }
  if (error) {
    return (
      <div className="text-center p-12 text-red-500">
        {error}
        <button onClick={onBack} className="mt-4 block mx-auto text-blue-600 hover:underline text-sm">← Back</button>
      </div>
    );
  }
  if (!profileData) {
    return <div className="text-center p-12 text-gray-400">No profile data found.</div>;
  }

  const { customer, metrics, history } = profileData;
  const initials = customer?.name
    ? customer.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'CN';

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 pt-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 flex flex-wrap items-center gap-1">
        <button onClick={onBack} className="hover:text-blue-600 transition-colors shrink-0">Invoices</button>
        <span className="mx-1 select-none text-gray-300">/</span>
        <span className="text-gray-900 font-medium truncate max-w-[200px] sm:max-w-none">
          {customer?.name || 'Customer'}
        </span>
      </div>

      {/* Profile card */}
      <div className="flex items-center gap-4 bg-white p-4 sm:p-5 rounded-xl border border-gray-100 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0 select-none">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">{customer?.name}</h1>
          <p className="text-xs text-gray-500 truncate">
            Company: <span className="font-medium text-gray-700">{customer?.companyName || 'N/A'}</span>
          </p>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Billed',  value: metrics?.totalBilled,  color: 'text-gray-900' },
          { label: 'Paid Amount',   value: metrics?.paidAmount,   color: 'text-green-600 font-semibold' },
          { label: 'Outstanding',   value: metrics?.unpaidAmount, color: 'text-amber-600 font-semibold' },
          { label: '# Invoices',    value: metrics?.invoiceCount, color: 'text-gray-900', raw: true },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 truncate">{card.label}</p>
            <p className={`text-xl sm:text-2xl font-bold tracking-tight truncate ${card.color}`}>
              {card.raw
                ? card.value ?? 0
                : `$${(card.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </p>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs font-medium text-gray-600">
        {['Paid', 'Unpaid', 'Overdue', 'Sent', 'Draft', 'Void'].map((st) => {
          const count = history?.filter((i) => i.status === st).length || 0;
          return (
            <span key={st} className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm/5 shrink-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                st === 'Paid' ? 'bg-green-500' :
                st === 'Overdue' ? 'bg-red-500' :
                st === 'Unpaid' ? 'bg-amber-500' :
                st === 'Sent' ? 'bg-blue-400' :
                'bg-gray-400'
              }`} />
              <span className="whitespace-nowrap">{st}: <strong className="text-gray-900">{count}</strong></span>
            </span>
          );
        })}
      </div>

      {/* Invoice history table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider">Invoice History</h2>
        </div>
        <div className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 whitespace-nowrap">Invoice</th>
                <th className="p-4 whitespace-nowrap">Amount</th>
                <th className="p-4 whitespace-nowrap">Total</th>
                <th className="p-4 whitespace-nowrap">Status</th>
                <th className="p-4 whitespace-nowrap">Issued</th>
                <th className="p-4 whitespace-nowrap">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {!history || history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-gray-400">No invoices found for this customer.</td>
                </tr>
              ) : history.map((inv) => (
                <tr key={inv._id} className="hover:bg-gray-50/40 transition-colors">
                  <td className="p-4 font-medium text-gray-900 whitespace-nowrap">{inv.invoiceId}</td>
                  <td className="p-4 whitespace-nowrap">${Number(inv.amount).toFixed(2)}</td>
                  <td className="p-4 font-semibold whitespace-nowrap">${Number(inv.total).toFixed(2)}</td>
                  <td className="p-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-block ${
                      inv.status === 'Paid' ? 'bg-green-50 text-green-700' :
                      inv.status === 'Overdue' ? 'bg-red-50 text-red-700' :
                      inv.status === 'Unpaid' ? 'bg-amber-50 text-amber-700' :
                      inv.status === 'Sent' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 whitespace-nowrap">
                    {inv.issueDate && inv.issueDate.includes('T') ? inv.issueDate.split('T')[0] : inv.issueDate}
                  </td>
                  <td className="p-4 text-gray-500 whitespace-nowrap">
                    {inv.dueDate && inv.dueDate.includes('T') ? inv.dueDate.split('T')[0] : inv.dueDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}