import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import AuthShell from './AuthShell';
import { theme } from '../../lib/theme';

interface ForgotPasswordPageProps {
  onNavigate: (page: 'login') => void;
}

export default function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await resetPassword(email);
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthShell
        eyebrow="Almost there"
        title="Check your email"
        subtitle={`We've sent a recovery link to ${email}. Click it to set a new password.`}
      >
        <div
          className="rounded-xl p-4 mb-6 flex items-start gap-3"
          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.4)' }}
        >
          <CheckCircle className="w-5 h-5 mt-0.5" style={{ color: '#3dae68' }} />
          <p className="text-sm text-emerald-700">Email sent. The link is valid for 1 hour.</p>
        </div>
        <button
          onClick={() => onNavigate('login')}
          className="w-full py-3.5 rounded-2xl font-bold transition-all"
          style={{ background: theme.accent, color: '#ffffff', boxShadow: '0 6px 24px rgba(80,200,120,0.35)' }}
        >
          Back to login
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Forgot password"
      title="Reset your password"
      subtitle="Enter the email tied to your hosting account and we&apos;ll send you a recovery link."
      footer={
        <button
          onClick={() => onNavigate('login')}
          className="font-bold text-xpx-text hover:opacity-80 transition-opacity"
        >
          ← Back to login
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.32)' }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#B91C1C' }} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-xpx-subtle" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="xpx-input pl-12"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group w-full py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: theme.accent, color: '#ffffff', boxShadow: '0 8px 32px rgba(80,200,120,0.35)' }}
        >
          <span className="flex items-center justify-center gap-2">
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Sending…
              </>
            ) : (
              <>
                Send Reset Link
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </span>
        </button>
      </form>
    </AuthShell>
  );
}
