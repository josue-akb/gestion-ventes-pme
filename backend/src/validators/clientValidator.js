
import Joi from 'joi';

export const createClientSchema = Joi.object({
  nom:        Joi.string().trim().min(2).max(100).required()
                .messages({ 'any.required': 'Le nom est obligatoire' }),
  prenom:     Joi.string().trim().min(2).max(100).required()
                .messages({ 'any.required': 'Le prénom est obligatoire' }),
  email:      Joi.string().email().required()
                .messages({ 'any.required': "L'email est obligatoire" }),
  telephone:  Joi.string().trim().max(20).allow(''),
  entreprise: Joi.string().trim().max(100).allow(''),
  adresse:    Joi.string().trim().max(200).allow(''),
});

export const updateClientSchema = Joi.object({
  _id:        Joi.any().strip(),
  __v:        Joi.any().strip(),
  createdAt:  Joi.any().strip(),
  updatedAt:  Joi.any().strip(),
  nom:        Joi.string().trim().min(2).max(100),
  prenom:     Joi.string().trim().min(2).max(100),
  email:      Joi.string().email(),
  telephone:  Joi.string().trim().max(20).allow(''),
  entreprise: Joi.string().trim().max(100).allow(''),
  adresse:    Joi.string().trim().max(200).allow(''),
  actif:      Joi.boolean(),
}).min(1);