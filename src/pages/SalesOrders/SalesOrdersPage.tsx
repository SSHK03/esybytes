import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Search, Filter } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/UI/Table';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import EmptyState from '../../components/UI/EmptyState';
import { format } from 'date-fns';

const SalesOrdersPage: React.FC = () => {
  const { salesOrders, getCustomerById } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'open':
        return <Badge variant="info">Open</Badge>;
      case 'confirmed':
        return <Badge variant="primary">Confirmed</Badge>;
      case 'delivered':
        return <Badge variant="success">Delivered</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredOrders = salesOrders.filter(order => {
    const customer = getCustomerById(order.customerId);
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesFilter = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-bold text-gray-800">Sales Orders</h2>
          <Badge variant="info" className="ml-2">{salesOrders.length}</Badge>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => navigate('/sales-orders/new')}
        >
          Create Sales Order
        </Button>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order number or customer..."
              className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="confirmed">Confirmed</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        {salesOrders.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={48} />}
            title="No sales orders yet"
            description="Create your first sales order to get started. Sales orders help you track customer purchases before creating invoices."
            action={{
              label: "Create Sales Order",
              onClick: () => navigate('/sales-orders/new')
            }}
          />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={<Search size={48} />}
            title="No matching sales orders"
            description="Try adjusting your search or filter to find what you're looking for."
            action={{
              label: "Clear Filters",
              onClick: () => {
                setSearchTerm('');
                setStatusFilter('all');
              }
            }}
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Order #</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredOrders.map((order) => {
                const customer = getCustomerById(order.customerId);
                return (
                  <Tr 
                    key={order.id} 
                    onClick={() => navigate(`/sales-orders/${order.id}`)}
                  >
                    <Td className="font-medium text-blue-600">{order.orderNumber}</Td>
                    <Td>{customer?.name || 'Unknown'}</Td>
                    <Td>{format(new Date(order.date), 'MMM dd, yyyy')}</Td>
                    <Td className="font-medium">${order.total.toFixed(2)}</Td>
                    <Td>{getStatusBadge(order.status)}</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default SalesOrdersPage;