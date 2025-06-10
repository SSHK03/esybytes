import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Plus, Search, Filter, Download } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/UI/Table';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import EmptyState from '../../components/UI/EmptyState';
import { format } from 'date-fns';

const BillsPage: React.FC = () => {
  const { bills, getVendorById, loading } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'secondary',
      sent: 'info',
      paid: 'success',
      overdue: 'danger',
      cancelled: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const filteredBills = bills.filter((bill) => {
    const vendor = getVendorById(bill.vendorId);
    const matchesSearch =
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesFilter = statusFilter === 'all' || bill.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const exportBillAsPDF = (bill: any, vendor: any) => {
    // Implementation for PDF export
    console.log('Exporting bill as PDF:', bill, vendor);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading bills...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-bold text-gray-800">Bills</h2>
          <Badge variant="info" className="ml-2">{bills.length}</Badge>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/bills/new')}>
            Create Bill
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by bill number or vendor..."
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
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        {filteredBills.length === 0 ? (
          <EmptyState
            icon={<Receipt size={48} />}
            title="No bills found"
            description="Create your first bill to get started."
            action={
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/bills/new')}>
                Create Bill
              </Button>
            }
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Bill #</Th>
                <Th>Vendor</Th>
                <Th>Date</Th>
                <Th>Due Date</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredBills.map((bill) => {
                const vendor = getVendorById(bill.vendorId);
                return (
                  <Tr key={bill.id} onClick={() => navigate(`/bills/${bill.id}`)}>
                    <Td className="font-medium text-blue-600">{bill.billNumber}</Td>
                    <Td>{vendor?.name || 'Unknown'}</Td>
                    <Td>{format(new Date(bill.date), 'MMM dd, yyyy')}</Td>
                    <Td>{format(new Date(bill.dueDate), 'MMM dd, yyyy')}</Td>
                    <Td className="font-medium">₹{bill.total.toFixed(2)}</Td>
                    <Td>{getStatusBadge(bill.status)}</Td>
                    <Td>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Download size={16} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          exportBillAsPDF(bill, vendor);
                        }}
                      >
                        Download
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

export default BillsPage; 