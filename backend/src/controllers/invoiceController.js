import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Invoice from '../models/Invoice.js';
import Sale from '../models/Sale.js';
import Client from '../models/Client.js';
import { generateInvoicePDF } from '../services/invoiceService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── POST /invoices (générer depuis une vente) ─────────────────
export const createInvoice = async (req, res) => {
  try {
    const { venteId } = req.body;
    if (!venteId)
      return res.status(400).json({ message: 'venteId obligatoire' });

    // Vérifier que la vente existe
    const vente = await Sale.findById(venteId)
      .populate('clientId')
      .populate('commercialId', 'nom prenom');

    if (!vente)
      return res.status(404).json({ message: 'Vente introuvable' });

    // Vérifier qu'une facture n'existe pas déjà
    const existante = await Invoice.findOne({ venteId });
    if (existante)
      return res.status(409).json({
        message: 'Une facture existe déjà pour cette vente',
        invoice: existante,
      });

    const client = vente.clientId;

    // Créer la facture en base
    const invoice = await Invoice.create({
      venteId,
      clientId: client._id,
      commercialId: vente.commercialId._id,
      montants: {
        totalHT:       vente.totalHT,
        remiseGlobale: vente.remiseGlobale,
        tva:           vente.tva,
        totalTTC:      vente.totalTTC,
      },
    });

    // Générer le PDF
    const { fileName } = await generateInvoicePDF(invoice, vente, client);
    invoice.urlPdf = `/invoices/download/${invoice._id}`;
    await invoice.save();

    res.status(201).json({
      message: 'Facture générée avec succès',
      invoice,
      urlPdf: invoice.urlPdf,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── GET /invoices ─────────────────────────────────────────────
export const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, clientId, statut } = req.query;
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (statut)   filter.statut = statut;

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate('clientId', 'nom prenom entreprise')
      .populate('commercialId', 'nom prenom')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      invoices,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── GET /invoices/:id ─────────────────────────────────────────
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('clientId', 'nom prenom entreprise email adresse')
      .populate('venteId')
      .populate('commercialId', 'nom prenom');

    if (!invoice)
      return res.status(404).json({ message: 'Facture introuvable' });

    res.status(200).json(invoice);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ── GET /invoices/download/:id ────────────────────────────────
export const downloadInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('clientId')
      .populate('venteId');

    if (!invoice)
      return res.status(404).json({ message: 'Facture introuvable' });

    const vente = invoice.venteId;
    const client = invoice.clientId;

    // Générer le PDF à la volée
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${invoice.numero}.pdf`);

    doc.pipe(res);

    // En-tête
    doc.fontSize(22).font('Helvetica-Bold').text('FACTURE', { align: 'center' });
    doc.fontSize(11).font('Helvetica')
      .moveDown(0.5)
      .text(`N° ${invoice.numero}`, { align: 'right' })
      .text(`Date : ${new Date(invoice.dateEmission).toLocaleDateString('fr-FR')}`, { align: 'right' });

    doc.moveDown()
      .moveTo(50, doc.y).lineTo(545, doc.y)
      .strokeColor('1F3864').lineWidth(2).stroke().moveDown();

    // Vendeur / Client
    const yBloc = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').text('VENDEUR', 50, yBloc)
      .font('Helvetica')
      .text('GV PME SAS', 50)
      .text('SIRET : 000 000 000 00000')
      .text('1 rue de la Paix, 75001 Paris')
      .text('contact@gvpme.fr');

    doc.fontSize(9).font('Helvetica-Bold').text('CLIENT', 300, yBloc)
      .font('Helvetica')
      .text(`${client.nom} ${client.prenom}`, 300)
      .text(client.entreprise || '-', 300)
      .text(client.adresse || '-', 300)
      .text(client.email, 300);

    doc.moveDown(2);

    // Tableau lignes
    const tableTop = doc.y;
    doc.rect(50, tableTop, 495, 18).fill('1F3864');
    doc.fillColor('FFFFFF').fontSize(9).font('Helvetica-Bold')
      .text('Désignation', 54, tableTop + 4)
      .text('Qté', 270, tableTop + 4)
      .text('P.U. HT', 330, tableTop + 4)
      .text('Remise', 395, tableTop + 4)
      .text('Sous-total HT', 460, tableTop + 4);

    doc.font('Helvetica').fontSize(9).fillColor('000000');
    let y = tableTop + 22;

    for (const [idx, ligne] of vente.lignes.entries()) {
      if (idx % 2 === 0) doc.rect(50, y - 2, 495, 18).fill('F8F9FB');
      doc.fillColor('000000')
        .text(ligne.nom, 54, y, { width: 205 })
        .text(String(ligne.quantite), 270, y)
        .text(`${ligne.prixUnitaireHT.toFixed(2)} €`, 330, y)
        .text(ligne.remiseLigne > 0 ? `${(ligne.remiseLigne * 100).toFixed(0)}%` : '-', 395, y)
        .text(`${ligne.sousTotal.toFixed(2)} €`, 460, y);
      y += 18;
    }

    doc.moveTo(50, y + 4).lineTo(545, y + 4)
      .strokeColor('CCCCCC').lineWidth(0.5).stroke();

    y += 16;
    doc.font('Helvetica').fontSize(10).fillColor('000000')
      .text('Total HT :', 350, y)
      .text(`${vente.totalHT.toFixed(2)} €`, 460, y, { width: 85, align: 'right' });
    y += 18;
    doc.text('TVA :', 350, y)
      .text(`${vente.tva.toFixed(2)} €`, 460, y, { width: 85, align: 'right' });
    y += 4;
    doc.moveTo(350, y).lineTo(545, y).strokeColor('1F3864').lineWidth(1).stroke();
    y += 8;
    doc.font('Helvetica-Bold').fontSize(12)
      .text('TOTAL TTC :', 350, y)
      .text(`${vente.totalTTC.toFixed(2)} €`, 460, y, { width: 85, align: 'right' });

    y += 28;
    doc.font('Helvetica').fontSize(10)
      .text(`Mode de paiement : ${vente.modePaiement}`, 50, y);

    y += 40;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('CCCCCC').lineWidth(0.5).stroke();
    y += 8;
    doc.fontSize(7).fillColor('888888')
      .text(
        "Facture émise conformément à l'article L441-3 du Code de commerce. " +
        "En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée, " +
        "ainsi qu'une indemnité forfaitaire de recouvrement de 40€ (art. L441-6 C.com.).",
        50, y, { width: 495, align: 'justify' }
      );

    doc.end();

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};