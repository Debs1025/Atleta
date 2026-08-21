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
import officialRoutes from './officialRoutes';
import validationRoutes from './validationRoutes';
import adminRoutes from './adminRoutes';
import sportRoutes from './sportRoutes';
import syncRoutes from './syncRoutes';

const router = Router();

// API v1 Root Information
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Atleta Athletic Performance Monitoring & Scouting REST API v1',
    version: '1.0',
    endpoints: {
      admin: '/api/v1/admin',
      users: '/api/v1/users',
      athletes: '/api/v1/athletes',
      notifications: '/api/v1/notifications',
      analytics: '/api/v1/analytics',
      teams: '/api/v1/teams',
      coaches: '/api/v1/coaches',
      officials: '/api/v1/officials',
      inquiries: '/api/v1/inquiries',
      matches: '/api/v1/matches',
      scouting: '/api/v1/scouting',
      validations: '/api/v1/validations',
      sports: '/api/v1/sports',
      sync: '/api/v1/sync',
    },
  });
});

router.use('/admin', adminRoutes);
router.use('/users', userRoutes);
router.use('/athletes', athleteRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/teams', teamRoutes);
router.use('/coaches', coachRoutes);
router.use('/officials', officialRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/matches', matchRoutes);
router.use('/scouting', scoutingRoutes);
router.use('/validations', validationRoutes);
router.use('/sports', sportRoutes);
router.use('/sync', syncRoutes);

export default router;

