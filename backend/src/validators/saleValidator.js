import Joi from 'joi';

export const createSaleSchema = Joi.object({
  clientId: Joi.string().hex().length(24).required()
    .messages({ 'any.required': 'Le client est obligatoire' }),
  lignes: Joi.array().items(
    Joi.object({
      produitId:      Joi.string().hex().length(24).required(),
      quantite:       Joi.number().integer().min(1).required(),
      remiseLigne:    Joi.number().min(0).max(1).default(0),
    })
  ).min(1).required()
    .messages({ 'any.required': 'Au moins une ligne est obligatoire' }),
  remiseGlobale:  Joi.number().min(0).max(0.5).default(0),
  modePaiement:   Joi.string().valid('CB', 'Virement', 'Especes', 'Cheque').required()
    .messages({ 'any.required': 'Le mode de paiement est obligatoire' }),
});