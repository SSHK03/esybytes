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
    stockQuantity: '',
    hsnCode: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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
    if (!formData.price.trim()) newErrors.price = 'Price is required';
    if (formData.type === 'product' && !formData.hsnCode.trim()) newErrors.hsnCode = 'HSN code is required';
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);

    const item = {
      ...formData,
      price: Number(formData.price),
      tax: formData.tax ? Number(formData.tax) : undefined,
      stockQuantity: formData.type === 'product' ? Number(formData.stockQuantity || '0') : undefined,
    };

    addItem(item);
    navigate('/items');
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
              <input name="name" value={formData.name} onChange={handleChange} className="input" />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
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
              <input name="price" value={formData.price} onChange={handleChange} className="input" />
              {errors.price && <p className="text-sm text-red-600">{errors.price}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tax (%)</label>
              <input name="tax" value={formData.tax} onChange={handleChange} className="input" />
            </div>

            {formData.type === 'product' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">SKU</label>
                  <input name="sku" value={formData.sku} onChange={handleChange} className="input" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">HSN Code *</label>
                  <input name="hsnCode" value={formData.hsnCode} onChange={handleChange} className="input" />
                  {errors.hsnCode && <p className="text-sm text-red-600">{errors.hsnCode}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <select name="unit" value={formData.unit} onChange={handleChange} className="input">
                    <option value="piece">Piece</option>
                    <option value="kg">Kilogram</option>
                    <option value="hour">Hour</option>
                    <option value="litre">Litre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Opening Stock Quantity</label>
                  <input name="stockQuantity" type="number" value={formData.stockQuantity} onChange={handleChange} className="input" />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea name="description" rows={3} value={formData.description} onChange={handleChange} className="input" />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="outline" className="mr-3" type="button" onClick={() => navigate('/items')}>
              Cancel
            </Button>
            <Button variant="primary" icon={<Save size={16} />} type="submit">
              Save
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default NewItemPage;
