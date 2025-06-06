import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Search, Filter } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/UI/Table';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import EmptyState from '../../components/UI/EmptyState';

const ItemsPage: React.FC = () => {
  const { items } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'product' | 'service'>('all');

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (item.description?.toLowerCase().includes(searchTerm.toLowerCase()) || '');
    const matchesFilter = filterType === 'all' || item.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-bold text-gray-800">Items</h2>
          <Badge variant="info" className="ml-2">{items.length}</Badge>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => navigate('/items/new')}
        >
          Add New Item
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
              placeholder="Search items..."
              className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'product' | 'service')}
              className="pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Types</option>
              <option value="product">Products</option>
              <option value="service">Services</option>
            </select>
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={<Package size={48} />}
            title="No items yet"
            description="Add your first item to get started. Items can be products or services that you sell to your customers."
            action={{
              label: "Add New Item",
              onClick: () => navigate('/items/new')
            }}
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={<Search size={48} />}
            title="No matching items"
            description="Try adjusting your search or filter to find what you're looking for."
            action={{
              label: "Clear Filters",
              onClick: () => {
                setSearchTerm('');
                setFilterType('all');
              }
            }}
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Price</Th>
                <Th>Tax Rate</Th>
                <Th>Stock</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredItems.map((item) => (
                <Tr key={item.id} onClick={() => navigate(`/items/${item.id}`)} className="hover:bg-gray-50">
                  <Td className="font-medium text-gray-800">{item.name}</Td>
                  <Td>
                    <Badge 
                      variant={item.type === 'product' ? 'primary' : 'secondary'}
                    >
                      {item.type === 'product' ? 'Product' : 'Service'}
                    </Badge>
                  </Td>
                  <Td className="font-medium">${item.price.toFixed(2)}</Td>
                  <Td>{item.tax ? `${item.tax}%` : 'N/A'}</Td>
                  <Td>
                    {item.type === 'product' ? (
                      <span className={`${
                        (item.stockQuantity || 0) <= 5 ? 'text-red-600' : 'text-gray-700'
                      }`}>
                        {item.stockQuantity || 0} {item.unit || 'units'}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
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

export default ItemsPage;