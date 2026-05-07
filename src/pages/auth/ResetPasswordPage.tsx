import { useEffect, useState } from 'react';
import { Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AuthShell from './AuthShell';
import { theme } from '../../lib/theme';

interface ResetPasswordPageProps {
  onNavigate: (page: 'login') => void;
}

/**
 * ResetPasswordPage — completes the password recovery flow.
 *
 * Supabase fires `PASSWORD_RECOVERY` via onAuthStateChange when the user opens
 * the recovery link. We listen for it before allowing the form to submit.
 * If the page was opened directly (no recovery session), we surface a helpful
 * error and route the user back to the forgot-password screen.
 */
export default function ResetPasswordPage({ onNavigate }: ResetPasswordPageProps) {
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) setRecoveryReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setRecoveryReady(true);
        setLinkError(null);
      }
    });

    const t = setTimeout(() => {
      if (cancelled) return;
      const hasRecoveryHash =
        typeof window !== 'undefined' &&
        (window.location.hash.includes('type=recovery') ||
          window.location.hash.includes('access_token'));
      if (!recoveryReady && !hasRecoveryHash) {
        setLinkError('This reset link is invalid or has expired. Request a new one.');
      }
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(t);
      subscription.subscription.unsubscribe();
    };
  }, [recoveryReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <AuthShell
        eyebrow="All set"
        title="Password updated"
        subtitle="You can now sign in with your new password."
      >
        <div
          className="rounded-xl p-4 mb-6 flex items-start gap-3"
          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.4)' }}
        >
          <CheckCircle className="w-5 h-5 mt-0.5" style={{ color: '#3dae68' }} />
          <p className="text-sm text-emerald-700">Your password has been updated.</p>
        </div>
        <button
          onClick={() => onNavigate('login')}
          className="w-full py-3.5 rounded-2xl font-bold transition-all"
          style={{ background: theme.accent, color: '#ffffff', boxShadow: '0 6px 24px rgba(80,200,120,0.35)' }}
        >
          Continue to login
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Recovery"
      title="Set a new password"
      subtitle="Choose a strong password you don't use elsewhere."
      footer={
        <button
          onClick={() => onNavigate('login')}
          className="font-bold text-xpx-text hover:opacity-80 transition-opacity"
        >
          ← Back to login
        </button>
      }
    >
      {linkError ? (
        <div className="space-y-4">
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.32)' }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#B91C1C' }} />
            <p className="text-sm text-red-700">{linkError}</p>
          </div>
          <button
            onClick={() => onNavigate('login')}
            className="w-full py-3.5 rounded-2xl font-bold transition-all"
            style={{ background: theme.accent, color: '#ffffff', boxShadow: '0 6px 24px rgba(80,200,120,0.35)' }}
          >
            Back to login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {submitError && (
            <div
              className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.32)' }}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#B91C1C' }} />
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          <div>
            <label htmlFor="new-password" className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
              New password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-xpx-subtle" />
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="xpx-input pl-12 pr-12"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-xpx-subtle hover:text-xpx-text transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-xpx-subtle" />
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="xpx-input pl-12"
                placeholder="Re-enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !recoveryReady}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: theme.accent, color: '#ffffff', boxShadow: '0 8px 32px rgba(80,200,120,0.35)' }}
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>

          {!recoveryReady && (
            <p className="text-xs text-center text-xpx-subtle">Verifying recovery link…</p>
          )}
        </form>
      )}
    </AuthShell>
  );
}
