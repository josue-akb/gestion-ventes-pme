import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../../store/authSlice';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, user } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ email: '', motDePasse: '' });

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(form));
    if (login.fulfilled.match(result)) {
      toast.success('Connexion réussie !');
      const role = result.payload.role;
      navigate(role === 'commercial' ? '/ventes' : '/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-10 h-1 bg-[#1F3864] rounded mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#1F3864]">Gestion des Ventes PME</h1>
          <p className="text-sm text-gray-500 mt-1">Connectez-vous à votre espace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Adresse email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full h-11 border border-gray-200 rounded-lg bg-gray-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864] focus:border-transparent"
              placeholder="email@exemple.fr"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={form.motDePasse}
              onChange={(e) => setForm({ ...form, motDePasse: e.target.value })}
              className="w-full h-11 border border-gray-200 rounded-lg bg-gray-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#1F3864] text-white rounded-lg text-sm font-semibold hover:bg-[#2E75B6] transition-colors disabled:opacity-60"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-center text-xs text-gray-400 mb-2">Rôles disponibles</p>
          <div className="flex gap-2 justify-center">
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">Administrateur</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-medium">Responsable</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 font-medium">Commercial</span>
          </div>
        </div>
      </div>
    </div>
  );
}