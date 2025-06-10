import { useEffect, useState } from "react";

export default function Dashboard() {
  const [summary, setSummary] = useState({
    customers: 0,
    invoices: 0,
    items: 0,
    vendors: 0,
    bills: 0,
    payments: 0,
    totalRevenue: 0,
    totalExpenses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    // You should implement this endpoint in your backend for real data
    const res = await fetch("/api/dashboard/summary");
    if (res.ok) {
      const data = await res.json();
      setSummary(data);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard label="Customers" value={summary.customers} color="bg-blue-100 text-blue-700" />
        <SummaryCard label="Invoices" value={summary.invoices} color="bg-green-100 text-green-700" />
        <SummaryCard label="Items" value={summary.items} color="bg-yellow-100 text-yellow-700" />
        <SummaryCard label="Vendors" value={summary.vendors} color="bg-purple-100 text-purple-700" />
        <SummaryCard label="Bills" value={summary.bills} color="bg-pink-100 text-pink-700" />
        <SummaryCard label="Payments" value={summary.payments} color="bg-indigo-100 text-indigo-700" />
        <SummaryCard label="Revenue" value={summary.totalRevenue} color="bg-green-50 text-green-800" prefix="₹" />
        <SummaryCard label="Expenses" value={summary.totalExpenses} color="bg-red-50 text-red-800" prefix="₹" />
      </div>
      <div className="bg-white rounded shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Charts & Analytics</h2>
        <div className="h-64 flex items-center justify-center text-gray-400">
          {/* Placeholder for charts (e.g., use Chart.js or Recharts for real charts) */}
          Charts coming soon...
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, prefix = "" }) {
  return (
    <div className={`rounded shadow p-4 flex flex-col items-center ${color}`}>
      <div className="text-sm font-medium mb-2">{label}</div>
      <div className="text-2xl font-bold">{prefix}{value}</div>
    </div>
  );
} 