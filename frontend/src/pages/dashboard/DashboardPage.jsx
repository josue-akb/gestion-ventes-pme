import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { TrendingUp, ShoppingCart, Users, AlertTriangle } from 'lucide-react';

const KPICard = ({ label, value, sub, icon: Icon, color }) => (
  <div className={`bg-white rounded-xl p-4 shadow-sm border-t-4`} style={{ borderColor: color }}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-2xl font-bold text-[#1F3864] mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className="p-2 rounded-lg" style={{ backgroundColor: color + '20' }}>
        <Icon size={18} style={{ color }} />
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState('mois');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/dashboard?periode=${periode}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [periode]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1F3864]" />
    </div>
  );

  const { kpis, evolutionCA, topProduits, topClients, performancesCommerciaux } = data || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F3864]">Tableau de bord</h1>
          <p className="text-sm text-gray-500 mt-0.5">Performances commerciales</p>
        </div>
        <div className="flex gap-1">
          {['jour', 'semaine', 'mois', 'annee'].map(p => (
            <button
              key={p}
              onClick={() => setPeriode(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize
                ${periode === p
                  ? 'bg-[#1F3864] text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
                }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Chiffre d'affaires" value={`${kpis?.totalCA?.toLocaleString('fr-FR')} €`} icon={TrendingUp} color="#1F3864" />
        <KPICard label="Nombre de ventes"   value={kpis?.nbVentes} sub={`Panier moyen : ${kpis?.panierMoyen?.toFixed(0)} €`} icon={ShoppingCart} color="#2E75B6" />
        <KPICard label="Nouveaux clients"   value={kpis?.nouveauxClients} icon={Users} color="#1D9E75" />
        <KPICard label="Alertes stock"       value={kpis?.stockAlertes} icon={AlertTriangle} color="#E65100" />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-3 gap-4">
        {/* Evolution CA */}
        <div className="col-span-2 bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            Évolution du CA
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={evolutionCA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v} €`, 'CA']} />
              <Bar dataKey="ca" fill="#1F3864" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top produits */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            Top produits
          </h2>
          <div className="space-y-3">
            {topProduits?.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-[#1F3864] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-xs text-gray-700 flex-1 truncate">{p.nom}</span>
                <span className="text-xs font-semibold text-[#1F3864]">{p.totalCA} €</span>
              </div>
            ))}
            {!topProduits?.length && (
              <p className="text-xs text-gray-400 text-center py-4">Aucune donnée</p>
            )}
          </div>
        </div>
      </div>

      {/* Bas de page */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top clients */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            Top clients
          </h2>
          <div className="space-y-2">
            {topClients?.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-xs font-medium text-gray-800">{c.nom}</p>
                  <p className="text-xs text-gray-400">{c.entreprise || '-'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-[#1F3864]">{c.totalCA} €</p>
                  <p className="text-xs text-gray-400">{c.nbAchats} achat(s)</p>
                </div>
              </div>
            ))}
            {!topClients?.length && (
              <p className="text-xs text-gray-400 text-center py-4">Aucune donnée</p>
            )}
          </div>
        </div>

        {/* Performances commerciaux */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            Performances commerciaux
          </h2>
          <div className="space-y-2">
            {performancesCommerciaux?.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#1F3864] text-white text-xs flex items-center justify-center font-bold">
                    {c.nom?.[0]}
                  </div>
                  <p className="text-xs font-medium text-gray-800">{c.nom}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-[#1F3864]">{c.totalCA} €</p>
                  <p className="text-xs text-gray-400">{c.nbVentes} vente(s)</p>
                </div>
              </div>
            ))}
            {!performancesCommerciaux?.length && (
              <p className="text-xs text-gray-400 text-center py-4">Aucune donnée</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}