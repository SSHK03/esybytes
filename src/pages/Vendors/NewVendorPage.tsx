import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import Button from '../../components/UI/Button';
import Card from '../../components/UI/Card';

const NewVendorPage: React.FC = () => {
  const { addVendor } = useAppContext();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    gstin: '',
    panNumber: '',
    billingAddress: '',
    shippingAddress: '',
    paymentTerms: 30,
  });

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    gstin?: string;
  }>({});

  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: {
      name?: string;
      email?: string;
      gstin?: string;
    } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin)) {
      newErrors.gstin = 'Invalid GSTIN format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await addVendor(formData);
      navigate('/vendors');
    } catch (error) {
      console.error('Failed to add vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/vendors')} className="mr-4">
          Back
        </Button>
        <h2 className="text-2xl font-semibold">Add New Vendor</h2>
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
                placeholder="Enter vendor name"
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="Enter email address"
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <input
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="input"
                placeholder="Enter company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">GSTIN</label>
              <input
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                className="input"
                placeholder="Enter GSTIN"
              />
              {errors.gstin && <p className="text-sm text-red-600">{errors.gstin}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">PAN Number</label>
              <input
                name="panNumber"
                value={formData.panNumber}
                onChange={handleChange}
                className="input"
                placeholder="Enter PAN number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Payment Terms (Days)</label>
              <select
                name="paymentTerms"
                value={formData.paymentTerms}
                onChange={handleChange}
                className="input"
              >
                <option value={0}>Due on Receipt</option>
                <option value={7}>Net 7</option>
                <option value={15}>Net 15</option>
                <option value={30}>Net 30</option>
                <option value={45}>Net 45</option>
                <option value={60}>Net 60</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Billing Address</label>
              <textarea
                name="billingAddress"
                value={formData.billingAddress}
                onChange={handleChange}
                className="input"
                rows={3}
                placeholder="Enter billing address"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Shipping Address</label>
              <textarea
                name="shippingAddress"
                value={formData.shippingAddress}
                onChange={handleChange}
                className="input"
                rows={3}
                placeholder="Enter shipping address"
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
              Save Vendor
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default NewVendorPage; 