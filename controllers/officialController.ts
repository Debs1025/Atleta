import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { db } from '../utils/firebaseAdmin';
import {
  validateRegisterOfficial,
  validateUpdateOfficialSettings,
} from '../validators/officialValidator';
import { validateLoginUser } from '../validators/userValidator';
import {
  registerOfficialService,
  loginOfficialService,
  getOfficialSettings,
  updateOfficialSettings,
  ServiceError,
} from '../services/officialService';

export async function registerOfficialHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = req.body as Record<string, unknown>;

    const errors = validateRegisterOfficial(data);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const result = await registerOfficialService(data as any);
    res.status(201).json({
      message: 'Official registered successfully.',
      ...result,
    });
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      res.status(409).json({ error: 'An official with this email already exists.' });
      return;
    }
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Register official error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

export async function loginOfficialHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validateLoginUser(req.body);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const { email, password } = req.body;
    const result = await loginOfficialService(email, password);

    res.status(200).json({
      message: 'Official login successful.',
      ...result,
    });
  } catch (error: any) {
    if (
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/user-not-found' ||
      (error instanceof ServiceError && error.statusCode === 403)
    ) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Login official error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

export async function getOfficialSettingsHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Official') {
      res.status(401).json({ error: 'Unauthorized. Official role required.' });
      return;
    }

    const uid = req.user.uid;
    const profileDoc = await db.collection('Official_Profiles').doc(uid).get();
    if (!profileDoc.exists) {
      res.status(404).json({ error: 'Official profile not found.' });
      return;
    }

    const officialId = profileDoc.data()!.official_id;
    const settings = await getOfficialSettings(officialId);

    res.status(200).json(settings);
  } catch (error: any) {
    console.error('Get official settings error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

export async function updateOfficialSettingsHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Official') {
      res.status(401).json({ error: 'Unauthorized. Official role required.' });
      return;
    }

    const errors = validateUpdateOfficialSettings(req.body);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const uid = req.user.uid;
    const profileDoc = await db.collection('Official_Profiles').doc(uid).get();
    if (!profileDoc.exists) {
      res.status(404).json({ error: 'Official profile not found.' });
      return;
    }

    const officialId = profileDoc.data()!.official_id;
    const settings = await updateOfficialSettings(officialId, req.body);

    res.status(200).json({
      message: 'Official settings updated successfully.',
      settings,
    });
  } catch (error: any) {
    console.error('Update official settings error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}
