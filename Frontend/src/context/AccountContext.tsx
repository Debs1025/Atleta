import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "../services/firebaseClient";
import {
  getStoredAuthToken,
  parseJwtPayload,
  requestAuthenticatedJson,
  type AuthRole,
} from "../screens/Mobile/Authentication/authShared";
import { CacheManager } from "../utils/cacheManager";

export interface AccountUser {
  uid: string;
  cleanUid: string;
  email: string;
  role: AuthRole;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  contact_number?: string;
  phoneNumber?: string;
  phone?: string;
  birthdate?: string;
  gender?: string;
  province?: string;
  location?: string;
  category?: string;
  sport_type?: string;
  sports_focus?: string;
  avatar_url?: string;
  current_institution?: string;
  regional_affiliation?: string;
  national_sports_league?: string;
  coaching_philosophy?: string;
  coachingPhilosophy?: string;
  quote?: string;
  years_of_experience?: number;
  height_cm?: number | null;
  weight_kg?: number | null;
  wingspan_cm?: number | null;
  vertical_cm?: number | null;
  vertical_jump_cm?: number | null;
  vertical_leap_in?: number | null;
  eligible_documents?: any[];
  documents?: any[];
  credentials?: any[];
  uploaded_documents?: any[];
  professional_documents?: any[];
  account_status?: string;
  status?: string;
  is_approved?: boolean;
  isApproved?: boolean;
  [key: string]: any;
}

export interface AccountContextType {
  currentUser: {
    uid: string;
    cleanUid: string;
    coachId?: string;
    coach_id?: string;
    rawUid?: string;
    email: string;
    role: AuthRole;
  } | null;
  account: AccountUser | null;
  loading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refreshAccount: (showLoading?: boolean) => Promise<AccountUser | null>;
  updateAccount: (updates: Partial<AccountUser>) => Promise<AccountUser>;
  setAccount: React.Dispatch<React.SetStateAction<AccountUser | null>>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const CACHED_ACCOUNT_STORAGE_KEY = "atleta_cached_user_account";

// Helper to remove undefined fields for Firestore setDoc
function sanitizeForFirestore(val: any): any {
  if (val === undefined || val === null) return null;
  if (Array.isArray(val)) {
    return val.map(sanitizeForFirestore).filter((v) => v !== undefined);
  }
  if (typeof val === "object" && !(val instanceof Date)) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        const cleaned = sanitizeForFirestore(v);
        if (cleaned !== undefined) {
          res[k] = cleaned;
        }
      }
    }
    return res;
  }
  return val;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    cleanUid: string;
    coachId?: string;
    coach_id?: string;
    rawUid?: string;
    email: string;
    role: AuthRole;
  } | null>(null);

  const [account, setAccount] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const unsubUsersRef = useRef<Unsubscribe | null>(null);
  const unsubProfileRef = useRef<Unsubscribe | null>(null);

  // 1. Initial hydration from user-scoped CacheManager for sub-10ms UI display without cross-user leakage
  useEffect(() => {
    (async () => {
      try {
        const token = await getStoredAuthToken();
        if (!token) {
          setLoading(false);
          return;
        }
        const payload = parseJwtPayload(token);
        const rawUid = String(payload?.uid || payload?.user_id || payload?.sub || "").trim();
        const cleanUid = rawUid.replace(/^(ath_|coach_|off_)/, "");
        if (!cleanUid) {
          setLoading(false);
          return;
        }

        const cached = await CacheManager.get<AccountUser>("account", { userId: cleanUid, ignoreExpiry: true });
        if (cached && (cached.cleanUid === cleanUid || cached.uid)) {
          setAccount(cached);
          setLoading(false);
        }
      } catch (_) {
        setLoading(false);
      }
    })();
  }, []);

  // 2. Real-time Firestore Listeners Setup
  const setupFirestoreListeners = useCallback((cleanUid: string, canonicalId: string, role: string) => {
    if (unsubUsersRef.current) unsubUsersRef.current();
    if (unsubProfileRef.current) unsubProfileRef.current();

    if (!cleanUid) return;

    try {
      // Listen to canonical Users document
      unsubUsersRef.current = onSnapshot(
        doc(db, "Users", cleanUid),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setAccount((prev) => {
              if (!prev) return null;
              const updated: AccountUser = {
                ...prev,
                ...data,
                first_name: data.first_name || prev.first_name,
                last_name: data.last_name || prev.last_name,
                full_name: data.full_name || prev.full_name || `${data.first_name || prev.first_name || ""} ${data.last_name || prev.last_name || ""}`.trim(),
                contact_number: data.contact_number || data.phoneNumber || prev.contact_number,
                avatar_url: data.avatar_url || data.profile_image || prev.avatar_url,
              };
              CacheManager.set("account", updated, { userId: cleanUid, ttlMs: 15 * 60 * 1000 }).catch(() => null);
              AsyncStorage.setItem(CACHED_ACCOUNT_STORAGE_KEY, JSON.stringify(updated)).catch(() => null);
              return updated;
            });
          }
        },
        (err) => console.warn("Users onSnapshot notice:", err)
      );

      // Listen to Subtype Profile document
      const profileCollection = role === "coach" ? "Coach_Profiles" : "Athlete_Profiles";
      unsubProfileRef.current = onSnapshot(
        doc(db, profileCollection, canonicalId),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setAccount((prev) => {
              if (!prev) return null;
              const updated: AccountUser = {
                ...prev,
                ...data,
                category: data.category || data.sport_type || data.sports_focus || prev.category,
                avatar_url: data.avatar_url || prev.avatar_url,
                eligible_documents: data.eligible_documents || data.documents || prev.eligible_documents,
              };
              CacheManager.set("account", updated, { userId: cleanUid, ttlMs: 15 * 60 * 1000 }).catch(() => null);
              AsyncStorage.setItem(CACHED_ACCOUNT_STORAGE_KEY, JSON.stringify(updated)).catch(() => null);
              return updated;
            });
          }
        },
        (err) => console.warn("Profile onSnapshot notice:", err)
      );
    } catch (e) {
      console.warn("setupFirestoreListeners notice:", e);
    }
  }, []);

  // 3. Core Account Fetch Logic
  const refreshAccount = useCallback(
    async (showLoading = false): Promise<AccountUser | null> => {
      if (showLoading) setLoading(true);
      setIsRefreshing(true);
      setError(null);

      try {
        const token = await getStoredAuthToken();
        if (!token) {
          setCurrentUser(null);
          setAccount(null);
          setLoading(false);
          setIsRefreshing(false);
          return null;
        }

        const payload = parseJwtPayload(token);
        if (!payload) {
          setLoading(false);
          setIsRefreshing(false);
          return null;
        }

        const rawUid = String(payload.uid || payload.user_id || payload.sub || "").trim();
        const role = String(payload.role || "").toLowerCase() === "coach" ? "coach" : "athlete";
        const cleanUid = rawUid.replace(/^(ath_|coach_|off_)/, "");
        const canonicalId = role === "coach" ? `coach_${cleanUid}` : `ath_${cleanUid}`;
        const email = String(payload.email || "").trim();

        const authUser = {
          uid: canonicalId,
          cleanUid,
          coachId: canonicalId,
          coach_id: canonicalId,
          rawUid,
          email,
          role: role as AuthRole,
        };
        setCurrentUser(authUser);

        // Fetch canonical User document directly from Firestore
        const [userDoc1, userDoc2] = await Promise.all([
          getDoc(doc(db, "Users", cleanUid)).catch(() => null),
          getDoc(doc(db, "Users", canonicalId)).catch(() => null),
        ]);

        const userData = (userDoc1 && userDoc1.exists())
          ? userDoc1.data()
          : (userDoc2 && userDoc2.exists())
          ? userDoc2.data()
          : {};

        // Fetch Subtype Profile document directly from Firestore
        let profileData: Record<string, any> = {};
        if (role === "athlete") {
          const [pDoc1, pDoc2] = await Promise.all([
            getDoc(doc(db, "Athlete_Profiles", canonicalId)).catch(() => null),
            getDoc(doc(db, "Athlete_Profiles", cleanUid)).catch(() => null),
          ]);
          profileData = (pDoc1 && pDoc1.exists())
            ? pDoc1.data()
            : (pDoc2 && pDoc2.exists())
            ? pDoc2.data()
            : {};
        } else if (role === "coach") {
          const [cDoc1, cDoc2] = await Promise.all([
            getDoc(doc(db, "Coach_Profiles", canonicalId)).catch(() => null),
            getDoc(doc(db, "Coach_Profiles", cleanUid)).catch(() => null),
          ]);
          profileData = (cDoc1 && cDoc1.exists())
            ? cDoc1.data()
            : (cDoc2 && cDoc2.exists())
            ? cDoc2.data()
            : {};
        }

        // Fetch REST API data
        let apiData: any = null;
        try {
          if (role === "athlete") {
            apiData = await requestAuthenticatedJson("/athletes/profile").catch(() => null);
            if (!apiData) {
              apiData = await requestAuthenticatedJson("/athletes/home").catch(() => null);
            }
          } else if (role === "coach") {
            apiData = await requestAuthenticatedJson("/coaches/profile").catch(() => null);
            if (!apiData) {
              apiData = await requestAuthenticatedJson("/coaches/me").catch(() => null);
            }
          }
        } catch (_) {}

        const firstName = userData.first_name || profileData.first_name || apiData?.first_name || "";
        const lastName = userData.last_name || profileData.last_name || apiData?.last_name || "";
        const fullName = userData.full_name || profileData.full_name || apiData?.full_name || `${firstName} ${lastName}`.trim() || "";
        const contactNumber = userData.contact_number || userData.phoneNumber || profileData.contact_number || profileData.phoneNumber || apiData?.contact_number || "";
        const birthdate = userData.birthdate || profileData.birthdate || apiData?.birthdate || "";
        const gender = userData.gender || profileData.gender || apiData?.gender || "";
        const province = userData.province || profileData.province || profileData.location || apiData?.province || "Camarines Sur";
        const avatarUrl = profileData.avatar_url || userData.avatar_url || userData.profile_image || apiData?.avatar_url || "";
        const sportCategory = profileData.category || profileData.sport_type || profileData.sports_focus || userData.sport_type || apiData?.sport_type || apiData?.category || "BASKETBALL";

        const merged: AccountUser = {
          uid: canonicalId,
          cleanUid,
          coach_id: role === "coach" ? canonicalId : undefined,
          coachId: role === "coach" ? canonicalId : undefined,
          athlete_id: role === "athlete" ? canonicalId : undefined,
          athleteId: role === "athlete" ? canonicalId : undefined,
          user_id: cleanUid,
          email: email || userData.email || profileData.email || "",
          role: role as AuthRole,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          contact_number: contactNumber,
          phoneNumber: contactNumber,
          phone: contactNumber,
          birthdate,
          gender,
          province,
          location: province,
          avatar_url: avatarUrl,
          category: sportCategory,
          sport_type: sportCategory,
          sports_focus: sportCategory,
          height_cm: profileData.height_cm ?? userData.height_cm ?? apiData?.height_cm ?? null,
          weight_kg: profileData.weight_kg ?? userData.weight_kg ?? apiData?.weight_kg ?? null,
          wingspan_cm: profileData.wingspan_cm ?? userData.wingspan_cm ?? apiData?.wingspan_cm ?? null,
          eligible_documents: profileData.eligible_documents || profileData.documents || userData.eligible_documents || [],
          documents: profileData.eligible_documents || profileData.documents || userData.eligible_documents || [],
          credentials: profileData.credentials || userData.credentials || [],
          uploaded_documents: profileData.uploaded_documents || profileData.professional_documents || [],
          current_institution: profileData.current_institution || userData.current_institution || "",
          regional_affiliation: profileData.regional_affiliation || userData.regional_affiliation || "",
          national_sports_league: profileData.national_sports_league || userData.national_sports_league || "",
          coaching_philosophy: profileData.coaching_philosophy || userData.coaching_philosophy || "",
          coachingPhilosophy: profileData.coachingPhilosophy || userData.coachingPhilosophy || "",
          account_status: userData.account_status || userData.status || profileData.account_status || "Active",
          is_approved: userData.is_approved ?? userData.isApproved ?? true,
          ...apiData,
          ...userData,
          ...profileData,
        };

        setAccount(merged);
        await CacheManager.set("account", merged, { userId: cleanUid, ttlMs: 15 * 60 * 1000 });
        await AsyncStorage.setItem(CACHED_ACCOUNT_STORAGE_KEY, JSON.stringify(merged)).catch(() => null);

        // Also update legacy caches so dependent screens have instant hydration
        if (role === "athlete") {
          await AsyncStorage.setItem("atleta_offline_athlete_profile_cache", JSON.stringify(merged)).catch(() => null);
        } else if (role === "coach") {
          await AsyncStorage.setItem("atleta_offline_coach_profile_cache", JSON.stringify(merged)).catch(() => null);
        }

        // Setup real-time listener
        setupFirestoreListeners(cleanUid, canonicalId, role);

        return merged;
      } catch (err: any) {
        console.warn("AccountContext refreshAccount error:", err);
        setError(err?.message || "Failed to fetch account data.");
        return null;
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [setupFirestoreListeners]
  );

  // 4. Update Profile Mutation with Instant State Re-render
  const updateAccount = useCallback(
    async (updates: Partial<AccountUser>): Promise<AccountUser> => {
      let nextAccount: AccountUser | null = null;
      setAccount((prev) => {
        const merged = {
          ...(prev || {}),
          ...updates,
          full_name:
            updates.full_name ||
            (updates.first_name || updates.last_name
              ? `${updates.first_name || prev?.first_name || ""} ${updates.last_name || prev?.last_name || ""}`.trim()
              : prev?.full_name),
        } as AccountUser;
        nextAccount = merged;
        AsyncStorage.setItem(CACHED_ACCOUNT_STORAGE_KEY, JSON.stringify(merged)).catch(() => null);
        return merged;
      });

      const token = await getStoredAuthToken();
      const payload = token ? parseJwtPayload(token) : null;
      const rawUid = String(payload?.uid || payload?.user_id || account?.uid || "").trim();
      const cleanUid = rawUid.replace(/^(ath_|coach_|off_)/, "");
      const role = (account?.role || payload?.role || "athlete").toLowerCase();
      const canonicalId = role === "coach" ? `coach_${cleanUid}` : `ath_${cleanUid}`;

      if (cleanUid) {
        if (nextAccount) {
          CacheManager.set("account", nextAccount, { userId: cleanUid, ttlMs: 15 * 60 * 1000 }).catch(() => null);
        }
        // Direct Firestore writes to canonical Users collection
        const userPayload = sanitizeForFirestore({
          first_name: updates.first_name,
          last_name: updates.last_name,
          full_name:
            updates.full_name ||
            (updates.first_name || updates.last_name
              ? `${updates.first_name || ""} ${updates.last_name || ""}`.trim()
              : undefined),
          contact_number: updates.contact_number || updates.phoneNumber,
          phoneNumber: updates.contact_number || updates.phoneNumber,
          birthdate: updates.birthdate,
          gender: updates.gender,
          province: updates.province,
          avatar_url: updates.avatar_url,
          profile_image: updates.avatar_url,
          sport_type: updates.sport_type || updates.category || updates.sports_focus,
          updated_at: new Date().toISOString(),
        });

        // Direct Firestore writes to Subtype Profile collection
        const profileCollection = role === "coach" ? "Coach_Profiles" : "Athlete_Profiles";
        const profilePayload = sanitizeForFirestore({
          ...updates,
          updated_at: new Date().toISOString(),
        });

        try {
          await Promise.all([
            setDoc(doc(db, "Users", cleanUid), userPayload, { merge: true }),
            setDoc(doc(db, profileCollection, canonicalId), profilePayload, { merge: true }),
            setDoc(doc(db, profileCollection, cleanUid), profilePayload, { merge: true }),
          ]);
        } catch (fsErr) {
          console.warn("Firestore updateAccount notice:", fsErr);
        }

        // Background sync with REST API
        try {
          if (role === "athlete") {
            await requestAuthenticatedJson("/athletes/profile", "PATCH", updates).catch(() => null);
          } else if (role === "coach") {
            await requestAuthenticatedJson("/coaches/profile", "PATCH", updates).catch(() => null);
          }
        } catch (apiErr) {
          console.warn("REST API updateAccount notice:", apiErr);
        }

        // Update legacy AsyncStorage keys for cross-component parity
        if (role === "athlete") {
          await AsyncStorage.setItem("atleta_offline_athlete_profile_cache", JSON.stringify(nextAccount)).catch(() => null);
        } else if (role === "coach") {
          await AsyncStorage.setItem("atleta_offline_coach_profile_cache", JSON.stringify(nextAccount)).catch(() => null);
        }
      }

      return nextAccount!;
    },
    [account]
  );

  useEffect(() => {
    refreshAccount(true);

    return () => {
      if (unsubUsersRef.current) unsubUsersRef.current();
      if (unsubProfileRef.current) unsubProfileRef.current();
    };
  }, [refreshAccount]);

  const value = useMemo(
    () => ({
      currentUser,
      account,
      loading,
      isRefreshing,
      error,
      refreshAccount,
      updateAccount,
      setAccount,
    }),
    [currentUser, account, loading, isRefreshing, error, refreshAccount, updateAccount]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
}

export const useUser = useAccount;
export const useUserAccount = useAccount;
