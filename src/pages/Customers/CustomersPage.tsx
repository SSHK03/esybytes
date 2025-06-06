import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/UI/Table';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import EmptyState from '../../components/UI/EmptyState';

const CustomersPage: React.FC = () => {
  const { customers } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(customer => {
    const searchString = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchString) ||
      customer.email.toLowerCase().includes(searchString) ||
      (customer.companyName && customer.companyName.toLowerCase().includes(searchString)) ||
      (customer.gstin && customer.gstin.toLowerCase().includes(searchString))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-bold text-gray-800">Customers</h2>
          <Badge variant="info" className="ml-2">{customers.length}</Badge>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => navigate('/customers/new')}
        >
          Add New Customer
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
              placeholder="Search customers..."
              className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {customers.length === 0 ? (
          <EmptyState
            icon={<Users size={48} />}
            title="No customers yet"
            description="Add your first customer to get started. You can add individual customers or businesses."
            action={{
              label: "Add New Customer",
              onClick: () => navigate('/customers/new')
            }}
          />
        ) : filteredCustomers.length === 0 ? (
          <EmptyState
            icon={<Search size={48} />}
            title="No matching customers"
            description="Try adjusting your search to find what you're looking for."
            action={{
              label: "Clear Search",
              onClick: () => setSearchTerm('')
            }}
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Company</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>GSTIN</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredCustomers.map((customer) => (
                <Tr 
                  key={customer.id} 
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <Td className="font-medium text-gray-800">{customer.name}</Td>
                  <Td>{customer.companyName || '—'}</Td>
                  <Td>{customer.email}</Td>
                  <Td>{customer.phone || '—'}</Td>
                  <Td>{customer.gstin || '—'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default CustomersPage;