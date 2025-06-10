import { Link, Outlet, useLocation } from "react-router-dom";

const navLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/customers", label: "Customers" },
  { to: "/invoices", label: "Invoices" },
  { to: "/items", label: "Items" },
  { to: "/vendors", label: "Vendors" },
  { to: "/bills", label: "Bills" },
  { to: "/payments", label: "Payments" },
  { to: "/settings", label: "Settings" },
];

export default function MainLayout() {
  const location = useLocation();
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        <div className="h-16 flex items-center justify-center border-b">
          <span className="text-xl font-bold text-blue-700">BookKeeper</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`block py-2 px-3 rounded font-medium ${location.pathname.startsWith(link.to) ? "bg-blue-100 text-blue-700" : "hover:bg-blue-50 text-gray-700"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-16 bg-white shadow flex items-center justify-between px-6">
          <div className="text-lg font-semibold text-gray-800">{navLinks.find(l => location.pathname.startsWith(l.to))?.label || ""}</div>
          <div className="flex items-center space-x-4">
            {/* Add notification, profile, etc. */}
            <span className="text-gray-600">Hello, User</span>
          </div>
        </header>
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
} 