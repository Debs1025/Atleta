import { Router } from 'express';
import userRoutes from './userRoutes';

const router = Router();

// Mount user routes at /users
router.use('/users', userRoutes);

export default router;
