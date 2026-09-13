import { db } from './firebaseAdmin';

/**
 * Generates an atomic sequential formatted ID using Firestore Transactions.
 * Example outputs:
 * - MATCH-0001, MATCH-0002, MATCH-0003...
 * - SCHED-0001, SCHED-0002...
 * - AUDIT-0001, AUDIT-0002...
 */
export async function generateSequentialId(
  counterName: string,
  prefix: string = 'MATCH',
  padding: number = 4
): Promise<string> {
  const counterRef = db.collection('System_Counters').doc(counterName);

  try {
    const nextId = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(counterRef);
      let currentSeq = 0;

      if (doc.exists) {
        currentSeq = Number(doc.data()?.current_sequence || 0);
      }

      const nextSeq = currentSeq + 1;
      transaction.set(
        counterRef,
        {
          counter_name: counterName,
          prefix,
          current_sequence: nextSeq,
          last_updated: new Date().toISOString(),
        },
        { merge: true }
      );

      const paddedNumber = String(nextSeq).padStart(padding, '0');
      return `${prefix}-${paddedNumber}`;
    });

    return nextId;
  } catch (error: any) {
    console.warn(`⚠️ [ID_GENERATOR] Atomic sequence generation failed for '${counterName}', falling back to high-entropy format:`, error.message);
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${dateStr}-${rand}`;
  }
}

/**
 * Generate formatted Match ID: MATCH-0001
 */
export async function generateCustomMatchId(isOfficial: boolean = false): Promise<string> {
  const counter = isOfficial ? 'official_matches' : 'matches';
  const prefix = isOfficial ? 'MATCH-OFF' : 'MATCH';
  return generateSequentialId(counter, prefix, 4);
}

/**
 * Generate formatted Schedule ID: SCHED-0001
 */
export async function generateCustomScheduleId(): Promise<string> {
  return generateSequentialId('official_schedules', 'SCHED', 4);
}

/**
 * Generate formatted Validation / Audit ID: AUDIT-0001
 */
export async function generateCustomAuditId(): Promise<string> {
  return generateSequentialId('official_audits', 'AUDIT', 4);
}

/**
 * Generate formatted Scoresheet Request ID: REQ-0001
 */
export async function generateCustomRequestId(): Promise<string> {
  return generateSequentialId('scoresheet_requests', 'REQ', 4);
}
