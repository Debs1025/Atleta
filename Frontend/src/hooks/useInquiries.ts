import { useState, useEffect, useCallback } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebaseClient";
import { useAccount } from "../context/AccountContext";
import { requestAuthenticatedJson } from "../screens/Mobile/Authentication/authShared";

export interface InquiryItem {
  id: string;
  inquiry_id: string;
  scout_id: string;
  athlete_id: string;
  athlete_name?: string;
  coach_id: string;
  coach_name?: string;
  coach_scout_id?: string;
  coachId?: string;
  initiated_by?: string;
  offer_status: string;
  status: string;
  offer_message?: string;
  message?: string;
  date_initiated?: string;
  created_at?: string;
  updated_at?: string;
  actionable?: boolean;
  is_sender?: boolean;
  [key: string]: any;
}

/**
 * Universal Hook for Coach and Athlete Inquiries.
 * Eliminates OAuth vs Email/Password UID mismatches by resolving both canonical
 * and raw UIDs ('coach_${uid}' and '${uid}') across Scouting_Registry and inquiries collections.
 * Handles user context hydration to avoid race conditions.
 */
export function useInquiries(targetId?: string) {
  const { currentUser, loading: accountLoading } = useAccount();
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedId =
    targetId ||
    currentUser?.coachId ||
    currentUser?.uid ||
    currentUser?.cleanUid ||
    "";

  const cleanId = resolvedId ? resolvedId.replace(/^(coach_|ath_)/, "") : "";
  const canonicalCoachId = cleanId ? `coach_${cleanId}` : "";
  const possibleCoachIds = Array.from(
    new Set([resolvedId, cleanId, canonicalCoachId].filter(Boolean))
  );

  const fetchInquiries = useCallback(async () => {
    if (!resolvedId) {
      if (!accountLoading) setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res: any = await requestAuthenticatedJson("/inquiries").catch(() => null);
      const list = res?.inquiries || (Array.isArray(res) ? res : []);
      if (Array.isArray(list) && list.length > 0) {
        setInquiries(list);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to fetch inquiries");
    } finally {
      setLoading(false);
    }
  }, [resolvedId, accountLoading]);

  useEffect(() => {
    if (!resolvedId || possibleCoachIds.length === 0) {
      if (!accountLoading) setLoading(false);
      return;
    }

    const docMap = new Map<string, InquiryItem>();
    const emit = () => {
      setInquiries(Array.from(docMap.values()));
      setLoading(false);
    };

    // 1. Query Scouting_Registry by coach_scout_id
    const q1 = query(
      collection(db, "Scouting_Registry"),
      where("coach_scout_id", "in", possibleCoachIds)
    );
    // 2. Query Scouting_Registry by coachId
    const q2 = query(
      collection(db, "Scouting_Registry"),
      where("coachId", "in", possibleCoachIds)
    );
    // 3. Query inquiries by coachId
    const q3 = query(
      collection(db, "inquiries"),
      where("coachId", "in", possibleCoachIds)
    );

    const unsub1 = onSnapshot(q1, (snap) => {
      snap.forEach((d) => docMap.set(d.id, { id: d.id, inquiry_id: d.id, scout_id: d.id, ...(d.data() as any) }));
      emit();
    }, () => {});

    const unsub2 = onSnapshot(q2, (snap) => {
      snap.forEach((d) => docMap.set(d.id, { id: d.id, inquiry_id: d.id, scout_id: d.id, ...(d.data() as any) }));
      emit();
    }, () => {});

    const unsub3 = onSnapshot(q3, (snap) => {
      snap.forEach((d) => docMap.set(d.id, { id: d.id, inquiry_id: d.id, scout_id: d.id, ...(d.data() as any) }));
      emit();
    }, () => {});

    fetchInquiries();

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [resolvedId, accountLoading]);

  return {
    inquiries,
    loading: accountLoading || loading,
    error,
    refresh: fetchInquiries,
  };
}

export const useCoachInquiries = useInquiries;

