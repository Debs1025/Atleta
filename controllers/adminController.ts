import { Request, Response } from 'express';
import { validateRegisterAdmin, validateLoginAdmin } from '../validators/adminValidator';
import { registerAdminService, loginAdminService } from '../services/adminService';
import { ServiceError } from '../validators/matchValidator';
import { AdminAuthRequest } from '../middlewares/adminMiddleware';

/**
 * POST /api/v1/admin/register – Register a system admin account with institutional email and provision Admin_Profiles.
 * ACCEPTANCE CRITERIA: Registration attempts without accepting mandatory RBAC compliance return HTTP 400 Bad Request.
 */
export async function registerAdminHandler(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body as Record<string, unknown>;

    // 1. Validate payload requirements and mandatory RBAC compliance
    const errors = validateRegisterAdmin(data);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';

    // 2. Register system admin & provision Admin_Profiles
    const result = await registerAdminService(data as any, clientIp);

    res.status(201).json({
      message: 'System Admin account registered and provisioned successfully.',
      ...result,
    });
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('registerAdminHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * POST /api/v1/admin/login – Validate admin credentials and return an elevated Bearer JWT.
 * ACCEPTANCE CRITERIA: Authentication endpoints respond in under 500ms.
 */
export async function loginAdminHandler(req: Request, res: Response): Promise<void> {
  try {
    const errors = validateLoginAdmin(req.body);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const { email, password } = req.body;
    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';

    const result = await loginAdminService(email, password, clientIp);

    res.status(200).json({
      message: 'System Admin authenticated successfully.',
      ...result,
    });
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('loginAdminHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * GET /api/v1/admin/me – Get administrative profile (Protected with RBAC).
 */
export async function getAdminProfileHandler(req: AdminAuthRequest, res: Response): Promise<void> {
  res.status(200).json({
    message: 'System Admin profile and active session retrieved.',
    user: req.user,
    admin_profile: req.adminUser,
  });
}
