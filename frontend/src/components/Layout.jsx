import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import {
  LayoutDashboard, Package, Users, ShoppingCart,
  FileText, LogOut, BarChart2
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard, roles: ['admin', 'responsable'] },
  { to: '/produits',  label: 'Produits',   icon: Package },
  { to: '/clients',   label: 'Clients',    icon: Users },
  { to: '/ventes',    label: 'Ventes',     icon: ShoppingCart },
  { to: '/factures',  label: 'Factures',   icon: FileText },
];

export default function Layout() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { user }  = useSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const visibleItems = navItems.filter(
    item => !item.roles || item.roles.includes(user?.role)
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* SIDEBAR */}
      <aside className="w-48 bg-[#1F3864] flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-white/10">
          <div className="w-7 h-1 bg-[#4FC3F7] rounded mb-2" />
          <div className="text-white font-bold text-sm">GV PME</div>
          <div className="text-white/40 text-xs mt-0.5">Gestion des Ventes</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors
                ${isActive
                  ? 'bg-white/10 text-white border-l-2 border-[#4FC3F7] pl-3.5'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold mb-1.5">
            {user?.nom?.[0]}{user?.prenom?.[0]}
          </div>
          <div className="text-white/90 text-xs font-semibold">{user?.nom} {user?.prenom}</div>
          <div className="text-white/40 text-[10px] mb-2">{user?.role}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs transition-colors"
          >
            <LogOut size={12} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* CONTENU */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}