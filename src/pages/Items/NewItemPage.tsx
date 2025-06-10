import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';

const NewItemPage: React.FC = () => {
  const { addItem } = useAppContext();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    type: 'product',
    unit: 'piece',
    price: '',
    tax: '',
    quantity: '',
    hsnCode: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required';
    if (!formData.price.trim()) newErrors.price = 'Price is required';
    if (isNaN(Number(formData.price))) newErrors.price = 'Price must be a valid number';
    if (formData.type === 'product' && !formData.hsnCode.trim()) newErrors.hsnCode = 'HSN code is required';
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);

    setLoading(true);
    try {
      const item = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description,
        type: formData.type as 'product' | 'service',
        price: Number(formData.price),
        tax: formData.tax ? Number(formData.tax) : 0,
        quantity: formData.type === 'product' ? Number(formData.quantity || '0') : 0,
        unit: formData.unit,
        hsnCode: formData.hsnCode,
      };

      await addItem(item);
      navigate('/items');
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/items')} className="mr-4">
          Back
        </Button>
        <h2 className="text-2xl font-semibold">Add New {formData.type === 'product' ? 'Product' : 'Service'}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                className="input" 
                placeholder="Enter item name"
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">SKU *</label>
              <input 
                name="sku" 
                value={formData.sku} 
                onChange={handleChange} 
                className="input" 
                placeholder="Enter SKU"
              />
              {errors.sku && <p className="text-sm text-red-600">{errors.sku}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Type *</label>
              <select name="type" value={formData.type} onChange={handleChange} className="input">
                <option value="product">Product</option>
                <option value="service">Service</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Price *</label>
              <input 
                name="price" 
                type="number"
                step="0.01"
                value={formData.price} 
                onChange={handleChange} 
                className="input" 
                placeholder="0.00"
              />
              {errors.price && <p className="text-sm text-red-600">{errors.price}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tax (%)</label>
              <input 
                name="tax" 
                type="number"
                step="0.01"
                value={formData.tax} 
                onChange={handleChange} 
                className="input" 
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <input 
                name="unit" 
                value={formData.unit} 
                onChange={handleChange} 
                className="input" 
                placeholder="piece, kg, etc."
              />
            </div>

            {formData.type === 'product' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Quantity</label>
                  <input 
                    name="quantity" 
                    type="number"
                    value={formData.quantity} 
                    onChange={handleChange} 
                    className="input" 
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">HSN Code *</label>
                  <input 
                    name="hsnCode" 
                    value={formData.hsnCode} 
                    onChange={handleChange} 
                    className="input" 
                    placeholder="Enter HSN code"
                  />
                  {errors.hsnCode && <p className="text-sm text-red-600">{errors.hsnCode}</p>}
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                className="input" 
                rows={3}
                placeholder="Enter item description"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button 
              type="submit" 
              variant="primary" 
              icon={<Save size={16} />}
              loading={loading}
            >
              Save Item
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default NewItemPage;
