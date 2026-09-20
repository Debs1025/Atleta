import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Edit2,
  Save,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Trophy,
} from 'lucide-react';
import type { RawOCRDetectedData, DetectedAthleteStat } from '../api/types';
import { submitVerifiedMatch } from '../api/client';

interface OCROutputViewProps {
  rawOCRData: RawOCRDetectedData;
  onBack: () => void;
  onSaveSuccess: () => void;
}

export const OCROutputView: React.FC<OCROutputViewProps> = ({
  rawOCRData,
  onBack,
  onSaveSuccess,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [athleteStats, setAthleteStats] = useState<DetectedAthleteStat[]>(
    rawOCRData.athlete_overview || []
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Teams list
  const teamList = useMemo(() => {
    const set = new Set<string>();
    if (rawOCRData.teams && Array.isArray(rawOCRData.teams)) {
      rawOCRData.teams.forEach((t) => set.add(String(t).trim().toUpperCase()));
    }
    if (rawOCRData.team_scores && Array.isArray(rawOCRData.team_scores)) {
      rawOCRData.team_scores.forEach((t) => set.add(String(t.team).trim().toUpperCase()));
    }
    if (rawOCRData.team_name) set.add(String(rawOCRData.team_name).trim().toUpperCase());
    if (rawOCRData.opponent_team_name) set.add(String(rawOCRData.opponent_team_name).trim().toUpperCase());
    athleteStats.forEach((a) => {
      if (a.team_name) set.add(String(a.team_name).trim().toUpperCase());
    });
    return Array.from(set).filter((t) => t.length > 0);
  }, [rawOCRData, athleteStats]);

  // Filtered athletes based on active tab
  const visibleAthletes = useMemo(() => {
    if (selectedTeamFilter === 'ALL') return athleteStats;
    return athleteStats.filter(
      (a) => (a.team_name || '').toUpperCase() === selectedTeamFilter.toUpperCase()
    );
  }, [athleteStats, selectedTeamFilter]);

  // Totals row calculation
  const totals = useMemo(() => {
    return visibleAthletes.reduce(
      (acc, curr) => {
        acc.pts += curr.pts || 0;
        acc.ast += curr.ast || 0;
        acc.to += curr.to || 0;
        acc.reb += curr.reb || 0;
        acc.stl += curr.stl || 0;
        acc.blk += curr.blk || 0;
        acc.min += curr.min || 0;
        return acc;
      },
      { pts: 0, ast: 0, to: 0, reb: 0, stl: 0, blk: 0, min: 0 }
    );
  }, [visibleAthletes]);

  // Cell Edit Handler
  const handleStatChange = (
    targetAthleteId: string,
    field: keyof DetectedAthleteStat,
    value: string
  ) => {
    setAthleteStats((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((a) => a.athlete_id === targetAthleteId);
      if (idx === -1) return prev;
      const numVal = parseInt(value, 10);
      updated[idx] = {
        ...updated[idx],
        [field]: isNaN(numVal) ? 0 : numVal,
      };
      return updated;
    });
  };

  // Toggle Athlete Team between Home and Away
  const handleToggleTeam = (targetAthleteId: string) => {
    setAthleteStats((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((a) => a.athlete_id === targetAthleteId);
      if (idx === -1) return prev;
      const current = (updated[idx].team_name || '').toUpperCase();
      const home = (rawOCRData.team_name || 'HOME').toUpperCase();
      const away = (rawOCRData.opponent_team_name || 'AWAY').toUpperCase();
      const nextTeam = current === home ? away : home;
      updated[idx] = {
        ...updated[idx],
        team_name: nextTeam,
      };
      return updated;
    });
  };

  // Confirm and save match
  const handleSaveMatch = async () => {
    setFeedback(null);
    setSaving(true);
    try {
      const homeTeam = (rawOCRData.team_name || 'HOME TEAM').toUpperCase();
      const oppTeam = (rawOCRData.opponent_team_name || 'OPPONENT TEAM').toUpperCase();

      const homePts = athleteStats
        .filter((a) => (a.team_name || '').toUpperCase() === homeTeam)
        .reduce((sum, a) => sum + (a.pts || 0), 0);
      const awayPts = athleteStats
        .filter((a) => (a.team_name || '').toUpperCase() === oppTeam)
        .reduce((sum, a) => sum + (a.pts || 0), 0);

      const payload = {
        team_id: rawOCRData.team_name || 'team_official',
        sport_type: rawOCRData.sport_type || 'BASKETBALL',
        match_name: `${homeTeam} vs ${oppTeam}`,
        match_type: 'Official Match',
        match_date: new Date().toISOString(),
        location: 'Tournament Arena',
        opponent_team_name: oppTeam,
        game_result: homePts >= awayPts ? 'WIN' : 'LOSS',
        home_score: homePts,
        away_score: awayPts,
        notes: `Official OCR Logged Match (${homeTeam}: ${homePts} vs ${oppTeam}: ${awayPts})`,
        player_stats: athleteStats.map((a) => ({
          athlete_id: a.athlete_id,
          player_name: a.player_name,
          team_name: a.team_name,
          jersey_number: a.jersey_number,
          pts: a.pts || 0,
          ast: a.ast || 0,
          reb: a.reb || 0,
          stl: a.stl || 0,
          blk: a.blk || 0,
          to: a.to || 0,
          min: a.min || 0,
          stats: {
            points: a.pts || 0,
            assists: a.ast || 0,
            rebounds: a.reb || 0,
            steals: a.stl || 0,
            blocks: a.blk || 0,
            turnovers: a.to || 0,
            minutes: a.min || 0,
          },
        })),
      };

      await submitVerifiedMatch(payload);
      setFeedback({ type: 'success', message: 'Match successfully logged and verified in Firestore database.' });
      setTimeout(() => {
        onSaveSuccess();
      }, 1500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit verified match statistics.' });
    } finally {
      setSaving(false);
    }
  };

  const homeScore = athleteStats
    .filter((a) => (a.team_name || '').toUpperCase() === (rawOCRData.team_name || 'HOME').toUpperCase())
    .reduce((s, a) => s + (a.pts || 0), 0);

  const awayScore = athleteStats
    .filter((a) => (a.team_name || '').toUpperCase() === (rawOCRData.opponent_team_name || 'AWAY').toUpperCase())
    .reduce((s, a) => s + (a.pts || 0), 0);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#0B132B] hover:text-slate-600 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO UPLOADER</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition cursor-pointer border ${
              isEditing
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-[#0B132B] border-slate-300 hover:bg-slate-50'
            }`}
          >
            {isEditing ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Done Editing</span>
              </>
            ) : (
              <>
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Box Score</span>
              </>
            )}
          </button>

          <button
            onClick={handleSaveMatch}
            disabled={saving}
            className="bg-[#0B132B] hover:bg-[#1E293B] text-white px-6 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition cursor-pointer disabled:opacity-70 shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting to Database...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Confirm & Log Match</span>
              </>
            )}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-lg text-xs font-medium flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Score Banner */}
      <div className="bg-[#0B132B] text-white rounded-xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              HOME TEAM
            </span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-1">
              {rawOCRData.team_name || 'HOME TEAM'}
            </h2>
            <div className="text-4xl font-black text-amber-400 mt-2">{homeScore}</div>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
              VS
            </span>
            <span className="text-xs font-bold text-slate-300 mt-2 flex items-center space-x-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>{rawOCRData.sport_type || 'BASKETBALL'}</span>
            </span>
          </div>

          <div className="flex-1 text-center md:text-right">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              AWAY TEAM
            </span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-1">
              {rawOCRData.opponent_team_name || 'AWAY TEAM'}
            </h2>
            <div className="text-4xl font-black text-amber-400 mt-2">{awayScore}</div>
          </div>
        </div>
      </div>

      {/* Team Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setSelectedTeamFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
            selectedTeamFilter === 'ALL'
              ? 'bg-[#0B132B] text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Players ({athleteStats.length})
        </button>
        {teamList.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTeamFilter(t)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
              selectedTeamFilter === t
                ? 'bg-[#0B132B] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t} ({athleteStats.filter((a) => (a.team_name || '').toUpperCase() === t).length})
          </button>
        ))}
      </div>

      {/* Box Score Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#0B132B]">
            EXTRACTED PLAYER BOX SCORE
          </span>
          <span className="text-[11px] text-slate-500">
            {isEditing ? 'Editing Mode Active: tap numbers to edit' : 'Tap team badge to toggle Home/Away'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Athlete Name</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-3 text-center">PTS</th>
                <th className="py-3 px-3 text-center">AST</th>
                <th className="py-3 px-3 text-center">TO</th>
                <th className="py-3 px-3 text-center">REB</th>
                <th className="py-3 px-3 text-center">STL</th>
                <th className="py-3 px-3 text-center">BLK</th>
                <th className="py-3 px-3 text-center">MIN</th>
                <th className="py-3 px-4 text-center">FG%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleAthletes.map((a) => {
                const isHome = (a.team_name || '').toUpperCase() === (rawOCRData.team_name || 'HOME').toUpperCase();
                return (
                  <tr key={a.athlete_id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 text-center font-bold text-slate-500">
                      {a.jersey_number ? `#${a.jersey_number}` : '-'}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0B132B]">
                      {a.player_name}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleTeam(a.athlete_id)}
                        title="Click to toggle Home / Away"
                        className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition cursor-pointer border flex items-center space-x-1 ${
                          isHome
                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <span>{a.team_name || (isHome ? 'HOME' : 'AWAY')}</span>
                        <RefreshCw className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    </td>

                    {/* Stats columns */}
                    {(['pts', 'ast', 'to', 'reb', 'stl', 'blk', 'min'] as const).map((stat) => (
                      <td key={stat} className="py-3 px-3 text-center font-bold text-[#0B132B]">
                        {isEditing ? (
                          <input
                            type="number"
                            value={a[stat] ?? 0}
                            onChange={(e) => handleStatChange(a.athlete_id, stat, e.target.value)}
                            className="w-14 text-center bg-amber-50 border border-amber-300 rounded py-1 px-1 text-xs font-bold text-[#0B132B] focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        ) : (
                          a[stat] ?? 0
                        )}
                      </td>
                    ))}

                    <td className="py-3 px-4 text-center font-semibold text-slate-600">
                      {a.fg_pct || '0%'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-extrabold text-[#0B132B] text-xs">
                <td className="py-3 px-4 text-center" colSpan={3}>
                  TOTALS ({visibleAthletes.length} Players)
                </td>
                <td className="py-3 px-3 text-center text-amber-600">{totals.pts}</td>
                <td className="py-3 px-3 text-center">{totals.ast}</td>
                <td className="py-3 px-3 text-center">{totals.to}</td>
                <td className="py-3 px-3 text-center">{totals.reb}</td>
                <td className="py-3 px-3 text-center">{totals.stl}</td>
                <td className="py-3 px-3 text-center">{totals.blk}</td>
                <td className="py-3 px-3 text-center">{totals.min}</td>
                <td className="py-3 px-4 text-center">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
