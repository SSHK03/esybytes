import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Customer, 
  Item, 
  SalesOrder, 
  Invoice 
} from '../types';

interface AppContextType {
  customers: Customer[];
  items: Item[];
  salesOrders: SalesOrder[];
  invoices: Invoice[];
  addCustomer: (customer: Omit<Customer, 'id'>) => Customer;
  addItem: (item: Omit<Item, 'id'>) => Item;
  updateItem: (id: string, item: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  addSalesOrder: (order: Omit<SalesOrder, 'id'>) => SalesOrder;
  updateSalesOrder: (id: string, order: Partial<SalesOrder>) => void;
  deleteSalesOrder: (id: string) => void;
  addInvoice: (invoice: Omit<Invoice, 'id'>) => Invoice;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  getCustomerById: (id: string) => Customer | undefined;
  getItemById: (id: string) => Item | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Load mock data for demo purposes
const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john@example.com',
    phone: '555-123-4567',
    companyName: 'Smith Enterprises'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    phone: '555-987-6543',
    companyName: 'Johnson Consulting'
  }
];

const mockItems: Item[] = [
  {
    id: '1',
    name: 'Web Design Package',
    description: 'Complete website design service',
    type: 'service',
    price: 1500,
    tax: 10
  },
  {
    id: '2',
    name: 'Laptop',
    description: 'Business laptop - 16GB RAM, 512GB SSD',
    type: 'product',
    price: 1200,
    tax: 7.5,
    stockQuantity: 25,
    unit: 'piece'
  }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('customers');
    return saved ? JSON.parse(saved) : mockCustomers;
  });
  
  const [items, setItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem('items');
    return saved ? JSON.parse(saved) : mockItems;
  });
  
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(() => {
    const saved = localStorage.getItem('salesOrders');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('invoices');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('customers', JSON.stringify(customers));
  }, [customers]);
  
  useEffect(() => {
    localStorage.setItem('items', JSON.stringify(items));
  }, [items]);
  
  useEffect(() => {
    localStorage.setItem('salesOrders', JSON.stringify(salesOrders));
  }, [salesOrders]);
  
  useEffect(() => {
    localStorage.setItem('invoices', JSON.stringify(invoices));
  }, [invoices]);

  const addCustomer = (customer: Omit<Customer, 'id'>) => {
    const newCustomer = { ...customer, id: uuidv4() };
    setCustomers([...customers, newCustomer]);
    return newCustomer;
  };

  const addItem = (item: Omit<Item, 'id'>) => {
    const newItem = { ...item, id: uuidv4() };
    setItems([...items, newItem]);
    return newItem;
  };

  const updateItem = (id: string, updatedFields: Partial<Item>) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, ...updatedFields } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const addSalesOrder = (order: Omit<SalesOrder, 'id'>) => {
    const newOrder = { ...order, id: uuidv4() };
    setSalesOrders([...salesOrders, newOrder]);
    return newOrder;
  };

  const updateSalesOrder = (id: string, updatedFields: Partial<SalesOrder>) => {
    setSalesOrders(salesOrders.map(order => 
      order.id === id ? { ...order, ...updatedFields } : order
    ));
  };

  const deleteSalesOrder = (id: string) => {
    setSalesOrders(salesOrders.filter(order => order.id !== id));
  };

  const addInvoice = (invoice: Omit<Invoice, 'id'>) => {
    const newInvoice = { ...invoice, id: uuidv4() };
    setInvoices([...invoices, newInvoice]);
    return newInvoice;
  };

  const updateInvoice = (id: string, updatedFields: Partial<Invoice>) => {
    setInvoices(invoices.map(invoice => 
      invoice.id === id ? { ...invoice, ...updatedFields } : invoice
    ));
  };

  const deleteInvoice = (id: string) => {
    setInvoices(invoices.filter(invoice => invoice.id !== id));
  };

  const getCustomerById = (id: string) => {
    return customers.find(customer => customer.id === id);
  };

  const getItemById = (id: string) => {
    return items.find(item => item.id === id);
  };

  return (
    <AppContext.Provider 
      value={{ 
        customers, 
        items, 
        salesOrders, 
        invoices,
        addCustomer,
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
        getItemById
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