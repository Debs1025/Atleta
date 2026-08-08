import { Router } from 'express';
import userRoutes from './userRoutes';
import athleteRoutes from './athleteRoutes';
import notificationRoutes from './notificationRoutes';
import analyticsRoutes from './analyticsRoutes';
import teamRoutes from './teamRoutes';
import coachRoutes from './coachRoutes';
import inquiryRoutes from './inquiryRoutes';
import matchRoutes from './matchRoutes';
import scoutingRoutes from './scoutingRoutes';

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

// Mount coach routes at /coaches (/api/v1/coaches)
router.use('/coaches', coachRoutes);

// Mount inquiry routes at /inquiries (/api/v1/inquiries)
router.use('/inquiries', inquiryRoutes);

// Mount match routes at /matches (/api/v1/matches)
router.use('/matches', matchRoutes);

// Mount scouting routes at /scouting (/api/v1/scouting)
router.use('/scouting', scoutingRoutes);

export default router;
