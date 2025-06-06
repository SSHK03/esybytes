import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  FileText,
  ShoppingCart,
  Clock,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import { format } from 'date-fns';
import LowStockNotification from '../../components/UI/LowStockNotification';

const DashboardPage: React.FC = () => {
  const { invoices, salesOrders, items } = useAppContext();
  const navigate = useNavigate();

  const totalRevenue = invoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.total, 0);

  const outstandingInvoices = invoices
    .filter(invoice => invoice.status === 'sent' || invoice.status === 'overdue')
    .reduce((sum, invoice) => sum + invoice.total, 0);

  const openSalesOrders = salesOrders.filter(order =>
    order.status === 'open' || order.status === 'confirmed'
  ).length;

  const lowStockItems = items.filter(item =>
    item.type === 'product' &&
    item.stockQuantity !== undefined &&
    item.stockQuantity <= 5
  ).length;

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

      <LowStockNotification items={items} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Revenue</p>
              <h3 className="text-2xl font-bold">{formatINR(totalRevenue)}</h3>
            </div>
            <div className="bg-blue-400 bg-opacity-30 p-3 rounded-full">
              <FileText size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-blue-100">
            <TrendingUp size={16} className="mr-1" />
            <span className="text-xs">+12% from last month</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium mb-1">Outstanding</p>
              <h3 className="text-2xl font-bold">{formatINR(outstandingInvoices)}</h3>
            </div>
            <div className="bg-orange-400 bg-opacity-30 p-3 rounded-full">
              <FileText size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-orange-100">
            <Clock size={16} className="mr-1" />
            <span className="text-xs">{invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length} unpaid invoices</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500 to-teal-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm font-medium mb-1">Open Orders</p>
              <h3 className="text-2xl font-bold">{openSalesOrders}</h3>
            </div>
            <div className="bg-teal-400 bg-opacity-30 p-3 rounded-full">
              <ShoppingCart size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-teal-100">
            <TrendingUp size={16} className="mr-1" />
            <span className="text-xs">3 new orders this week</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium mb-1">Low Stock Items</p>
              <h3 className="text-2xl font-bold">{lowStockItems}</h3>
            </div>
            <div className="bg-red-400 bg-opacity-30 p-3 rounded-full">
              <AlertCircle size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-red-100">
            <TrendingDown size={16} className="mr-1" />
            <span className="text-xs">{lowStockItems} items need reordering</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Invoices">
          <div className="space-y-3">
            {invoices.length > 0 ? (
              invoices.slice(0, 5).map((invoice, index) => (
                <div
                  key={invoice.id}
                  className={`flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer ${
                    index !== invoices.slice(0, 5).length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                >
                  <div>
                    <p className="font-medium text-gray-800">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">
                      Due: {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">{formatINR(invoice.total)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      invoice.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : invoice.status === 'overdue'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p>No invoices yet</p>
              </div>
            )}
          </div>
          {invoices.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/invoices')}
              >
                View All Invoices
              </Button>
            </div>
          )}
        </Card>

        <Card title="Recent Sales Orders">
          <div className="space-y-3">
            {salesOrders.length > 0 ? (
              salesOrders.slice(0, 5).map((order, index) => (
                <div
                  key={order.id}
                  className={`flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer ${
                    index !== salesOrders.slice(0, 5).length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                  onClick={() => navigate(`/sales-orders/${order.id}`)}
                >
                  <div>
                    <p className="font-medium text-gray-800">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500">
                      Created: {format(new Date(order.date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">{formatINR(order.total)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'confirmed'
                        ? 'bg-blue-100 text-blue-800'
                        : order.status === 'delivered'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p>No sales orders yet</p>
              </div>
            )}
          </div>
          {salesOrders.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/sales-orders')}
              >
                View All Sales Orders
              </Button>
            </div>
          )}
        </Card>
      </div>

      <Card title="Quick Actions">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => navigate('/invoices/new')}
          >
            New Invoice
          </Button>
          <Button
            variant="outline"
            icon={<ShoppingCart size={16} />}
            onClick={() => navigate('/sales-orders/new')}
          >
            New Sales Order
          </Button>
          <Button
            variant="outline"
            icon={<Gauge size={16} />}
            onClick={() => navigate('/items/new')}
          >
            Add Item
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
