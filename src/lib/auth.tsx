"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createClient, supabaseConfigured } from "./supabase/client";
import type { Database, Profile } from "./supabase/types";

interface AuthState {
  /** null when signed out, undefined while still resolving. */
  user: User | null | undefined;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  supabase: SupabaseClient<Database> | null;
  signInWith: (provider: OAuthProvider, next?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/** The OAuth providers this app offers. */
export type OAuthProvider = "github";

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = supabaseConfigured();

  // One client per browser session. Creating it per render would drop
  // the realtime/auth subscriptions on every re-render.
  const supabase = useMemo(() => (configured ? createClient() : null), [configured]);

  const [user, setUser] = useState<User | null | undefined>(configured ? undefined : null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(configured);

  const loadProfile = useCallback(
    async (id: string) => {
      if (!supabase) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      setProfile(data ?? null);
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setLoading(false);
      if (data.user) void loadProfile(data.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) void loadProfile(newSession.user.id);
      else setProfile(null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const signInWith = useCallback(
    async (provider: OAuthProvider, next = "/dashboard") => {
      if (!supabase) return;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          scopes: "read:user user:email",
        },
      });
      // signInWithOAuth normally redirects; reaching here with an error means
      // the provider is disabled on the project, so surface it rather than
      // leaving the button looking broken.
      if (error) throw error;
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = "/";
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  const value: AuthState = {
    user, session, profile, loading, configured, supabase,
    signInWith, signOut, refreshProfile,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Convenience: the signed-in user's id, or null. */
export function useUserId() {
  return useAuth().user?.id ?? null;
}
