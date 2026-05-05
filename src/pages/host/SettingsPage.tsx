import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, Phone, Lock, Save, CheckCircle, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const { host } = useAuth();
  const [formData, setFormData] = useState({
    name: host?.name || '',
    email: host?.email || '',
    phone: host?.phone || '',
    bio: host?.bio || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host?.id) return;
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.from('hosts').update(formData).eq('id', host.id);
      if (error) throw error;
      setMessage({ kind: 'ok', text: 'Settings updated successfully.' });
    } catch (error) {
      console.error('Error updating settings:', error);
      setMessage({ kind: 'err', text: 'Failed to update settings.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="xpx-eyebrow">Account</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight mt-1">Settings</h1>
        <p className="text-xpx-muted mt-2">Manage your account details</p>
      </div>

      <div
        className="rounded-2xl p-6 sm:p-8"
        style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {message && (
            <div
              className="flex items-start gap-3 rounded-xl p-4"
              style={
                message.kind === 'ok'
                  ? { background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.30)' }
                  : { background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)' }
              }
            >
              {message.kind === 'ok' ? (
                <CheckCircle className="w-5 h-5 mt-0.5" style={{ color: '#16A34A' }} />
              ) : (
                <AlertCircle className="w-5 h-5 mt-0.5" style={{ color: '#DC2626' }} />
              )}
              <p className="text-sm" style={{ color: message.kind === 'ok' ? '#15803D' : '#B91C1C' }}>
                {message.text}
              </p>
            </div>
          )}

          <Field icon={User} label="Full Name">
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="xpx-input pl-12" />
          </Field>

          <Field icon={Mail} label="Email Address">
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="xpx-input pl-12" />
          </Field>

          <Field icon={Phone} label="Phone Number (private — never shown publicly)">
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="xpx-input pl-12" />
          </Field>

          <div>
            <label className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              className="xpx-input resize-none"
              placeholder="Tell guests about yourself…"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
            style={{ background: 'var(--xpx-warm)', color: '#ffffff', boxShadow: '0 6px 20px rgba(244,162,97,0.35)' }}
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div
        className="rounded-2xl p-6 sm:p-8"
        style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
      >
        <h2 className="text-xl font-bold text-xpx-text mb-2">Password & Security</h2>
        <p className="text-xpx-muted mb-4">Manage your password and security settings</p>
        <button
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-colors text-xpx-text"
          style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border-strong)' }}
        >
          <Lock className="w-5 h-5" />
          Change Password
        </button>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">{label}</label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-xpx-subtle" />
        {children}
      </div>
    </div>
  );
}
