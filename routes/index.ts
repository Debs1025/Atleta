import { Router } from 'express';
import userRoutes from './userRoutes';
import athleteRoutes from './athleteRoutes';
import notificationRoutes from './notificationRoutes';

const router = Router();

// Mount user routes at /users (/api/v1/users)
router.use('/users', userRoutes);

// Mount athlete routes at /athletes (/api/v1/athletes)
router.use('/athletes', athleteRoutes);

// Mount notification routes at /notifications (/api/v1/notifications)
router.use('/notifications', notificationRoutes);

export default router;
