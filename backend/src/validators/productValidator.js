// backend/src/validators/productValidator.js
import Joi from 'joi';

export const createProductSchema = Joi.object({
  nom:          Joi.string().trim().min(2).max(100).required()
                  .messages({ 'any.required': 'Le nom est obligatoire' }),
  categorie:    Joi.string().trim().min(2).max(50).required()
                  .messages({ 'any.required': 'La catégorie est obligatoire' }),
  prixHT:       Joi.number().min(0).required()
                  .messages({ 'any.required': 'Le prix HT est obligatoire' }),
  tauxTVA:      Joi.number().valid(5.5, 10, 20).default(20),
  stock:        Joi.number().integer().min(0).default(0),
  seuilAlerte:  Joi.number().integer().min(0).default(5),
  description:  Joi.string().trim().max(500).allow(''),
});

export const updateProductSchema = Joi.object({
  _id:          Joi.any().strip(),
  __v:          Joi.any().strip(),
  createdAt:    Joi.any().strip(),
  updatedAt:    Joi.any().strip(),
  nom:          Joi.string().trim().min(2).max(100),
  categorie:    Joi.string().trim().min(2).max(50),
  prixHT:       Joi.number().min(0),
  tauxTVA:      Joi.number().valid(5.5, 10, 20),
  stock:        Joi.number().integer().min(0),
  seuilAlerte:  Joi.number().integer().min(0),
  description:  Joi.string().trim().max(500).allow(''),
  actif:        Joi.boolean(),
}).min(1);