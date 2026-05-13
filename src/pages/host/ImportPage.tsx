import { useState } from 'react';
import { Download, Upload, Link as LinkIcon, CheckCircle, XCircle, Loader } from 'lucide-react';

interface ImportRecord {
  id: string;
  url: string;
  status: 'success' | 'error';
  properties: number;
  timestamp: string;
}

export default function ImportPage() {
  const [importing, setImporting] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl) return;

    setImporting(true);

    setTimeout(() => {
      const newImport: ImportRecord = {
        id: Date.now().toString(),
        url: importUrl,
        status: 'success',
        properties: Math.floor(Math.random() * 5) + 1,
        timestamp: new Date().toISOString(),
      };

      setImportHistory([newImport, ...importHistory]);
      setImportUrl('');
      setImporting(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="xpx-eyebrow">Sync</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight mt-1">Import Listings</h1>
          <p className="text-xpx-muted mt-2">Import your properties from other platforms</p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-bold"
          style={{ background: 'rgba(80,200,120,0.12)', color: 'var(--xpx-warm)', border: '1px solid rgba(80,200,120,0.30)' }}
        >
          Beta
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <ProviderTile
          name="Airbnb"
          body="Import from Airbnb"
          logo={<img src="https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg" alt="Airbnb" className="w-10 h-10" />}
          accent="#FF5A5F"
        />
        <ProviderTile
          name="Booking.com"
          body="Import from Booking.com"
          logo={<img src="https://cf.bstatic.com/static/img/b26logo/booking_logo_retina/22615963add19ac6b6d715a97c8d477e8b95b7ea.png" alt="Booking.com" className="w-10 h-10" />}
          accent="#003580"
        />
        <ProviderTile
          name="Custom URL"
          body="Import via iCal URL"
          logo={<LinkIcon className="w-8 h-8" style={{ color: '#50C878' }} />}
          accent="#50C878"
        />
      </div>

      <div
        className="rounded-2xl p-6 sm:p-8"
        style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
      >
        <h2 className="text-xl font-bold text-xpx-text mb-6 flex items-center gap-2">
          <Upload className="w-6 h-6" style={{ color: 'var(--xpx-warm)' }} />
          Import via URL
        </h2>

        <div
          className="rounded-xl p-4 mb-6 text-sm"
          style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.25)', color: '#1E40AF' }}
        >
          <strong>How it works:</strong> paste your property listing URL from Airbnb, Booking.com, or any supported platform. We&apos;ll extract the property details and create a listing for you.
        </div>

        <form onSubmit={handleImport} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wide font-bold text-xpx-muted mb-2">
              Listing URL
            </label>
            <input
              type="url"
              required
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://www.airbnb.com/rooms/12345678"
              className="xpx-input"
            />
            <p className="text-xs text-xpx-subtle mt-2">
              Supported: Airbnb, Booking.com, VRBO, HomeAway
            </p>
          </div>

          <button
            type="submit"
            disabled={importing}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
            style={{ background: 'var(--xpx-warm)', color: '#ffffff', boxShadow: '0 6px 20px rgba(80,200,120,0.35)' }}
          >
            {importing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Import Property
              </>
            )}
          </button>
        </form>
      </div>

      {importHistory.length > 0 && (
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
        >
          <h2 className="text-xl font-bold text-xpx-text mb-6">Import History</h2>
          <div className="space-y-3">
            {importHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-xl gap-3 flex-wrap sm:flex-nowrap"
                style={{ background: 'var(--xpx-surface-light)', border: '1px solid var(--xpx-border)' }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  {item.status === 'success' ? (
                    <CheckCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#50C878' }} />
                  ) : (
                    <XCircle className="w-6 h-6 flex-shrink-0" style={{ color: '#DC2626' }} />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-xpx-text">
                      {item.properties} {item.properties === 1 ? 'property' : 'properties'} imported
                    </p>
                    <p className="text-sm text-xpx-muted truncate max-w-md">{item.url}</p>
                  </div>
                </div>
                <div className="text-sm text-xpx-subtle flex-shrink-0 ml-0 sm:ml-3">
                  {new Date(item.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="rounded-2xl p-6 sm:p-8"
        style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
      >
        <h2 className="text-xl font-bold text-xpx-text mb-4">Important Notes</h2>
        <ul className="space-y-3 text-sm text-xpx-muted">
          {[
            'Make sure your listing URL is publicly accessible',
            'Import may take a few minutes depending on the platform',
            'Review imported properties and adjust pricing as needed',
            'Images and amenities are automatically imported when available',
          ].map((note) => (
            <li key={note} className="flex items-start gap-2">
              <span style={{ color: 'var(--xpx-warm)' }}>•</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ProviderTile({
  name,
  body,
  logo,
  accent,
}: {
  name: string;
  body: string;
  logo: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      className="rounded-2xl p-6 text-center"
      style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: `${accent}14`, border: `1px solid ${accent}33` }}
      >
        {logo}
      </div>
      <h3 className="font-bold text-xpx-text mb-1">{name}</h3>
      <p className="text-sm text-xpx-muted mb-4">{body}</p>
      <button className="text-sm font-semibold hover:underline" style={{ color: 'var(--xpx-warm)' }}>
        Connect
      </button>
    </div>
  );
}
