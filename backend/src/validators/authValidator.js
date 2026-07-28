
import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email invalide',
    'any.required': 'Email obligatoire',
  }),
  motDePasse: Joi.string().min(8).required().messages({
    'string.min': 'Mot de passe trop court (8 caractères min)',
    'any.required': 'Mot de passe obligatoire',
  }),
});