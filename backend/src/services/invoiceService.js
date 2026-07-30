import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INVOICES_DIR = path.join(__dirname, '../../uploads/invoices');

// Assure que le dossier existe
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
      .fontSize(12)
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

    // ── VENDEUR ───────────────────────────────────────────────
    const yVendeur = doc.y;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('VENDEUR', 50, yVendeur)
      .font('Helvetica')
      .text(process.env.COMPANY_NAME || 'GV PME SAS', 50)
      .text(`SIRET : ${process.env.COMPANY_SIRET || '000 000 000 00000'}`)
      .text(process.env.COMPANY_ADDRESS || '1 rue de la Paix, 75001 Paris')
      .text(`Email : ${process.env.COMPANY_EMAIL || 'contact@gvpme.fr'}`);

    // ── CLIENT ────────────────────────────────────────────────
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('CLIENT', 300, yVendeur)
      .font('Helvetica')
      .text(`${client.nom} ${client.prenom}`, 300)
      .text(client.entreprise || '-', 300)
      .text(client.adresse || '-', 300)
      .text(client.email, 300);

    doc.moveDown(2);

    // ── TABLEAU DES LIGNES ────────────────────────────────────
    const tableTop = doc.y;
    const cols = { produit: 50, qte: 270, prixHT: 330, remise: 390, sousTotal: 460 };

    // En-têtes colonnes
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#1F3864')
      .text('Désignation', cols.produit, tableTop)
      .text('Qté', cols.qte, tableTop)
      .text('P.U. HT', cols.prixHT, tableTop)
      .text('Remise', cols.remise, tableTop)
      .text('Sous-total HT', cols.sousTotal, tableTop);

    doc
      .moveTo(50, tableTop + 14)
      .lineTo(545, tableTop + 14)
      .strokeColor('#CCCCCC')
      .lineWidth(1)
      .stroke();

    // Lignes produits
    doc.fillColor('#000000').font('Helvetica').fontSize(9);
    let y = tableTop + 20;

    for (const ligne of vente.lignes) {
      doc
        .text(ligne.nom, cols.produit, y, { width: 210 })
        .text(String(ligne.quantite), cols.qte, y)
        .text(`${ligne.prixUnitaireHT.toFixed(2)} €`, cols.prixHT, y)
        .text(ligne.remiseLigne > 0 ? `${(ligne.remiseLigne * 100).toFixed(0)}%` : '-', cols.remise, y)
        .text(`${ligne.sousTotal.toFixed(2)} €`, cols.sousTotal, y);

      y += 20;

      doc
        .moveTo(50, y - 4)
        .lineTo(545, y - 4)
        .strokeColor('#EEEEEE')
        .lineWidth(0.5)
        .stroke();
    }

    doc.moveDown(2);

    // ── TOTAUX ────────────────────────────────────────────────
    const totauxX = 350;
    doc.fontSize(10);

    doc
      .font('Helvetica')
      .text('Total HT :', totauxX, doc.y)
      .text(`${vente.totalHT.toFixed(2)} €`, 480, doc.y - 12, { align: 'right', width: 65 });

    if (vente.remiseGlobale > 0) {
      doc
        .text(`Remise globale (${(vente.remiseGlobale * 100).toFixed(0)}%) :`, totauxX)
        .text(`-${(vente.totalHT / (1 - vente.remiseGlobale) * vente.remiseGlobale).toFixed(2)} €`, 480, doc.y - 12, { align: 'right', width: 65 });
    }

    doc
      .text('TVA :', totauxX)
      .text(`${vente.tva.toFixed(2)} €`, 480, doc.y - 12, { align: 'right', width: 65 });

    doc
      .moveTo(totauxX, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#1F3864')
      .lineWidth(1)
      .stroke()
      .moveDown(0.3);

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('TOTAL TTC :', totauxX)
      .text(`${vente.totalTTC.toFixed(2)} €`, 480, doc.y - 14, { align: 'right', width: 65 });

    // ── MODE DE PAIEMENT ──────────────────────────────────────
    doc
      .moveDown(2)
      .font('Helvetica')
      .fontSize(10)
      .text(`Mode de paiement : ${vente.modePaiement}`);

    // ── MENTIONS LÉGALES (art. L441-3 Code de commerce) ───────
    doc
      .moveDown(3)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#CCCCCC')
      .lineWidth(0.5)
      .stroke()
      .moveDown(0.5)
      .fontSize(7)
      .fillColor('#888888')
      .text(
        'Facture émise conformément à l\'article L441-3 du Code de commerce. ' +
        'En cas de retard de paiement, une pénalité de 3 fois le taux d\'intérêt légal sera appliquée, ' +
        'ainsi qu\'une indemnité forfaitaire de recouvrement de 40€ (art. L441-6 C.com.). ' +
        `TVA non applicable si micro-entreprise. SIRET : ${process.env.COMPANY_SIRET || '000 000 000 00000'}.`,
        { align: 'justify' }
      );

    doc.end();

    stream.on('finish', () => resolve({ fileName, filePath }));
    stream.on('error', reject);
  });
};