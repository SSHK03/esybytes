import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/UI/Table';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import EmptyState from '../../components/UI/EmptyState';

const VendorsPage: React.FC = () => {
  const { vendors, loading } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVendors = vendors.filter(vendor => {
    const searchString = searchTerm.toLowerCase();
    return (
      vendor.name.toLowerCase().includes(searchString) ||
      vendor.email.toLowerCase().includes(searchString) ||
      (vendor.companyName && vendor.companyName.toLowerCase().includes(searchString)) ||
      (vendor.gstin && vendor.gstin.toLowerCase().includes(searchString))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading vendors...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-bold text-gray-800">Vendors</h2>
          <Badge variant="info" className="ml-2">{vendors.length}</Badge>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => navigate('/vendors/new')}
        >
          Add New Vendor
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
              placeholder="Search vendors..."
              className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {filteredVendors.length === 0 ? (
          <EmptyState
            icon={<Building2 size={48} />}
            title="No vendors found"
            description="Get started by adding your first vendor."
            action={
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/vendors/new')}>
                Add Vendor
              </Button>
            }
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
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredVendors.map((vendor) => (
                <Tr key={vendor.id} onClick={() => navigate(`/vendors/${vendor.id}`)}>
                  <Td className="font-medium text-blue-600">{vendor.name}</Td>
                  <Td>{vendor.companyName || '-'}</Td>
                  <Td>{vendor.email}</Td>
                  <Td>{vendor.phone || '-'}</Td>
                  <Td>{vendor.gstin || '-'}</Td>
                  <Td>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/vendors/${vendor.id}/edit`);
                      }}
                    >
                      Edit
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default VendorsPage; 