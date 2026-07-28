
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { loginSchema } from '../validators/authValidator.js';

const genererAccessToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '15m' });

const genererRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { email, motDePasse } = value;


    const user = await User.findOne({ email }).select(
      '+motDePasse +tentativesConnexion +bloquéJusquA'
    );

    if (!user)
      return res.status(401).json({ message: 'Identifiants incorrects' });

    if (!user.actif)
      return res.status(403).json({
        message: 'Compte désactivé. Contactez l"administrateur.',
      });

    if (user.estBloque()) {
      const restant = Math.ceil((user.bloquéJusquA - Date.now()) / 60000);
      return res.status(429).json({
        message: `Trop de tentatives. Réessayez dans ${restant} minute(s).`,
      });
    }
    const mdpValide = await user.comparerMotDePasse(motDePasse);

    if (!mdpValide) {
      user.tentativesConnexion += 1;
      if (user.tentativesConnexion >= 10) {
        user.bloquéJusquA = new Date(Date.now() + 15 * 60 * 1000);
        user.tentativesConnexion = 0;
      }
      await user.save({ validateBeforeSave: false });
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    user.tentativesConnexion = 0;
    user.bloquéJusquA = undefined;
    user.derniereConnexion = new Date();
    await user.save({ validateBeforeSave: false });

    const accessToken = genererAccessToken(user._id, user.role);
    const refreshToken = genererRefreshToken(user._id);

    res.cookie('refreshToken', refreshToken, cookieOptions);

    res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token)
      return res.status(401).json({ message: 'Refresh token manquant' });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.actif)
      return res.status(401).json({ message: 'Utilisateur invalide' });

    const accessToken = genererAccessToken(user._id, user.role);
    res.status(200).json({ accessToken });
  } catch (err) {
    res.status(401).json({ message: 'Refresh token invalide ou expiré' });
  }
};

export const logout = (req, res) => {
  res.clearCookie('refreshToken', cookieOptions);
  res.status(200).json({ message: 'Déconnexion réussie' });
};