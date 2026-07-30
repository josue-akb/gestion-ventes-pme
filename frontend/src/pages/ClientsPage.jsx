import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';

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

const ClientForm = ({ initial, onSubmit, onClose }) => {
  const [form, setForm] = useState(initial || {
    nom: '', prenom: '', email: '', telephone: '', entreprise: '', adresse: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
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
          <label className="text-xs font-medium text-gray-600">Prénom *</label>
          <input required value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })}
            className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Email *</label>
          <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Téléphone</label>
          <input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })}
            className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Entreprise</label>
          <input value={form.entreprise} onChange={e => setForm({ ...form, entreprise: e.target.value })}
            className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Adresse</label>
          <input value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })}
            className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm mt-1" />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
          Annuler
        </button>
        <button type="submit"
          className="px-4 py-2 text-sm bg-[#1F3864] text-white rounded-lg hover:bg-[#2E75B6]">
          Enregistrer
        </button>
      </div>
    </form>
  );
};

export default function ClientsPage() {
  const [clients, setClients]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [pagination, setPagination] = useState({});
  const [modal, setModal]         = useState(null);
  const [selected, setSelected]   = useState(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.append('search', search);
      const res = await api.get(`/clients?${params}`);
      setClients(res.data.clients);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Erreur chargement clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, [page, search]);

  const handleCreate = async (data) => {
    try {
      await api.post('/clients', data);
      toast.success('Client créé !');
      setModal(null);
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleUpdate = async (data) => {
    try {
      await api.put(`/clients/${selected._id}`, data);
      toast.success('Client modifié !');
      setModal(null);
      setSelected(null);
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Désactiver ce client ?')) return;
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Client désactivé');
      fetchClients();
    } catch {
      toast.error('Erreur suppression');
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F3864]">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pagination.total || 0} clients</p>
        </div>
        <button onClick={() => setModal('create')}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1F3864] text-white rounded-lg text-xs font-medium hover:bg-[#2E75B6]">
          <Plus size={13} /> Ajouter un client
        </button>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher par nom, email, entreprise..."
          className="w-full h-9 pl-9 pr-4 border border-gray-200 rounded-lg text-sm bg-white"
        />
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Nom', 'Email', 'Téléphone', 'Entreprise', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-sm text-gray-400">Chargement...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-sm text-gray-400">Aucun client</td></tr>
            ) : clients.map(c => (
              <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#1F3864] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {c.nom[0]}{c.prenom[0]}
                    </div>
                    <span className="text-sm font-medium text-gray-800">{c.nom} {c.prenom}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.email}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.telephone || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.entreprise || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setSelected(c); setModal('edit'); }}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
                      <Edit size={12} />
                    </button>
                    <button onClick={() => handleDelete(c._id)}
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
        <Modal title="Ajouter un client" onClose={() => setModal(null)}>
          <ClientForm onSubmit={handleCreate} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'edit' && selected && (
        <Modal title="Modifier le client" onClose={() => { setModal(null); setSelected(null); }}>
          <ClientForm initial={selected} onSubmit={handleUpdate} onClose={() => { setModal(null); setSelected(null); }} />
        </Modal>
      )}
    </div>
  );
}