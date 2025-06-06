import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
}

const getPageTitle = (pathname: string): string => {
  const paths: Record<string, string> = {
    '/': 'Dashboard',
    '/items': 'Items',
    '/sales-orders': 'Sales Orders',
    '/invoices': 'Invoices',
    '/customers': 'Customers',
    '/reports': 'Reports',
    '/settings': 'Settings',
  };
  
  // Handle nested paths
  if (pathname.startsWith('/items/new')) return 'Add New Item';
  if (pathname.startsWith('/items/')) return 'Item Details';
  if (pathname.startsWith('/sales-orders/new')) return 'Create Sales Order';
  if (pathname.startsWith('/sales-orders/')) return 'Sales Order Details';
  if (pathname.startsWith('/invoices/new')) return 'Create Invoice';
  if (pathname.startsWith('/invoices/')) return 'Invoice Details';
  
  return paths[pathname] || 'BookKeeper';
};

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      {/* Mobile Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-full z-20 md:hidden transition-transform duration-300 transform ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          toggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          pageTitle={pageTitle}
        />
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;