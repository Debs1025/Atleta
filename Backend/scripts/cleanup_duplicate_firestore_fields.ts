import { db } from '../utils/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const REDUNDANT_FIELDS_MAP: Record<string, Record<string, string>> = {
  Match_Logs: {
    gameName: 'game_name',
    gameReferenceId: 'game_name',
    matchName: 'game_name',
    customGameTitle: 'game_name',
    custom_game_title: 'game_name',
    scoresheetUrl: 'scoresheet_url',
    scoresheetUrls: 'scoresheet_urls',
    playerStats: 'player_stats',
    rosterAthletes: 'roster_athletes',
    awayRosterAthletes: 'away_roster_athletes',
    resultBadgeText: 'result_badge_text',
    tournamentId: 'tournament_id',
    tournamentName: 'tournament_name',
  },
  Coach_Profiles: {
    updatedAt: 'updated_at',
    isApproved: 'is_approved',
    isVerified: 'is_verified',
    coachingPhilosophy: 'coaching_philosophy',
    phoneNumber: 'phone_number',
  },
  Users: {
    isApproved: 'is_approved',
    isVerified: 'is_verified',
    authProvider: 'auth_provider',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    fullName: 'full_name',
    phoneNumber: 'phone_number',
  },
  Official_Profiles: {
    isApproved: 'is_approved',
    phoneNumber: 'phone_number',
  },
  Official_Validations: {
    matchName: 'match_name',
    scoresheetUrl: 'scoresheet_url',
  },
  Notifications: {
    matchId: 'match_id',
    scoresheetUrl: 'scoresheet_url',
  },
  Performance_Metrics: {
    eventType: 'event_type',
  },
  Scouting_Registry: {
    athleteId: 'athlete_id',
    coachId: 'coach_id',
  },
  Athlete_Profiles: {
    phoneNumber: 'phone_number',
  },
};

async function executeCleanup() {
  console.log('=== STARTING FIRESTORE REDUNDANT SCHEMA CLEANUP ===\n');
  let totalDocsCleaned = 0;
  let totalFieldsRemoved = 0;

  for (const [colName, fieldMap] of Object.entries(REDUNDANT_FIELDS_MAP)) {
    const snap = await db.collection(colName).get();
    let colDocs = 0;
    let colFields = 0;

    const batch = db.batch();
    let batchCount = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      const updatePayload: Record<string, any> = {};
      let docHasRedundant = false;

      for (const [redundantKey, canonicalKey] of Object.entries(fieldMap)) {
        if (data[redundantKey] !== undefined) {
          docHasRedundant = true;
          colFields++;

          // Ensure canonical key has value before deleting redundant key
          if (data[canonicalKey] === undefined || data[canonicalKey] === null || data[canonicalKey] === '') {
            updatePayload[canonicalKey] = data[redundantKey];
          }
          // Delete redundant duplicate key
          updatePayload[redundantKey] = FieldValue.delete();
        }
      }

      if (docHasRedundant) {
        colDocs++;
        batch.update(doc.ref, updatePayload);
        batchCount++;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      console.log(`[CLEANED] ${colName}: Removed ${colFields} duplicate fields across ${colDocs} documents.`);
    } else {
      console.log(`[CLEAN] ${colName}: No duplicate fields found.`);
    }

    totalDocsCleaned += colDocs;
    totalFieldsRemoved += colFields;
  }

  console.log(`\n=== CLEANUP COMPLETE: Cleaned ${totalDocsCleaned} docs, removed ${totalFieldsRemoved} duplicate fields. ===`);
}

executeCleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
