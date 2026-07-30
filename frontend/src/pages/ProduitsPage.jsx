// frontend/src/pages/ProduitsPage.jsx
import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, Download, Upload, AlertTriangle } from 'lucide-react';

const TAUX_TVA = [5.5, 10, 20];

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-sm font-bold text-[#1F3864]">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  </div>
);

const ProduitForm = ({ initial, onSubmit, onClose }) => {
  const [form, setForm] = useState(initial || {
    nom: '', categorie: '', prixHT: '', tauxTVA: 20, stock: 0, seuilAlerte: 5, description: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, prixHT: Number(form.prixHT), tauxTVA: Number(form.tauxTVA), stock: Number(form.stock), seuilAlerte: Number(form.seuilAlerte) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Nom *</label>
          <input required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
            className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Catégorie *</label>
          <input required value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })}
            className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Prix HT (€) *</label>
          <input required type="number" min="0" step="0.01" value={form.prixHT} onChange={e => setForm({ ...form, prixHT: e.target.value })}
            className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Taux TVA *</label>
          <select value={form.tauxTVA} onChange={e => setForm({ ...form, tauxTVA: e.target.value })}
            className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm mt-1">
            {TAUX_TVA.map(t => <option key={t} value={t}>{t}%</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Stock</label>
          <input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
            className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Seuil alerte</label>
          <input type="number" min="0" value={form.seuilAlerte} onChange={e => setForm({ ...form, seuilAlerte: e.target.value })}
            className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm mt-1" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Description</label>
        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 resize-none" />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Annuler</button>
        <button type="submit" className="px-4 py-2 text-sm bg-[#1F3864] text-white rounded-lg hover:bg-[#2E75B6]">Enregistrer</button>
      </div>
    </form>
  );
};

export default function ProduitsPage() {
  const [produits, setProduits]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [pagination, setPagination] = useState({});
  const [modal, setModal]         = useState(null); // null | 'create' | 'edit'
  const [selected, setSelected]   = useState(null);
  const [alertes, setAlertes]     = useState(0);

  const fetchProduits = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.append('search', search);
      const res = await api.get(`/products?${params}`);
      setProduits(res.data.products);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Erreur chargement produits');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertes = async () => {
    try {
      const res = await api.get('/products/alertes/stock-bas');
      setAlertes(res.data.count);
    } catch {}
  };

  useEffect(() => { fetchProduits(); fetchAlertes(); }, [page, search]);

  const handleCreate = async (data) => {
    try {
      await api.post('/products', data);
      toast.success('Produit créé !');
      setModal(null);
      fetchProduits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleUpdate = async (data) => {
    try {
      await api.put(`/products/${selected._id}`, data);
      toast.success('Produit modifié !');
      setModal(null);
      setSelected(null);
      fetchProduits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Désactiver ce produit ?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Produit désactivé');
      fetchProduits();
    } catch {
      toast.error('Erreur suppression');
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/products/export/csv', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'produits.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erreur export');
    }
  };

  const stockBadge = (p) => {
    if (p.stock <= 0) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Rupture</span>;
    if (p.stock <= p.seuilAlerte) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Bas ({p.stock})</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK ({p.stock})</span>;
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F3864]">Catalogue Produits</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pagination.total || 0} produits</p>
        </div>
        <div className="flex gap-2">
          {alertes > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 font-medium">
              <AlertTriangle size={13} />
              {alertes} alerte(s) stock
            </div>
          )}
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
            <Download size={13} /> Exporter CSV
          </button>
          <button onClick={() => setModal('create')} className="flex items-center gap-1.5 px-3 py-2 bg-[#1F3864] text-white rounded-lg text-xs font-medium hover:bg-[#2E75B6]">
            <Plus size={13} /> Ajouter un produit
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher un produit..."
          className="w-full h-9 pl-9 pr-4 border border-gray-200 rounded-lg text-sm bg-white"
        />
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Nom', 'Catégorie', 'Prix HT', 'TVA', 'Stock', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-sm text-gray-400">Chargement...</td></tr>
            ) : produits.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-sm text-gray-400">Aucun produit</td></tr>
            ) : produits.map(p => (
              <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{p.nom}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{p.categorie}</td>
                <td className="px-4 py-3 text-sm text-gray-800">{p.prixHT.toFixed(2)} €</td>
                <td className="px-4 py-3 text-sm text-gray-500">{p.tauxTVA}%</td>
                <td className="px-4 py-3">{stockBadge(p)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setSelected(p); setModal('edit'); }}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
                      <Edit size={12} />
                    </button>
                    <button onClick={() => handleDelete(p._id)}
                      className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Affichage {(page - 1) * 10 + 1}–{Math.min(page * 10, pagination.total)} sur {pagination.total}
          </p>
          <div className="flex gap-1">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-lg text-xs font-medium ${page === p ? 'bg-[#1F3864] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {modal === 'create' && (
        <Modal title="Ajouter un produit" onClose={() => setModal(null)}>
          <ProduitForm onSubmit={handleCreate} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'edit' && selected && (
        <Modal title="Modifier le produit" onClose={() => { setModal(null); setSelected(null); }}>
          <ProduitForm initial={selected} onSubmit={handleUpdate} onClose={() => { setModal(null); setSelected(null); }} />
        </Modal>
      )}
    </div>
  );
}