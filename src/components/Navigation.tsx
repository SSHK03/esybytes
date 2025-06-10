import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    {
      name: 'Dashboard',
      icon: '📊',
      path: '/dashboard',
      roles: ['admin', 'staff', 'accountant', 'viewer']
    },
    {
      name: 'Sales',
      icon: '💰',
      path: '/sales',
      roles: ['admin', 'staff', 'accountant'],
      subItems: [
        { name: 'Invoices', path: '/invoices', roles: ['admin', 'staff', 'accountant'] },
        { name: 'Sales Orders', path: '/sales-orders', roles: ['admin', 'staff', 'accountant'] },
        { name: 'Customers', path: '/customers', roles: ['admin', 'staff', 'accountant'] },
        { name: 'Payments', path: '/payments', roles: ['admin', 'staff', 'accountant'] }
      ]
    },
    {
      name: 'Purchases',
      icon: '🛒',
      path: '/purchases',
      roles: ['admin', 'staff', 'accountant'],
      subItems: [
        { name: 'Bills', path: '/bills', roles: ['admin', 'staff', 'accountant'] },
        { name: 'Purchase Orders', path: '/purchase-orders', roles: ['admin', 'staff', 'accountant'] },
        { name: 'Vendors', path: '/vendors', roles: ['admin', 'staff', 'accountant'] }
      ]
    },
    {
      name: 'Expenses',
      icon: '💸',
      path: '/expenses',
      roles: ['admin', 'staff', 'accountant']
    },
    {
      name: 'Banking',
      icon: '🏦',
      path: '/banking',
      roles: ['admin', 'accountant'],
      subItems: [
        { name: 'Bank Accounts', path: '/bank-accounts', roles: ['admin', 'accountant'] },
        { name: 'Transactions', path: '/transactions', roles: ['admin', 'accountant'] },
        { name: 'Reconciliation', path: '/reconciliation', roles: ['admin', 'accountant'] }
      ]
    },
    {
      name: 'Items',
      icon: '📦',
      path: '/items',
      roles: ['admin', 'staff', 'accountant']
    },
    {
      name: 'Reports',
      icon: '📈',
      path: '/reports',
      roles: ['admin', 'accountant'],
      subItems: [
        { name: 'Financial Reports', path: '/reports/financial', roles: ['admin', 'accountant'] },
        { name: 'Tax Reports', path: '/reports/tax', roles: ['admin', 'accountant'] },
        { name: 'Customer Reports', path: '/reports/customers', roles: ['admin', 'accountant'] },
        { name: 'Vendor Reports', path: '/reports/vendors', roles: ['admin', 'accountant'] }
      ]
    },
    {
      name: 'Settings',
      icon: '⚙️',
      path: '/settings',
      roles: ['admin'],
      subItems: [
        { name: 'Company Settings', path: '/settings/company', roles: ['admin'] },
        { name: 'User Management', path: '/settings/users', roles: ['admin'] },
        { name: 'Tax Rates', path: '/settings/tax-rates', roles: ['admin'] },
        { name: 'Categories', path: '/settings/categories', roles: ['admin'] }
      ]
    }
  ];

  const isActive = (path: string) => location.pathname === path;
  const isActiveParent = (path: string) => location.pathname.startsWith(path);

  const canAccess = (roles: string[]) => {
    return user && roles.includes(user.role);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-white shadow-lg transition-all duration-300 ease-in-out`}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {isSidebarOpen && (
            <h1 className="text-xl font-bold text-blue-600">Ajuun Tex</h1>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-4 px-2">
          {menuItems.map((item) => {
            if (!canAccess(item.roles)) return null;

            return (
              <div key={item.name}>
                <Link
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActiveParent(item.path)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="text-lg mr-3">{item.icon}</span>
                  {isSidebarOpen && <span>{item.name}</span>}
                </Link>

                {/* Sub-items */}
                {isSidebarOpen && item.subItems && isActiveParent(item.path) && (
                  <div className="ml-6 mt-2 space-y-1">
                    {item.subItems.map((subItem) => {
                      if (!canAccess(subItem.roles)) return null;

                      return (
                        <Link
                          key={subItem.name}
                          to={subItem.path}
                          className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                            isActive(subItem.path)
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {subItem.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            {/* Page Title */}
            <h1 className="text-xl font-semibold text-gray-900">
              {menuItems.find(item => isActiveParent(item.path))?.name || 'Dashboard'}
            </h1>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="p-2 rounded-md hover:bg-gray-100 relative">
                <span className="text-lg">🔔</span>
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400"></span>
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </div>
                  {isSidebarOpen && (
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user?.role}</p>
                    </div>
                  )}
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile Settings
                    </Link>
                    <Link
                      to="/settings/company"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Company Settings
                    </Link>
                    <hr className="my-1" />
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {/* Content will be rendered here */}
        </main>
      </div>
    </div>
  );
};

export default Navigation; 