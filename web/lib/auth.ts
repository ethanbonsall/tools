import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { User, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { clearAllAppCaches } from "@/lib/financeCache";

export function useRequireAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      setLoading(false);
    }

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        clearAllAppCaches();
        router.replace("/login");
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return { user, loading, userId: user?.id ?? null };
}

export function useOptionalAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(u);
      setLoading(false);
    }

    check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") clearAllAppCaches();
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, userId: user?.id ?? null };
}

/** Sign in with email or username + password. */
export async function signInWithIdentifier(
  identifier: string,
  password: string
): Promise<{ error: AuthError | Error | null }> {
  const cleaned = identifier.trim();
  if (!cleaned) {
    return { error: new Error("Enter your email or username.") };
  }

  let email = cleaned;
  if (!cleaned.includes("@")) {
    const { data, error } = await supabase.rpc("email_for_login", {
      identifier: cleaned,
    });
    if (error) return { error };
    if (!data || typeof data !== "string") {
      return { error: new Error("No account found for that username.") };
    }
    email = data;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { error: error ?? null };
}

export async function signOut() {
  clearAllAppCaches();
  await supabase.auth.signOut();
}
