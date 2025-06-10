import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  outstandingInvoices: number;
  overdueInvoices: number;
  totalCustomers: number;
  totalVendors: number;
  recentTransactions: any[];
  topCustomers: any[];
  upcomingPayments: any[];
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    outstandingInvoices: 0,
    overdueInvoices: 0,
    totalCustomers: 0,
    totalVendors: 0,
    recentTransactions: [],
    topCustomers: [],
    upcomingPayments: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    change?: string;
    icon: string;
    color: string;
  }> = ({ title, value, change, icon, color }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className="text-sm text-green-600 mt-1">{change}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <span className="text-white text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  const QuickActionCard: React.FC<{
    title: string;
    description: string;
    icon: string;
    link: string;
    color: string;
  }> = ({ title, description, icon, link, color }) => (
    <Link to={link} className="block">
      <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center">
          <div className={`p-3 rounded-full ${color} mr-4`}>
            <span className="text-white text-xl">{icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's what's happening with your business today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Revenue"
            value={`₹${stats.totalRevenue.toLocaleString()}`}
            change="+12% from last month"
            icon="💰"
            color="bg-green-500"
          />
          <StatCard
            title="Total Expenses"
            value={`₹${stats.totalExpenses.toLocaleString()}`}
            change="+5% from last month"
            icon="📊"
            color="bg-red-500"
          />
          <StatCard
            title="Outstanding Invoices"
            value={stats.outstandingInvoices}
            icon="📄"
            color="bg-yellow-500"
          />
          <StatCard
            title="Overdue Invoices"
            value={stats.overdueInvoices}
            icon="⚠️"
            color="bg-orange-500"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickActionCard
              title="Create Invoice"
              description="Generate a new invoice"
              icon="📝"
              link="/invoices/new"
              color="bg-blue-500"
            />
            <QuickActionCard
              title="Add Customer"
              description="Register a new customer"
              icon="👤"
              link="/customers/new"
              color="bg-green-500"
            />
            <QuickActionCard
              title="Record Payment"
              description="Record customer payment"
              icon="💳"
              link="/payments/new"
              color="bg-purple-500"
            />
            <QuickActionCard
              title="Add Expense"
              description="Record business expense"
              icon="💸"
              link="/expenses/new"
              color="bg-red-500"
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Transactions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
              </div>
              <div className="p-6">
                {stats.recentTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                        <div>
                          <p className="font-medium text-gray-900">{transaction.description}</p>
                          <p className="text-sm text-gray-600">{transaction.date}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount}
                          </p>
                          <p className="text-sm text-gray-600">{transaction.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent transactions</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Top Customers */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
              </div>
              <div className="p-6">
                {stats.topCustomers.length > 0 ? (
                  <div className="space-y-4">
                    {stats.topCustomers.map((customer) => (
                      <div key={customer.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <p className="text-sm text-gray-600">{customer.email}</p>
                        </div>
                        <p className="font-semibold text-gray-900">₹{customer.total}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No customers yet</p>
                )}
              </div>
            </div>

            {/* Upcoming Payments */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Upcoming Payments</h3>
              </div>
              <div className="p-6">
                {stats.upcomingPayments.length > 0 ? (
                  <div className="space-y-4">
                    {stats.upcomingPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{payment.customer_name}</p>
                          <p className="text-sm text-gray-600">Due: {payment.due_date}</p>
                        </div>
                        <p className="font-semibold text-gray-900">₹{payment.amount}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No upcoming payments</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 