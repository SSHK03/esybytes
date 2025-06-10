import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Customer, 
  Item, 
  SalesOrder, 
  Invoice 
} from '../types';
import { customerApi, itemApi, salesOrderApi, invoiceApi, ApiError } from '../lib/api';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

interface AppContextType {
  customers: Customer[];
  items: Item[];
  salesOrders: SalesOrder[];
  invoices: Invoice[];
  loading: boolean;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Item>;
  updateItem: (id: string, item: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addSalesOrder: (order: Omit<SalesOrder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SalesOrder>;
  updateSalesOrder: (id: string, order: Partial<SalesOrder>) => Promise<void>;
  deleteSalesOrder: (id: string) => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Invoice>;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  getCustomerById: (id: string) => Customer | undefined;
  getItemById: (id: string) => Item | undefined;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  const loadData = async () => {
    if (!isAuthenticated) {
      return;
    }
    
    try {
      setLoading(true);
      const [customersData, itemsData, salesOrdersData, invoicesData] = await Promise.all([
        customerApi.getAll(),
        itemApi.getAll(),
        salesOrderApi.getAll(),
        invoiceApi.getAll()
      ]);

      setCustomers(customersData.data || []);
      setItems(itemsData.data || []);
      setSalesOrders(salesOrdersData.data || []);
      setInvoices(invoicesData.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      // Clear data when user logs out
      setCustomers([]);
      setItems([]);
      setSalesOrders([]);
      setInvoices([]);
    }
  }, [isAuthenticated]);

  const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newCustomer = await customerApi.create(customer);
      setCustomers(prev => [...prev, newCustomer]);
      toast.success('Customer added successfully');
      return newCustomer;
    } catch (error) {
      console.error('Failed to add customer:', error);
      toast.error('Failed to add customer');
      throw error;
    }
  };

  const updateCustomer = async (id: string, updatedFields: Partial<Customer>) => {
    try {
      const updatedCustomer = await customerApi.update(id, updatedFields);
      setCustomers(prev => prev.map(customer => 
        customer.id === id ? updatedCustomer : customer
      ));
      toast.success('Customer updated successfully');
    } catch (error) {
      console.error('Failed to update customer:', error);
      toast.error('Failed to update customer');
      throw error;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await customerApi.delete(id);
      setCustomers(prev => prev.filter(customer => customer.id !== id));
      toast.success('Customer deleted successfully');
    } catch (error) {
      console.error('Failed to delete customer:', error);
      toast.error('Failed to delete customer');
      throw error;
    }
  };

  const addItem = async (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newItem = await itemApi.create(item);
      setItems(prev => [...prev, newItem]);
      toast.success('Item added successfully');
      return newItem;
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error('Failed to add item');
      throw error;
    }
  };

  const updateItem = async (id: string, updatedFields: Partial<Item>) => {
    try {
      const updatedItem = await itemApi.update(id, updatedFields);
      setItems(prev => prev.map(item => 
        item.id === id ? updatedItem : item
      ));
      toast.success('Item updated successfully');
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error('Failed to update item');
      throw error;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await itemApi.delete(id);
      setItems(prev => prev.filter(item => item.id !== id));
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('Failed to delete item');
      throw error;
    }
  };

  const addSalesOrder = async (order: Omit<SalesOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newOrder = await salesOrderApi.create(order);
      setSalesOrders(prev => [...prev, newOrder]);
      toast.success('Sales order added successfully');
      return newOrder;
    } catch (error) {
      console.error('Failed to add sales order:', error);
      toast.error('Failed to add sales order');
      throw error;
    }
  };

  const updateSalesOrder = async (id: string, updatedFields: Partial<SalesOrder>) => {
    try {
      const updatedOrder = await salesOrderApi.update(id, updatedFields);
      setSalesOrders(prev => prev.map(order => 
        order.id === id ? updatedOrder : order
      ));
      toast.success('Sales order updated successfully');
    } catch (error) {
      console.error('Failed to update sales order:', error);
      toast.error('Failed to update sales order');
      throw error;
    }
  };

  const deleteSalesOrder = async (id: string) => {
    try {
      await salesOrderApi.delete(id);
      setSalesOrders(prev => prev.filter(order => order.id !== id));
      toast.success('Sales order deleted successfully');
    } catch (error) {
      console.error('Failed to delete sales order:', error);
      toast.error('Failed to delete sales order');
      throw error;
    }
  };

  const addInvoice = async (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newInvoice = await invoiceApi.create(invoice);
      setInvoices(prev => [...prev, newInvoice]);
      toast.success('Invoice added successfully');
      return newInvoice;
    } catch (error) {
      console.error('Failed to add invoice:', error);
      toast.error('Failed to add invoice');
      throw error;
    }
  };

  const updateInvoice = async (id: string, updatedFields: Partial<Invoice>) => {
    try {
      const updatedInvoice = await invoiceApi.update(id, updatedFields);
      setInvoices(prev => prev.map(invoice => 
        invoice.id === id ? updatedInvoice : invoice
      ));
      toast.success('Invoice updated successfully');
    } catch (error) {
      console.error('Failed to update invoice:', error);
      toast.error('Failed to update invoice');
      throw error;
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      await invoiceApi.delete(id);
      setInvoices(prev => prev.filter(invoice => invoice.id !== id));
      toast.success('Invoice deleted successfully');
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      toast.error('Failed to delete invoice');
      throw error;
    }
  };

  const getCustomerById = (id: string) => {
    return customers.find(customer => customer.id === id);
  };

  const getItemById = (id: string) => {
    return items.find(item => item.id === id);
  };

  const refreshData = async () => {
    await loadData();
  };

  return (
    <AppContext.Provider 
      value={{ 
        customers, 
        items, 
        salesOrders, 
        invoices,
        loading,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addItem,
        updateItem,
        deleteItem,
        addSalesOrder,
        updateSalesOrder,
        deleteSalesOrder,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        getCustomerById,
        getItemById,
        refreshData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};