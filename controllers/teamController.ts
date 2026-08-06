import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import {
  browseTeamDirectory,
  getTeamDetails,
  getAthleteTeam,
  createTeam,
  updateTeamRoster,
  ServiceError,
} from '../services/teamService';
import { validateCreateTeam, validateUpdateRoster } from '../validators/teamValidator';

/**
 * GET /api/v1/teams?sport=&search=&coachId=
 * Browse team directory filtered by sport, coachId, and/or name search.
 */
export async function browseTeams(req: AuthRequest, res: Response): Promise<void> {
  try {
    const sport = req.query.sport as string | undefined;
    const search = req.query.search as string | undefined;
    const coachId = (req.query.coachId || req.query.coach_id) as string | undefined;

    const startTime = Date.now();
    const teams = await browseTeamDirectory(sport, search, coachId);
    const responseTimeMs = Date.now() - startTime;

    res.set('X-Response-Time-Ms', String(responseTimeMs));
    res.status(200).json({
      total: teams.length,
      filters: { sport: sport || null, search: search || null, coachId: coachId || null },
      teams,
    });
  } catch (error: any) {
    console.error('browseTeams error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * POST /api/v1/teams
 * Create a new team instance with name, sport category, and division.
 */
export async function createTeamHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const coachId = req.user?.uid || 'coach_default';

    const errors = validateCreateTeam(req.body);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const team = await createTeam(coachId, req.body);

    res.status(201).json({
      message: 'Team instance created successfully.',
      team,
    });
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('createTeamHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * PUT /api/v1/teams/:teamId/roster
 * Update roster positions, jersey numbers, or remove players with eligibility verification check.
 *
 * ACCEPTANCE CRITERIA:
 * 1. Require valid Bearer token; coaches may only edit teams they manage (403 Forbidden).
 * 2. Adding an athlete with unverified/missing documents flags an error and blocks roster confirmation unless override_unverified: true.
 */
export async function updateRosterHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const coachId = req.user!.uid;
    const teamId = Array.isArray(req.params.teamId) ? req.params.teamId[0] : req.params.teamId;

    if (!teamId) {
      res.status(400).json({ error: 'Team ID is required.' });
      return;
    }

    const errors = validateUpdateRoster(req.body);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const rawBody = req.body || {};
    const rosterItems = (Array.isArray(rawBody)
      ? rawBody
      : (rawBody.roster || rawBody.roster_list || [])).map((item: any) => ({
        ...item,
        athlete_id: item.athlete_id || item.user_id,
      }));
    const overrideUnverified = !!rawBody.override_unverified;

    const teamDetail = await updateTeamRoster(coachId, teamId, rosterItems, overrideUnverified);

    res.status(200).json({
      message: 'Squad roster updated successfully.',
      team: teamDetail,
    });
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('updateRosterHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * GET /api/v1/teams/:teamId
 * Retrieve specific team details, description, region, athlete count, coaching staff, and roster.
 */
export async function getTeam(req: AuthRequest, res: Response): Promise<void> {
  try {
    const teamId = Array.isArray(req.params.teamId)
      ? req.params.teamId[0]
      : req.params.teamId;

    if (!teamId) {
      res.status(400).json({ error: 'Team ID is required.' });
      return;
    }

    const startTime = Date.now();
    const team = await getTeamDetails(teamId);
    const responseTimeMs = Date.now() - startTime;

    if (!team) {
      res.status(404).json({ error: 'Team not found.' });
      return;
    }

    res.set('X-Response-Time-Ms', String(responseTimeMs));
    res.status(200).json(team);
  } catch (error: any) {
    console.error('getTeam error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * GET /api/v1/athletes/:athleteId/team
 * Retrieve the athlete's current team, coach reference, and full player roster with positions.
 */
export async function getAthleteTeamHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const athleteId = Array.isArray(req.params.athleteId)
      ? req.params.athleteId[0]
      : req.params.athleteId;

    if (!athleteId) {
      res.status(400).json({ error: 'Athlete ID is required.' });
      return;
    }

    const startTime = Date.now();
    const result = await getAthleteTeam(athleteId);
    const responseTimeMs = Date.now() - startTime;

    if (!result) {
      res.status(404).json({
        error: 'No team assignment found for this athlete.',
        athlete_id: athleteId,
      });
      return;
    }

    res.set('X-Response-Time-Ms', String(responseTimeMs));
    res.status(200).json(result);
  } catch (error: any) {
    console.error('getAthleteTeamHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}
