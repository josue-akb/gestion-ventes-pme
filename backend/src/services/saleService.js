// Calcul des totaux d'une vente
export const calculateTotals = (lignes, remiseGlobale = 0) => {
  let totalHT = 0;
  let totalTVA = 0;

  const lignesCalculees = lignes.map(ligne => {
    // Sous-total HT = quantité × prix × (1 - remise ligne)
    const sousTotal = +(
      ligne.quantite *
      ligne.prixUnitaireHT *
      (1 - (ligne.remiseLigne || 0))
    ).toFixed(2);

    // TVA calculée par ligne
    const tvaLigne = +(sousTotal * (ligne.tauxTVA / 100)).toFixed(2);

    totalHT += sousTotal;
    totalTVA += tvaLigne;

    return { ...ligne, sousTotal };
  });

  // Remise globale sur le total HT
  const totalHTApresRemise = +(totalHT * (1 - remiseGlobale)).toFixed(2);
  const totalTTC = +(totalHTApresRemise + totalTVA).toFixed(2);

  return {
    lignes: lignesCalculees,
    totalHT: totalHTApresRemise,
    remiseGlobale,
    tva: +totalTVA.toFixed(2),
    totalTTC,
  };
};