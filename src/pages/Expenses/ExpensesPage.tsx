import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Plus, Search, Filter, Download } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/UI/Table';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import EmptyState from '../../components/UI/EmptyState';
import { format } from 'date-fns';

const ExpensesPage: React.FC = () => {
  const { expenses, getVendorById, loading } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'secondary',
      paid: 'success',
      pending: 'warning',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const filteredExpenses = expenses.filter((expense) => {
    const vendor = getVendorById(expense.vendorId);
    const matchesSearch =
      expense.expenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesFilter = statusFilter === 'all' || expense.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
  const paidExpenses = expenses.filter(e => e.status === 'paid').reduce((sum, expense) => sum + expense.totalAmount, 0);
  const pendingExpenses = expenses.filter(e => e.status === 'pending').reduce((sum, expense) => sum + expense.totalAmount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading expenses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-bold text-gray-800">Expenses</h2>
          <Badge variant="info" className="ml-2">{expenses.length}</Badge>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/expenses/new')}>
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold">₹{totalExpenses.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-green-600">₹{paidExpenses.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-orange-600">₹{pendingExpenses.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <DollarSign className="text-orange-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search expenses..."
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
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <EmptyState
            icon={<DollarSign size={48} />}
            title="No expenses found"
            description="Track your business expenses to manage cash flow better."
            action={
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/expenses/new')}>
                Add Expense
              </Button>
            }
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Expense #</Th>
                <Th>Description</Th>
                <Th>Vendor</Th>
                <Th>Date</Th>
                <Th>Category</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredExpenses.map((expense) => {
                const vendor = getVendorById(expense.vendorId);
                return (
                  <Tr key={expense.id} onClick={() => navigate(`/expenses/${expense.id}`)}>
                    <Td className="font-medium text-blue-600">{expense.expenseNumber}</Td>
                    <Td className="max-w-xs truncate">{expense.description}</Td>
                    <Td>{vendor?.name || '-'}</Td>
                    <Td>{format(new Date(expense.date), 'MMM dd, yyyy')}</Td>
                    <Td>{expense.category || '-'}</Td>
                    <Td className="font-medium">₹{expense.totalAmount.toFixed(2)}</Td>
                    <Td>{getStatusBadge(expense.status)}</Td>
                    <Td>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/expenses/${expense.id}/edit`);
                        }}
                      >
                        Edit
                      </Button>
                    </Td>
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

export default ExpensesPage; 