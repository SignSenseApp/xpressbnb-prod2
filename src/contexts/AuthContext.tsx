import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, logSupabaseError } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface Host {
  id: string;
  // DB column allows NULL until a Supabase auth user is linked.
  user_id: string | null;
  name: string;
  email: string;
  phone: string;
  bio: string;
  // Stored as a free-form string in DB; UI narrows it where it matters.
  kyc_status: string;
  rating: number;
  total_bookings: number;
  total_views: number;
  // Stored as a free-form string in DB; UI narrows it where it matters.
  subscription_status: string;
  subscription_provider_id: string | null;
  subscription_next_billing: string | null;
  payout_details: {
    bank: string;
    upi: string;
  };
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  host: Host | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** After OAuth, Supabase reads tokens from the URL hash then leaves `#` behind. */
function clearAuthHashFromUrl() {
  if (typeof window === 'undefined') return;
  const { pathname, search, hash } = window.location;
  if (!hash || hash === '#') return;
  if (
    hash.includes('access_token') ||
    hash.includes('refresh_token') ||
    hash.includes('error=')
  ) {
    window.history.replaceState({}, '', pathname + search);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadHostProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        clearAuthHashFromUrl();
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadHostProfile(session.user.id);
      } else {
        setHost(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchHostRow = async (userId: string) => {
    // `limit(1).maybeSingle()` is duplicate-proof: even if legacy duplicate host
    // rows exist for this user, we deterministically take the earliest one
    // instead of throwing (the old `.maybeSingle()` errored on >1 row, which
    // left the host stuck on the public homepage).
    return supabase
      .from('hosts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
  };

  const loadHostProfile = async (userId: string) => {
    try {
      const existing = await fetchHostRow(userId);
      if (existing.error) throw existing.error;

      if (existing.data) {
        setHost(existing.data);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const authUser = userData.user;
      if (!authUser) {
        setHost(null);
        return;
      }

      const metadata = authUser.user_metadata ?? {};
      const email = (authUser.email ?? '').toLowerCase();
      const name = metadata.name || authUser.email?.split('@')[0] || 'Host';
      const phone = metadata.phone || '';

      // Prefer atomic RPC (no client-side insert race, works even if RLS is strict).
      const { data: ensured, error: rpcError } = await supabase.rpc('ensure_host_profile', {
        p_name: name,
        p_email: email,
        p_phone: phone,
      });

      if (!rpcError && ensured) {
        setHost(ensured as Host);
        return;
      }

      if (rpcError) {
        logSupabaseError('ensure_host_profile RPC failed, falling back to insert', rpcError);
      }

      const inserted = await supabase
        .from('hosts')
        .upsert(
          { user_id: userId, name, email, phone },
          { onConflict: 'user_id', ignoreDuplicates: false },
        )
        .select()
        .maybeSingle();

      if (inserted.error) {
        const retry = await fetchHostRow(userId);
        if (retry.error) throw retry.error;
        setHost(retry.data ?? null);
        return;
      }

      setHost(inserted.data ?? null);
    } catch (error) {
      logSupabaseError('Error loading host profile', error);
      setHost(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, phone: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
          },
          emailRedirectTo: undefined,
        },
      });

      if (error) throw error;

      // Do NOT insert the host row here. The auth state change triggers
      // loadHostProfile(), which creates the row idempotently. Inserting in both
      // places raced and produced duplicate host rows (e.g. mixed-case emails),
      // which then broke login.
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setHost(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        host,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
