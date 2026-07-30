import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProduitsPage from './pages/ProduitsPage';
import ClientsPage from './pages/ClientsPage';
import VentesPage from './pages/VentesPage';
import FacturesPage from './pages/FacturesPage';
import Layout from './components/Layout';

const PrivateRoute = ({ children, roles }) => {
  const { user } = useSelector((state) => state.auth);
  const token = localStorage.getItem('accessToken');
  if (!token || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={
          <PrivateRoute roles={['admin', 'responsable']}>
            <DashboardPage />
          </PrivateRoute>
        } />
        <Route path="produits"  element={<ProduitsPage />} />
        <Route path="clients"   element={<ClientsPage />} />
        <Route path="ventes"    element={<VentesPage />} />
        <Route path="factures"  element={<FacturesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}