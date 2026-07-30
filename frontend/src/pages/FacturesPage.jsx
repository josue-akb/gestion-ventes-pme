import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Download, Eye, FileText } from 'lucide-react';

export default function FacturesPage() {
  const [factures, setFactures]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchFactures = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/invoices?page=${page}&limit=10`);
      setFactures(res.data.invoices);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Erreur chargement factures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFactures(); }, [page]);

  const handleDownload = async (invoice) => {
    try {
      const res = await api.get(`/invoices/download/${invoice._id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.numero}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Facture téléchargée !');
    } catch {
      toast.error('Erreur téléchargement');
    }
  };

  const statutBadge = (s) => {
    const styles = {
      emise:   'bg-blue-100 text-blue-700',
      payee:   'bg-green-100 text-green-700',
      annulee: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[s] || 'bg-gray-100 text-gray-700'}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1F3864]">Factures</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pagination.total || 0} factures</p>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['N° Facture', 'Client', 'Commercial', 'Total HT', 'TVA', 'Total TTC', 'Statut', 'Date', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-8 text-sm text-gray-400">Chargement...</td></tr>
            ) : factures.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12">
                  <FileText size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">Aucune facture — créez une vente pour générer une facture automatiquement</p>
                </td>
              </tr>
            ) : factures.map(f => (
              <tr key={f._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-mono text-[#1F3864] font-medium">{f.numero}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {f.clientId?.nom} {f.clientId?.prenom}
                  {f.clientId?.entreprise && (
                    <span className="text-xs text-gray-400 block">{f.clientId.entreprise}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {f.commercialId?.nom} {f.commercialId?.prenom}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{f.montants?.totalHT?.toFixed(2)} €</td>
                <td className="px-4 py-3 text-sm text-gray-500">{f.montants?.tva?.toFixed(2)} €</td>
                <td className="px-4 py-3 text-sm font-semibold text-[#1F3864]">{f.montants?.totalTTC?.toFixed(2)} €</td>
                <td className="px-4 py-3">{statutBadge(f.statut)}</td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(f.dateEmission).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDownload(f)}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium"
                  >
                    <Download size={12} /> PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Page {page} sur {pagination.pages}</p>
          <div className="flex gap-1">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-lg text-xs font-medium ${page === p
                  ? 'bg-[#1F3864] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}