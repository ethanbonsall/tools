import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Appearance,
  DEFAULT_APPEARANCE,
  appearanceFromRow,
  appearanceToRow,
  applyAppearance,
  loadAppearance,
  saveAppearance,
} from "@/lib/appearance";
import { supabase } from "@/lib/supabaseClient";

type AppearanceContextValue = {
  appearance: Appearance;
  setAppearance: (next: Partial<Appearance>) => void;
  resetAppearance: () => void;
};

const AppearanceContext = createContext<AppearanceContextValue>({
  appearance: { ...DEFAULT_APPEARANCE },
  setAppearance: () => {},
  resetAppearance: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>({
    ...DEFAULT_APPEARANCE,
  });
  const userIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistRemote = useCallback(async (next: Appearance) => {
    const uid = userIdRef.current;
    if (!uid) return;
    await supabase
      .from("users")
      .update(appearanceToRow(next))
      .eq("user_id", uid);
  }, []);

  const applyLocal = useCallback((next: Appearance) => {
    saveAppearance(next);
    applyAppearance(next);
    setAppearanceState(next);
  }, []);

  const queueRemoteSave = useCallback(
    (next: Appearance) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void persistRemote(next);
      }, 400);
    },
    [persistRemote]
  );

  useEffect(() => {
    const loaded = loadAppearance();
    setAppearanceState(loaded);
    applyAppearance(loaded);

    async function hydrateFromUser(userId: string) {
      userIdRef.current = userId;
      const { data } = await supabase
        .from("users")
        .select("color,text,accent,mobile,desktop")
        .eq("user_id", userId)
        .maybeSingle();
      if (!data) return;
      const hasAny =
        data.color ||
        data.text ||
        data.accent ||
        data.mobile != null ||
        data.desktop != null;
      if (!hasAny) {
        // Seed defaults onto the row once
        await supabase
          .from("users")
          .update(appearanceToRow(loaded))
          .eq("user_id", userId);
        return;
      }
      const fromDb = appearanceFromRow(data);
      applyLocal(fromDb);
    }

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) await hydrateFromUser(session.user.id);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user?.id) {
        userIdRef.current = null;
        return;
      }
      void hydrateFromUser(session.user.id);
    });

    return () => {
      subscription.unsubscribe();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [applyLocal]);

  const setAppearance = useCallback(
    (next: Partial<Appearance>) => {
      setAppearanceState((prev) => {
        const merged = { ...prev, ...next };
        saveAppearance(merged);
        applyAppearance(merged);
        queueRemoteSave(merged);
        return merged;
      });
    },
    [queueRemoteSave]
  );

  const resetAppearance = useCallback(() => {
    const defaults = { ...DEFAULT_APPEARANCE };
    applyLocal(defaults);
    queueRemoteSave(defaults);
  }, [applyLocal, queueRemoteSave]);

  const value = useMemo(
    () => ({ appearance, setAppearance, resetAppearance }),
    [appearance, setAppearance, resetAppearance]
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  return useContext(AppearanceContext);
}
