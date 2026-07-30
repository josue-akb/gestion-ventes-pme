import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Eye, Download, X, Trash2 } from 'lucide-react';

const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-sm font-bold text-[#1F3864]">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>
      <div className="p-4 max-h-[80vh] overflow-y-auto">{children}</div>
    </div>
  </div>
);

const MODES = ['CB', 'Virement', 'Especes', 'Cheque'];

export default function VentesPage() {
  const [ventes, setVentes]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [pagination, setPagination] = useState({});
  const [modal, setModal]         = useState(null);
  const [selected, setSelected]   = useState(null);

  // Données pour le formulaire
  const [clients, setClients]     = useState([]);
  const [produits, setProduits]   = useState([]);

  // Formulaire nouvelle vente
  const [form, setForm] = useState({
    clientId: '', lignes: [], remiseGlobale: 0, modePaiement: 'CB',
  });
  const [totaux, setTotaux] = useState({ totalHT: 0, tva: 0, totalTTC: 0 });

  const fetchVentes = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/sales?page=${page}&limit=10`);
      setVentes(res.data.sales);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Erreur chargement ventes');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [c, p] = await Promise.all([
        api.get('/clients?limit=100'),
        api.get('/products?limit=100'),
      ]);
      setClients(c.data.clients);
      setProduits(p.data.products);
    } catch {}
  };

  useEffect(() => { fetchVentes(); }, [page]);

  // Calcul temps réel des totaux
  useEffect(() => {
    let totalHT = 0, tva = 0;
    for (const l of form.lignes) {
      if (!l.produitId) continue;
      const produit = produits.find(p => p._id === l.produitId);
      if (!produit) continue;
      const sousTotal = l.quantite * produit.prixHT * (1 - (Number(l.remiseLigne) || 0));
      totalHT += sousTotal;
      tva += sousTotal * (produit.tauxTVA / 100);
    }
    const totalHTApres = totalHT * (1 - (Number(form.remiseGlobale) || 0));
    setTotaux({
      totalHT: +totalHTApres.toFixed(2),
      tva: +tva.toFixed(2),
      totalTTC: +(totalHTApres + tva).toFixed(2),
    });
  }, [form.lignes, form.remiseGlobale, produits]);

  const openCreate = async () => {
    await fetchFormData();
    setForm({ clientId: '', lignes: [{ produitId: '', quantite: 1, remiseLigne: 0 }], remiseGlobale: 0, modePaiement: 'CB' });
    setModal('create');
  };

  const addLigne = () => setForm(f => ({
    ...f, lignes: [...f.lignes, { produitId: '', quantite: 1, remiseLigne: 0 }]
  }));

  const removeLigne = (i) => setForm(f => ({
    ...f, lignes: f.lignes.filter((_, idx) => idx !== i)
  }));

  const updateLigne = (i, field, value) => setForm(f => ({
    ...f,
    lignes: f.lignes.map((l, idx) => idx === i ? { ...l, [field]: value } : l)
  }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.clientId) return toast.error('Sélectionnez un client');
    if (form.lignes.length === 0 || !form.lignes[0].produitId) return toast.error('Ajoutez au moins un produit');

    try {
      const payload = {
        clientId: form.clientId,
        lignes: form.lignes
          .filter(l => l.produitId)
          .map(l => ({
            produitId: l.produitId,
            quantite: Number(l.quantite),
            remiseLigne: Number(l.remiseLigne) || 0,
          })),
        remiseGlobale: Number(form.remiseGlobale) || 0,
        modePaiement: form.modePaiement,
      };
      await api.post('/sales', payload);
      toast.success('Vente enregistrée + facture générée !');
      setModal(null);
      fetchVentes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/sales/export/csv', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'ventes.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erreur export');
    }
  };

  const statutBadge = (s) => {
    const styles = {
      validee: 'bg-green-100 text-green-700',
      en_cours: 'bg-yellow-100 text-yellow-700',
      annulee: 'bg-red-100 text-red-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[s] || ''}`}>{s}</span>;
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F3864]">Ventes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pagination.total || 0} ventes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
            <Download size={13} /> Exporter CSV
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1F3864] text-white rounded-lg text-xs font-medium hover:bg-[#2E75B6]">
            <Plus size={13} /> Nouvelle vente
          </button>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['N° Vente', 'Client', 'Commercial', 'Total TTC', 'Paiement', 'Statut', 'Date'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-sm text-gray-400">Chargement...</td></tr>
            ) : ventes.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-sm text-gray-400">Aucune vente</td></tr>
            ) : ventes.map(v => (
              <tr key={v._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-mono text-[#1F3864] font-medium">{v.numero}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {v.clientId?.nom} {v.clientId?.prenom}
                  {v.clientId?.entreprise && <span className="text-xs text-gray-400 block">{v.clientId.entreprise}</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{v.commercialId?.nom} {v.commercialId?.prenom}</td>
                <td className="px-4 py-3 text-sm font-semibold text-[#1F3864]">{v.totalTTC?.toFixed(2)} €</td>
                <td className="px-4 py-3 text-sm text-gray-500">{v.modePaiement}</td>
                <td className="px-4 py-3">{statutBadge(v.statut)}</td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(v.createdAt).toLocaleDateString('fr-FR')}
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
            Page {page} sur {pagination.pages}
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

      {/* Modal Nouvelle Vente */}
      {modal === 'create' && (
        <Modal title="Nouvelle vente" onClose={() => setModal(null)} wide>
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Client */}
            <div>
              <label className="text-xs font-medium text-gray-600">Client *</label>
              <select required value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}
                className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm mt-1">
                <option value="">Sélectionner un client...</option>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>{c.nom} {c.prenom} — {c.entreprise || c.email}</option>
                ))}
              </select>
            </div>

            {/* Lignes produits */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">Produits *</label>
                <button type="button" onClick={addLigne}
                  className="text-xs text-[#1F3864] hover:underline flex items-center gap-1">
                  <Plus size={11} /> Ajouter une ligne
                </button>
              </div>
              <div className="space-y-2">
                {form.lignes.map((ligne, i) => {
                  const produit = produits.find(p => p._id === ligne.produitId);
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                      {/* Produit */}
                      <select value={ligne.produitId} onChange={e => updateLigne(i, 'produitId', e.target.value)}
                        className="col-span-5 h-8 border border-gray-200 rounded-lg px-2 text-xs bg-white">
                        <option value="">Choisir...</option>
                        {produits.map(p => (
                          <option key={p._id} value={p._id}>{p.nom} — {p.prixHT}€ HT</option>
                        ))}
                      </select>
                      {/* Quantité */}
                      <input type="number" min="1" value={ligne.quantite}
                        onChange={e => updateLigne(i, 'quantite', e.target.value)}
                        className="col-span-2 h-8 border border-gray-200 rounded-lg px-2 text-xs text-center bg-white"
                        placeholder="Qté" />
                      {/* Remise */}
                      <input type="number" min="0" max="1" step="0.05" value={ligne.remiseLigne}
                        onChange={e => updateLigne(i, 'remiseLigne', e.target.value)}
                        className="col-span-2 h-8 border border-gray-200 rounded-lg px-2 text-xs text-center bg-white"
                        placeholder="Remise" />
                      {/* Stock */}
                      {produit && (
                        <span className={`col-span-2 text-xs text-center font-medium ${produit.stock < ligne.quantite ? 'text-red-600' : 'text-green-600'}`}>
                          Stock: {produit.stock}
                        </span>
                      )}
                      {/* Supprimer */}
                      <button type="button" onClick={() => removeLigne(i)}
                        className="col-span-1 flex justify-center text-red-400 hover:text-red-600">
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Remise globale + mode paiement */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Remise globale (ex: 0.1 = 10%)</label>
                <input type="number" min="0" max="0.5" step="0.05" value={form.remiseGlobale}
                  onChange={e => setForm({ ...form, remiseGlobale: e.target.value })}
                  className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Mode de paiement *</label>
                <select required value={form.modePaiement} onChange={e => setForm({ ...form, modePaiement: e.target.value })}
                  className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm mt-1">
                  {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {/* Totaux */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total HT</span>
                <span>{totaux.totalHT.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>TVA</span>
                <span>{totaux.tva.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#1F3864] border-t border-gray-200 pt-1.5 mt-1.5">
                <span>Total TTC</span>
                <span>{totaux.totalTTC.toFixed(2)} €</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setModal(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
              <button type="submit"
                className="px-4 py-2 text-sm bg-[#1F3864] text-white rounded-lg hover:bg-[#2E75B6] font-medium">
                Valider la vente
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}