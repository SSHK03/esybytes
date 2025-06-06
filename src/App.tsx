import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard/DashboardPage';
import Customers from './pages/Customers/CustomersPage';
import Items from './pages/Items/ItemsPage';
import Invoices from './pages/Invoices/InvoicesPage';
import SalesOrders from './pages/SalesOrders/SalesOrdersPage';
import Reports from './pages/Reports/ReportsPage';
import Settings from './pages/Settings/SettingsPage';
import Profile from './pages/Profile/ProfilePage';
import Login from './pages/Login';
import Register from './pages/Register';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
          
          {/* Protected Routes */}
          <Route
            path="/"
            element={isAuthenticated ? (
              <Layout>
                <Dashboard />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )}
          />
          <Route
            path="/customers/*"
            element={isAuthenticated ? (
              <Layout>
                <Customers />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )}
          />
          <Route
            path="/items/*"
            element={isAuthenticated ? (
              <Layout>
                <Items />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )}
          />
          <Route
            path="/invoices/*"
            element={isAuthenticated ? (
              <Layout>
                <Invoices />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )}
          />
          <Route
            path="/sales-orders/*"
            element={isAuthenticated ? (
              <Layout>
                <SalesOrders />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )}
          />
          <Route
            path="/reports"
            element={isAuthenticated ? (
              <Layout>
                <Reports />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )}
          />
          <Route
            path="/settings"
            element={isAuthenticated ? (
              <Layout>
                <Settings />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )}
          />
          <Route
            path="/profile"
            element={isAuthenticated ? (
              <Layout>
                <Profile />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )}
          />
        </Routes>
        <ToastContainer position="bottom-right" />
      </Router>
    </>
  );
}

export default App;