// backend/src/services/invoiceService.js
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INVOICES_DIR = path.join(__dirname, '../../uploads/invoices');

if (!fs.existsSync(INVOICES_DIR)) {
  fs.mkdirSync(INVOICES_DIR, { recursive: true });
}

export const generateInvoicePDF = (invoice, vente, client) => {
  return new Promise((resolve, reject) => {
    const fileName = `${invoice.numero}.pdf`;
    const filePath = path.join(INVOICES_DIR, fileName);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ── EN-TÊTE ───────────────────────────────────────────────
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('FACTURE', { align: 'center' });

    doc
      .fontSize(11)
      .font('Helvetica')
      .moveDown(0.5)
      .text(`N° ${invoice.numero}`, { align: 'right' })
      .text(`Date : ${new Date(invoice.dateEmission).toLocaleDateString('fr-FR')}`, { align: 'right' });

    doc.moveDown();
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#1F3864')
      .lineWidth(2)
      .stroke();

    doc.moveDown();

    // ── VENDEUR / CLIENT ──────────────────────────────────────
    const yBloc = doc.y;

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('VENDEUR', 50, yBloc)
      .font('Helvetica')
      .text(process.env.COMPANY_NAME || 'GV PME SAS', 50)
      .text(`SIRET : ${process.env.COMPANY_SIRET || '000 000 000 00000'}`)
      .text(process.env.COMPANY_ADDRESS || '1 rue de la Paix, 75001 Paris')
      .text(`Email : ${process.env.COMPANY_EMAIL || 'contact@gvpme.fr'}`);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('CLIENT', 300, yBloc)
      .font('Helvetica')
      .text(`${client.nom} ${client.prenom}`, 300)
      .text(client.entreprise || '-', 300)
      .text(client.adresse || '-', 300)
      .text(client.email, 300);

    doc.moveDown(2);

    // ── TABLEAU DES LIGNES ────────────────────────────────────
    const tableTop = doc.y;
    const cols = { produit: 50, qte: 270, prixHT: 330, remise: 395, sousTotal: 460 };

    // En-tête tableau
    doc.rect(50, tableTop, 495, 18).fill('#1F3864');
    doc
      .fillColor('#FFFFFF')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Désignation',   cols.produit + 4, tableTop + 4)
      .text('Qté',           cols.qte,          tableTop + 4)
      .text('P.U. HT',       cols.prixHT,       tableTop + 4)
      .text('Remise',         cols.remise,       tableTop + 4)
      .text('Sous-total HT',  cols.sousTotal,    tableTop + 4);

    // Lignes produits
    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    let y = tableTop + 22;

    for (const [idx, ligne] of vente.lignes.entries()) {
      if (idx % 2 === 0) {
        doc.rect(50, y - 2, 495, 18).fill('#F8F9FB');
      }
      doc.fillColor('#000000')
        .text(ligne.nom,                                cols.produit + 4, y, { width: 205 })
        .text(String(ligne.quantite),                   cols.qte,         y)
        .text(`${ligne.prixUnitaireHT.toFixed(2)} €`,  cols.prixHT,      y)
        .text(ligne.remiseLigne > 0
          ? `${(ligne.remiseLigne * 100).toFixed(0)}%`
          : '-',                                        cols.remise,      y)
        .text(`${ligne.sousTotal.toFixed(2)} €`,       cols.sousTotal,   y);
      y += 18;
    }

    doc
      .moveTo(50, y + 4)
      .lineTo(545, y + 4)
      .strokeColor('#CCCCCC')
      .lineWidth(0.5)
      .stroke();

    // ── TOTAUX ────────────────────────────────────────────────
    y += 16;

    const addTotal = (label, value, bold = false) => {
      if (bold) doc.font('Helvetica-Bold').fontSize(11);
      else doc.font('Helvetica').fontSize(10);
      doc
        .fillColor('#000000')
        .text(label, 350, y)
        .text(value, 460, y, { width: 85, align: 'right' });
      y += 18;
    };

    addTotal('Total HT :', `${vente.totalHT.toFixed(2)} €`);

    if (vente.remiseGlobale > 0) {
      addTotal(
        `Remise (${(vente.remiseGlobale * 100).toFixed(0)}%) :`,
        `-${(vente.totalHT * vente.remiseGlobale / (1 - vente.remiseGlobale)).toFixed(2)} €`
      );
    }

    addTotal('TVA :', `${vente.tva.toFixed(2)} €`);

    doc
      .moveTo(350, y)
      .lineTo(545, y)
      .strokeColor('#1F3864')
      .lineWidth(1)
      .stroke();

    y += 6;
    addTotal('TOTAL TTC :', `${vente.totalTTC.toFixed(2)} €`, true);

    // ── MODE DE PAIEMENT ──────────────────────────────────────
    y += 10;
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#000000')
      .text(`Mode de paiement : ${vente.modePaiement}`, 50, y);

    // ── MENTIONS LÉGALES ──────────────────────────────────────
    y += 40;
    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor('#CCCCCC')
      .lineWidth(0.5)
      .stroke();

    y += 8;
    doc
      .fontSize(7)
      .fillColor('#888888')
      .font('Helvetica')
      .text(
        "Facture émise conformément à l'article L441-3 du Code de commerce. " +
        "En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée, " +
        "ainsi qu'une indemnité forfaitaire de recouvrement de 40€ (art. L441-6 C.com.). " +
        `TVA non applicable si micro-entreprise. SIRET : ${process.env.COMPANY_SIRET || '000 000 000 00000'}.`,
        50, y,
        { width: 495, align: 'justify' }
      );

    doc.end();

    stream.on('finish', () => resolve({ fileName, filePath }));
    stream.on('error', reject);
  });
};