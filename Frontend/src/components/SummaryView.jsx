import React, { useState, useEffect } from 'react';
import { invoiceService } from '../services/api';

// SummaryView displays aggregate invoice metrics and a breakdown of top 5 customers by billing revenue.
export default function SummaryView({ onSelectCustomer }) {
  const [summary, setSummary] = useState(null);
  const [topCustomers, setTopCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, topCustomersRes] = await Promise.all([
          invoiceService.getSummary(),
          invoiceService.getTopCustomers()
        ]);
        setSummary(summaryRes.data);
        setTopCustomers(topCustomersRes.data || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Unable to load summary data');
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  if (loading) {
    return <div className="text-center p-12 text-gray-500">Loading summary statistics...</div>;
  }

  if (error) {
    return (
      <div className="text-center p-12 text-red-500 font-medium">
        {error}
      </div>
    );
  }

  if (!summary) {
    return <div className="text-center p-12 text-gray-500">No summary data available.</div>;
  }

  const { totalBilled, totalTax, outstanding, invoiceCount, customerCount } = summary;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto p-4">
      {/* Metrics Grid Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Billed', value: totalBilled, color: 'text-gray-900' },
          { label: 'Total Tax', value: totalTax, color: 'text-gray-500' },
          { label: 'Outstanding', value: outstanding, color: 'text-amber-600 font-semibold' },
          { label: '# Invoices', value: invoiceCount, color: 'text-gray-900', raw: true },
          { label: '# Customers', value: customerCount, color: 'text-blue-600', raw: true },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 truncate">
              {card.label}
            </p>
            <p className={`text-xl sm:text-2xl font-bold tracking-tight truncate ${card.color}`}>
              {card.raw ? (card.value ?? 0).toLocaleString() : `$${(card.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </p>
          </div>
        ))}
      </div>

      {/* Top 5 Customers Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-900">Top 5 Customers</h2>
            <p className="text-xs text-gray-400 mt-0.5">Ranked by total billed volume</p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-full select-none">
            Revenue Leaders
          </span>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 w-16 text-center whitespace-nowrap">Rank</th>
                <th className="p-4 whitespace-nowrap">Customer</th>
                <th className="p-4 whitespace-nowrap">Company</th>
                <th className="p-4 text-right whitespace-nowrap">Invoices</th>
                <th className="p-4 text-right whitespace-nowrap">Total Billed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {topCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-gray-400">No customer data available.</td>
                </tr>
              ) : (
                topCustomers.map((cust, idx) => {
                  const initials = cust.name
                    ? cust.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                    : 'CN';
                  return (
                    <tr key={cust.id || cust._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-center font-bold text-gray-400">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs select-none ${
                          idx === 0 ? 'bg-amber-100 text-amber-700 font-extrabold' :
                          idx === 1 ? 'bg-gray-200 text-gray-700' :
                          idx === 2 ? 'bg-amber-50 text-amber-800' :
                          'bg-gray-50 text-gray-400'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                            {initials}
                          </div>
                          <button
                            onClick={() => onSelectCustomer && onSelectCustomer(cust.id || cust._id)}
                            className="text-blue-600 hover:underline font-semibold text-left focus:outline-none truncate max-w-[160px] sm:max-w-none"
                          >
                            {cust.name}
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-gray-500 font-medium truncate max-w-[150px] sm:max-w-none">
                        {cust.companyName || 'N/A'}
                      </td>
                      <td className="p-4 text-right font-medium text-gray-500 whitespace-nowrap">
                        {cust.invoiceCount}
                      </td>
                      <td className="p-4 text-right font-bold text-gray-900 whitespace-nowrap">
                        ${Number(cust.totalBilled || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}