import { INQUIRY_HONEYPOT_FIELD } from '../../lib/inquiryAbuseProtection';

type InquiryHoneypotFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Hidden honeypot — off-screen, not display:none. Bots may fill; humans never see it.
 */
export default function InquiryHoneypotField({ value, onChange }: InquiryHoneypotFieldProps) {
  return (
    <div className="xpx-inquiry-honeypot" aria-hidden="true">
      <label htmlFor="xpx-inquiry-honeypot">Company website</label>
      <input
        id="xpx-inquiry-honeypot"
        type="text"
        name={INQUIRY_HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
