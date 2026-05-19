import { useEffect, useState } from 'react';
import { Loader2, Phone, ShieldCheck } from 'lucide-react';
import {
  normalizePhoneDigits,
  sendBookingInquiryOtp,
  verifyBookingInquiryOtp,
  type BookingOtpVerifyResult,
} from '../lib/bookingOtp';

export type GuestPhoneOtpStepProps = {
  phone: string;
  onPhoneChange: (phone: string) => void;
  onVerified: (result: BookingOtpVerifyResult) => void;
  verified: BookingOtpVerifyResult | null;
  onClearVerification: () => void;
  disabled?: boolean;
};

type Phase = 'phone' | 'otp' | 'verified';

export default function GuestPhoneOtpStep({
  phone,
  onPhoneChange,
  onVerified,
  verified,
  onClearVerification,
  disabled = false,
}: GuestPhoneOtpStepProps) {
  const [phase, setPhase] = useState<Phase>(verified ? 'verified' : 'phone');
  const [otp, setOtp] = useState('');
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (verified) setPhase('verified');
  }, [verified]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  const digits = normalizePhoneDigits(phone);

  const handleSendOtp = async () => {
    setError(null);
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    const res = await sendBookingInquiryOtp(digits);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not send OTP');
      return;
    }
    setMaskedPhone(res.maskedPhone ?? `+91 ••••• ••${digits.slice(8)}`);
    setPhase('otp');
    setOtp('');
    setResendCooldown(30);
    onClearVerification();
  };

  const handleVerifyOtp = async () => {
    setError(null);
    setLoading(true);
    const res = await verifyBookingInquiryOtp(digits, otp);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPhase('verified');
    onVerified(res.result);
  };

  const handleChangeNumber = () => {
    setPhase('phone');
    setOtp('');
    setError(null);
    onClearVerification();
  };

  if (phase === 'verified' && verified) {
    return (
      <div
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-emerald-900">Phone verified</p>
            <p className="mt-0.5 text-sm text-emerald-800">
              +91 {verified.phoneDigits.slice(0, 5)} {verified.phoneDigits.slice(5)}
            </p>
            <button
              type="button"
              onClick={handleChangeNumber}
              disabled={disabled}
              className="mt-2 text-xs font-semibold text-emerald-700 underline hover:text-emerald-900 disabled:opacity-50"
            >
              Change number
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
      aria-labelledby="guest-phone-otp-heading"
    >
      <div>
        <p
          id="guest-phone-otp-heading"
          className="flex items-center gap-2 text-sm font-bold text-gray-900"
        >
          <Phone className="h-4 w-4 text-emerald-600" />
          Verify your mobile
        </p>
        <p className="mt-1 text-xs text-gray-600">
          Hosts only see your inquiry after your number is verified by SMS.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
          Mobile number
        </label>
        <div className="flex gap-2">
          <span className="flex items-center rounded-xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-600">
            +91
          </span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={14}
            value={phone}
            onChange={(e) => {
              onPhoneChange(e.target.value);
              if (phase === 'otp') {
                setPhase('phone');
                setOtp('');
              }
              onClearVerification();
            }}
            disabled={disabled || phase === 'otp'}
            className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
            placeholder="98765 43210"
          />
        </div>
      </div>

      {phase === 'otp' && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
            6-digit code
          </label>
          <p className="mb-2 text-xs text-gray-500">
            Sent to {maskedPhone ?? 'your phone'}. Valid for 15 minutes.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={disabled || loading}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center font-mono text-lg tracking-[0.35em] focus:border-transparent focus:ring-2 focus:ring-emerald-500"
            placeholder="••••••"
          />
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {phase === 'phone' ? (
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={disabled || loading || digits.length !== 10}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send OTP
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={disabled || loading || otp.length !== 6}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Verify code
            </button>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={disabled || loading || resendCooldown > 0}
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend OTP'}
            </button>
          </>
        )}
      </div>

      {phase === 'otp' && (
        <button
          type="button"
          onClick={handleChangeNumber}
          className="w-full text-center text-xs font-medium text-gray-500 hover:text-gray-800"
        >
          Use a different number
        </button>
      )}
    </div>
  );
}
