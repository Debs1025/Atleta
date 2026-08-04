import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import {
  browseTeamDirectory,
  getTeamDetails,
  getAthleteTeam,
} from '../services/teamService';

/**
 * GET /api/v1/teams?sport=&search=
 * Browse team directory filtered by sport and/or name search.
 */
export async function browseTeams(req: AuthRequest, res: Response): Promise<void> {
  try {
    const sport = req.query.sport as string | undefined;
    const search = req.query.search as string | undefined;

    const startTime = Date.now();
    const teams = await browseTeamDirectory(sport, search);
    const responseTimeMs = Date.now() - startTime;

    res.set('X-Response-Time-Ms', String(responseTimeMs));
    res.status(200).json({
      total: teams.length,
      filters: { sport: sport || null, search: search || null },
      teams,
    });
  } catch (error: any) {
    console.error('browseTeams error:', error);
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
