import { Router } from 'express';
import userRoutes from './userRoutes';
import athleteRoutes from './athleteRoutes';
import notificationRoutes from './notificationRoutes';
import analyticsRoutes from './analyticsRoutes';
import teamRoutes from './teamRoutes';

const router = Router();

// Mount user routes at /users (/api/v1/users)
router.use('/users', userRoutes);

// Mount athlete routes at /athletes (/api/v1/athletes)
router.use('/athletes', athleteRoutes);

// Mount notification routes at /notifications (/api/v1/notifications)
router.use('/notifications', notificationRoutes);

// Mount analytics routes at /analytics (/api/v1/analytics)
router.use('/analytics', analyticsRoutes);

// Mount team routes at /teams (/api/v1/teams)
router.use('/teams', teamRoutes);

export default router;
