import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  ShoppingCart, 
  Package, 
  FileText, 
  Users, 
  BarChart, 
  Settings,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`bg-[#1A365D] text-white transition-all duration-300 flex flex-col ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between p-4 border-b border-blue-800">
        {!collapsed && (
          <div className="text-xl font-bold">EsyByte </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-full hover:bg-blue-800"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <div className="flex-1 py-4">
        <NavItem to="/" icon={<Home size={20} />} label="Dashboard" collapsed={collapsed} />
        <NavItem to="/items" icon={<Package size={20} />} label="Items" collapsed={collapsed} />
        <NavItem to="/sales-orders" icon={<ShoppingCart size={20} />} label="Sales Orders" collapsed={collapsed} />
        <NavItem to="/invoices" icon={<FileText size={20} />} label="Invoices" collapsed={collapsed} />
        <NavItem to="/customers" icon={<Users size={20} />} label="Customers" collapsed={collapsed} />
        <NavItem to="/reports" icon={<BarChart size={20} />} label="Reports" collapsed={collapsed} />
        <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" collapsed={collapsed} />
      </div>
    </div>
  );
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, collapsed }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => 
        `flex items-center py-3 px-4 ${
          isActive ? 'bg-blue-800' : 'hover:bg-blue-800/50'
        } transition-colors duration-200 ${
          collapsed ? 'justify-center' : 'space-x-3'
        }`
      }
    >
      <div>{icon}</div>
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
};

export default Sidebar;