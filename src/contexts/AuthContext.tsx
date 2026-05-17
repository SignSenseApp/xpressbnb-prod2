import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

  const loadHostProfile = async (userId: string) => {
    try {
      // `data` is reassigned below when a host row is auto-provisioned, so
      // keep it as `let`. `error` is read once and never reassigned.
      const { data: initialData, error } = await supabase
        .from('hosts')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      let data = initialData;

      if (!data) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const userMetadata = userData.user.user_metadata;
          const { data: newHostData, error: insertError } = await supabase
            .from('hosts')
            .insert({
              user_id: userId,
              name: userMetadata.name || userData.user.email?.split('@')[0] || 'Host',
              email: userData.user.email || '',
              phone: userMetadata.phone || '',
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating host profile:', insertError);
          } else {
            data = newHostData;
          }
        }
      }

      setHost(data);
    } catch (error) {
      console.error('Error loading host profile:', error);
      setHost(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, phone: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
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

      if (data.user) {
        await supabase.from('hosts').insert({
          user_id: data.user.id,
          name,
          email,
          phone,
        });
      }

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
