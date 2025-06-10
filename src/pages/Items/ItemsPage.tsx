import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Upload, Download } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/UI/Table';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import Badge from '../../components/UI/Badge';
import EmptyState from '../../components/UI/EmptyState';
import { itemApi } from '../../lib/api';
import { toast } from 'react-toastify';

const ItemsPage: React.FC = () => {
  const { items, loading } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'> = {
      product: 'primary',
      service: 'secondary',
    };
    return <Badge variant={variants[type] || 'primary'}>{type}</Badge>;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await itemApi.importExcel(file);
      toast.success('Items imported successfully');
      // Refresh the data
      window.location.reload();
    } catch (error) {
      console.error('Failed to import items:', error);
      toast.error('Failed to import items');
    }
  };

  const exportItemsAsPDF = () => {
    // Implementation for PDF export
    toast.info('PDF export feature coming soon');
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesFilter = typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading items...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Items</h2>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/items/new')}>
          Add Item
        </Button>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="product">Products</option>
              <option value="service">Services</option>
            </select>
            <Button variant="outline" icon={<Upload size={16} />}>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                Import
              </label>
            </Button>
            <Button variant="outline" icon={<Download size={16} />} onClick={exportItemsAsPDF}>
              Export
            </Button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState
            icon={<FileText size={48} />}
            title="No items found"
            description="Get started by adding your first item."
            action={{
              label: 'Add Item',
              onClick: () => navigate('/items/new')
            }}
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>SKU</Th>
                <Th>Type</Th>
                <Th>Price</Th>
                <Th>Stock</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredItems.map((item) => (
                <Tr key={item.id} onClick={() => navigate(`/items/${item.id}`)}>
                  <Td className="font-medium text-blue-600">{item.name}</Td>
                  <Td>{item.sku}</Td>
                  <Td>{getTypeBadge(item.type)}</Td>
                  <Td className="font-medium">₹{item.price.toFixed(2)}</Td>
                  <Td>
                    {item.type === 'product' ? (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.quantity > 10 ? 'bg-green-100 text-green-800' :
                        item.quantity > 0 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.quantity} {item.unit}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </Td>
                  <Td>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/items/${item.id}/edit`);
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

export default ItemsPage;
