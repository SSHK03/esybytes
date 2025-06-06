import React from 'react';
import { BarChart2, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const ReportsPage: React.FC = () => {
  const { invoices, salesOrders, customers } = useAppContext();

  // Calculate monthly revenue data for the last 6 months
  const getMonthlyData = () => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), i);
      return {
        month: format(date, 'MMM yyyy'),
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
    }).reverse();

    return months.map(({ month, start, end }) => {
      const revenue = invoices
        .filter(inv => 
          inv.status === 'paid' &&
          new Date(inv.date) >= start &&
          new Date(inv.date) <= end
        )
        .reduce((sum, inv) => sum + inv.total, 0);

      return {
        name: month,
        revenue: revenue,
      };
    });
  };

  const monthlyData = getMonthlyData();

  // Calculate top customers
  const topCustomers = Object.entries(
    invoices.reduce((acc, invoice) => {
      if (invoice.status === 'paid') {
        acc[invoice.customerId] = (acc[invoice.customerId] || 0) + invoice.total;
      }
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([customerId, total]) => ({
      customer: customers.find(c => c.id === customerId)?.name || 'Unknown',
      total
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Calculate key metrics
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalOrders = salesOrders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const exportReports = () => {
    // Implement export functionality
    console.log('Exporting reports...');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Reports</h2>
        <Button
          variant="outline"
          icon={<Download size={16} />}
          onClick={exportReports}
        >
          Export Reports
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold">{totalOrders}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <BarChart2 className="text-green-600" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Order Value</p>
              <p className="text-2xl font-bold">${averageOrderValue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="text-purple-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card title="Revenue Overview">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#1A365D" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top Customers */}
      <Card title="Top Customers">
        <div className="space-y-4">
          {topCustomers.map((customer, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">{customer.customer}</p>
                <p className="text-sm text-gray-600">Total Revenue</p>
              </div>
              <p className="text-lg font-bold">${customer.total.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Sales Performance */}
      <Card title="Sales Performance">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-medium mb-4">Order Status Distribution</h4>
            <div className="space-y-3">
              {['confirmed', 'delivered', 'cancelled'].map(status => {
                const count = salesOrders.filter(order => order.status === status).length;
                const percentage = (count / totalOrders) * 100;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{status}</span>
                      <span>{count} orders ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          status === 'delivered' ? 'bg-green-500' :
                          status === 'confirmed' ? 'bg-blue-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-4">Payment Status</h4>
            <div className="space-y-3">
              {['paid', 'pending', 'overdue'].map(status => {
                const count = invoices.filter(inv => 
                  status === 'pending' ? inv.status === 'sent' : inv.status === status
                ).length;
                const percentage = (count / invoices.length) * 100;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{status}</span>
                      <span>{count} invoices ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          status === 'paid' ? 'bg-green-500' :
                          status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ReportsPage;