import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Save, Trash2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '../../context/AppContext';
import { LineItem } from '../../types';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/UI/Table';

const NewSalesOrderPage: React.FC = () => {
  const { customers, items, addSalesOrder } = useAppContext();
  const navigate = useNavigate();

  const today = format(new Date(), 'yyyy-MM-dd');
  
  const [formData, setFormData] = useState({
    customerId: '',
    orderNumber: `SO-${Math.floor(10000 + Math.random() * 90000)}`,
    date: today,
    dueDate: '',
    status: 'draft',
    notes: ''
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [errors, setErrors] = useState<{
    customerId?: string;
    items?: string;
  }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field if it exists
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: undefined
      });
    }
  };

  const handleAddLineItem = () => {
    const newItem: LineItem = {
      id: uuidv4(),
      itemId: '',
      description: '',
      quantity: 1,
      price: 0,
      tax: 0,
      total: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleLineItemChange = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // If itemId changed, update price, description and tax from the selected item
        if (field === 'itemId' && value) {
          const selectedItem = items.find(i => i.id === value);
          if (selectedItem) {
            updatedItem.price = selectedItem.price;
            updatedItem.description = selectedItem.description || '';
            updatedItem.tax = selectedItem.tax || 0;
          }
        }
        
        // Recalculate total whenever quantity, price, or tax changes
        if (['quantity', 'price', 'tax'].includes(field)) {
          const quantity = updatedItem.quantity;
          const price = updatedItem.price;
          const tax = updatedItem.tax || 0;
          
          const subtotal = quantity * price;
          const taxAmount = subtotal * (tax / 100);
          updatedItem.total = subtotal + taxAmount;
        }
        
        return updatedItem;
      }
      return item;
    }));
    
    // Clear items error if it exists
    if (errors.items) {
      setErrors({
        ...errors,
        items: undefined
      });
    }
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const taxTotal = lineItems.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.price;
      return sum + (itemSubtotal * (item.tax / 100));
    }, 0);
    const total = subtotal + taxTotal;
    
    return { subtotal, taxTotal, total };
  };

  const validateForm = (): boolean => {
    const newErrors: {
      customerId?: string;
      items?: string;
    } = {};
    
    if (!formData.customerId) {
      newErrors.customerId = 'Customer is required';
    }
    
    if (lineItems.length === 0 || lineItems.some(item => !item.itemId)) {
      newErrors.items = 'At least one item is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const { subtotal, taxTotal, total } = calculateTotals();
    
    const newSalesOrder = {
      customerId: formData.customerId,
      orderNumber: formData.orderNumber,
      date: formData.date,
      dueDate: formData.dueDate || undefined,
      status: formData.status as 'draft' | 'open' | 'confirmed' | 'delivered' | 'cancelled',
      items: lineItems,
      notes: formData.notes || undefined,
      subtotal,
      taxTotal,
      total
    };
    
    addSalesOrder(newSalesOrder);
    navigate('/sales-orders');
  };

  const { subtotal, taxTotal, total } = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate('/sales-orders')}
          className="mr-4"
        >
          Back to Sales Orders
        </Button>
        <h2 className="text-2xl font-bold text-gray-800">Create Sales Order</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer*
                </label>
                <select
                  id="customerId"
                  name="customerId"
                  value={formData.customerId}
                  onChange={handleChange}
                  className={`w-full rounded-md border ${errors.customerId ? 'border-red-500' : 'border-gray-300'} px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.companyName ? `(${customer.companyName})` : ''}
                    </option>
                  ))}
                </select>
                {errors.customerId && <p className="mt-1 text-sm text-red-600">{errors.customerId}</p>}
              </div>

              <div>
                <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Sales Order #
                </label>
                <input
                  id="orderNumber"
                  name="orderNumber"
                  type="text"
                  value={formData.orderNumber}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Date
                </label>
                <input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">Line Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Plus size={16} />}
                onClick={handleAddLineItem}
              >
                Add Item
              </Button>
            </div>

            {errors.items && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{errors.items}</p>
            )}

            <Table>
              <Thead>
                <Tr>
                  <Th>Item</Th>
                  <Th>Description</Th>
                  <Th>Quantity</Th>
                  <Th>Price</Th>
                  <Th>Tax (%)</Th>
                  <Th>Total</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {lineItems.map((lineItem, index) => (
                  <Tr key={lineItem.id}>
                    <Td>
                      <select
                        value={lineItem.itemId}
                        onChange={(e) => handleLineItemChange(lineItem.id, 'itemId', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">Select an item</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </Td>
                    <Td>
                      <input
                        type="text"
                        value={lineItem.description}
                        onChange={(e) => handleLineItemChange(lineItem.id, 'description', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </Td>
                    <Td>
                      <input
                        type="number"
                        min="1"
                        value={lineItem.quantity}
                        onChange={(e) => handleLineItemChange(lineItem.id, 'quantity', Number(e.target.value))}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </Td>
                    <Td>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-xs">$</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={lineItem.price}
                          onChange={(e) => handleLineItemChange(lineItem.id, 'price', Number(e.target.value))}
                          className="w-full pl-6 rounded-md border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </Td>
                    <Td>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={lineItem.tax}
                        onChange={(e) => handleLineItemChange(lineItem.id, 'tax', Number(e.target.value))}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </Td>
                    <Td className="font-medium">
                      ${lineItem.total.toFixed(2)}
                    </Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(lineItem.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </Td>
                  </Tr>
                ))}
                
                {lineItems.length === 0 && (
                  <Tr>
                    <Td colSpan={7} className="text-center py-4 text-gray-500">
                      No items added. Click "Add Item" to add a line item.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>

            {lineItems.length > 0 && (
              <div className="mt-6 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Subtotal:</span>
                    <span className="text-sm">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tax:</span>
                    <span className="text-sm">${taxTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold text-lg">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any notes or special instructions for this order..."
              />
            </div>
          </Card>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/sales-orders')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Save size={16} />}
            >
              Save Sales Order
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewSalesOrderPage;