import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Phone, ShieldCheck } from 'lucide-react';
import {
  BOOKING_OTP_CODE_LENGTH,
  normalizePhoneDigits,
  sanitizeBookingOtpInput,
  sendBookingInquiryOtp,
  verifyBookingInquiryOtp,
  type BookingOtpVerifyResult,
} from '../lib/bookingOtp';
import { trackXpressEvent, type AnalyticsScope } from '../lib/analytics';

export type GuestPhoneOtpStepProps = {
  phone: string;
  onPhoneChange: (phone: string) => void;
  onVerified: (result: BookingOtpVerifyResult) => void;
  verified: BookingOtpVerifyResult | null;
  onClearVerification: () => void;
  disabled?: boolean;
  analyticsScope?: AnalyticsScope;
};

type Phase = 'phone' | 'otp' | 'verified';

export default function GuestPhoneOtpStep({
  phone,
  onPhoneChange,
  onVerified,
  verified,
  onClearVerification,
  disabled = false,
  analyticsScope,
}: GuestPhoneOtpStepProps) {
  const [phase, setPhase] = useState<Phase>(verified ? 'verified' : 'phone');
  const [otp, setOtp] = useState('');
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const autoSubmitOtpRef = useRef<string | null>(null);
  const otpSentForDigitsRef = useRef<string | null>(null);
  const sendInFlightRef = useRef(false);

  useEffect(() => {
    if (phase === 'otp' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [phase]);

  useEffect(() => {
    if (verified) setPhase('verified');
  }, [verified]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  const digits = normalizePhoneDigits(phone);

  const handleSendOtp = useCallback(
    async (options?: { isResend?: boolean }) => {
      setError(null);
      if (digits.length !== 10) {
        setError('Enter a valid 10-digit mobile number');
        return;
      }
      if (
        !options?.isResend &&
        otpSentForDigitsRef.current === digits &&
        phase === 'otp'
      ) {
        return;
      }
      if (sendInFlightRef.current) return;

      sendInFlightRef.current = true;
      setLoading(true);
      trackXpressEvent('otp_send_requested', {
        ...analyticsScope,
        booking_step: 'verify',
      });
      const res = await sendBookingInquiryOtp(digits);
      sendInFlightRef.current = false;
      setLoading(false);
      if (!res.ok) {
        otpSentForDigitsRef.current = null;
        setError(res.error ?? 'Could not send OTP');
        trackXpressEvent('otp_verify_failed', {
          ...analyticsScope,
          booking_step: 'verify',
          error_category: 'otp_send',
        });
        return;
      }
      trackXpressEvent('otp_send_success', {
        ...analyticsScope,
        booking_step: 'verify',
      });
      otpSentForDigitsRef.current = digits;
      setMaskedPhone(res.maskedPhone ?? `+91 ••••• ••${digits.slice(8)}`);
      setPhase('otp');
      setOtp('');
      autoSubmitOtpRef.current = null;
      setResendCooldown(30);
      onClearVerification();
    },
    [analyticsScope, digits, onClearVerification, phase],
  );

  const handleVerifyOtp = useCallback(async () => {
    setError(null);
    setLoading(true);
    const res = await verifyBookingInquiryOtp(digits, otp);
    setLoading(false);
    if (!res.ok) {
      autoSubmitOtpRef.current = null;
      setError(res.error);
      trackXpressEvent('otp_verify_failed', {
        ...analyticsScope,
        booking_step: 'verify',
        error_category: 'otp_code',
      });
      return;
    }
    setPhase('verified');
    onVerified(res.result);
    trackXpressEvent('otp_verify_success', {
      ...analyticsScope,
      booking_step: 'verify',
    });
  }, [analyticsScope, digits, onVerified, otp]);

  useEffect(() => {
    if (phase !== 'otp' || otp.length !== BOOKING_OTP_CODE_LENGTH || loading || disabled) {
      return;
    }
    if (autoSubmitOtpRef.current === otp) return;
    autoSubmitOtpRef.current = otp;
    void handleVerifyOtp();
  }, [otp, phase, loading, disabled, handleVerifyOtp]);

  const handleChangeNumber = () => {
    autoSubmitOtpRef.current = null;
    otpSentForDigitsRef.current = null;
    setPhase('phone');
    setOtp('');
    setError(null);
    onClearVerification();
  };

  const handlePhoneInputChange = (value: string) => {
    onPhoneChange(value);
    autoSubmitOtpRef.current = null;
    otpSentForDigitsRef.current = null;
    if (phase === 'otp') {
      setPhase('phone');
      setOtp('');
    }
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
              className="mt-2 text-xs font-semibold text-emerald-700 underline hover:text-emerald-900 disabled:opacity-50 min-h-[44px]"
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
            onChange={(e) => handlePhoneInputChange(e.target.value)}
            disabled={disabled || phase === 'otp'}
            className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
            placeholder="98765 43210"
          />
        </div>
      </div>

      {phase === 'otp' && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600">
            {BOOKING_OTP_CODE_LENGTH}-digit code
          </label>
          <p className="mb-2 text-xs text-gray-500">
            Enter the 4-digit OTP sent by XpressBNB. Never share this code with anyone.
          </p>
          <p className="mb-1 text-xs text-gray-400">
            Sent to {maskedPhone ?? 'your phone'}.
          </p>
          <input
            ref={otpInputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={BOOKING_OTP_CODE_LENGTH}
            value={otp}
            onChange={(e) => {
              autoSubmitOtpRef.current = null;
              setOtp(sanitizeBookingOtpInput(e.target.value));
            }}
            disabled={disabled || loading}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center font-mono text-lg tracking-[0.35em] focus:border-transparent focus:ring-2 focus:ring-emerald-500"
            placeholder={'•'.repeat(BOOKING_OTP_CODE_LENGTH)}
          />
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {phase === 'phone' ? (
          <button
            type="button"
            onClick={() => void handleSendOtp()}
            disabled={disabled || loading || digits.length !== 10}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Sending…' : 'Send code →'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void handleVerifyOtp()}
              disabled={disabled || loading || otp.length !== BOOKING_OTP_CODE_LENGTH}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Verify code
            </button>
            <button
              type="button"
              onClick={() => void handleSendOtp({ isResend: true })}
              disabled={disabled || loading || resendCooldown > 0}
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 disabled:opacity-50 min-h-[44px]"
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
          className="w-full text-center text-xs font-medium text-gray-500 hover:text-gray-800 min-h-[44px]"
        >
          Use a different number
        </button>
      )}
    </div>
  );
}
