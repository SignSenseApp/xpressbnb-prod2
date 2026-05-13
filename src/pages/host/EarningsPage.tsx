import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, TrendingUp, Calendar, Download, IndianRupee } from 'lucide-react';
import type { Booking } from '../../lib/database.types';

export default function EarningsPage() {
  const { host } = useAuth();
  const [earnings, setEarnings] = useState({
    total: 0,
    thisMonth: 0,
    lastMonth: 0,
    pending: 0,
  });
  const [transactions, setTransactions] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (host?.id) {
      loadEarnings();
    }
  }, [host?.id]);

  const loadEarnings = async () => {
    if (!host?.id) return;

    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('host_id', host.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const total = bookings
        ?.filter((b) => b.payment_status === 'paid')
        .reduce((sum, b) => sum + Number(b.amount_total || 0), 0) || 0;

      const thisMonth = bookings
        ?.filter((b) =>
          b.payment_status === 'paid' &&
          new Date(b.created_at) >= thisMonthStart
        )
        .reduce((sum, b) => sum + Number(b.amount_total || 0), 0) || 0;

      const lastMonth = bookings
        ?.filter((b) =>
          b.payment_status === 'paid' &&
          new Date(b.created_at) >= lastMonthStart &&
          new Date(b.created_at) <= lastMonthEnd
        )
        .reduce((sum, b) => sum + Number(b.amount_total || 0), 0) || 0;

      const pending = bookings
        ?.filter((b) => b.status === 'confirmed' && b.payment_status === 'paid')
        .reduce((sum, b) => sum + Number(b.amount_total || 0), 0) || 0;

      setEarnings({ total, thisMonth, lastMonth, pending });
      setTransactions(bookings?.filter(b => b.payment_status === 'paid') || []);
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const percentChange = earnings.lastMonth > 0
    ? ((earnings.thisMonth - earnings.lastMonth) / earnings.lastMonth * 100).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--xpx-warm)' }} />
      </div>
    );
  }

  const trendUp = Number(percentChange) >= 0;
  const trendColor = trendUp ? '#3dae68' : '#B91C1C';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="xpx-eyebrow">Money</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-xpx-text tracking-tight mt-1">Earnings</h1>
          <p className="text-xpx-muted mt-2">Track your revenue and payouts</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-xpx-text"
          style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border-strong)' }}
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard label="Total Earnings" value={earnings.total} icon={DollarSign} accent="#50C878" />
        <StatCard
          label="This Month"
          value={earnings.thisMonth}
          icon={Calendar}
          accent="#2563EB"
          footer={
            <span className="inline-flex items-center gap-1 text-xs font-semibold mt-2" style={{ color: trendColor }}>
              <TrendingUp className={`w-4 h-4 ${trendUp ? '' : 'rotate-180'}`} />
              {percentChange}% from last month
            </span>
          }
        />
        <StatCard label="Last Month" value={earnings.lastMonth} icon={Calendar} accent="#EC4899" />
        <StatCard label="Pending Payout" value={earnings.pending} icon={TrendingUp} accent="#50C878" />
      </div>

      <div
        className="rounded-2xl p-6"
        style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
      >
        <h2 className="text-xl font-bold text-xpx-text mb-4">Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="text-xpx-muted text-center py-8">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--xpx-border)' }}>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider font-bold text-xpx-subtle">Date</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider font-bold text-xpx-subtle">Guest</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider font-bold text-xpx-subtle">Payment ID</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider font-bold text-xpx-subtle">Status</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider font-bold text-xpx-subtle">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    style={{ borderBottom: '1px solid var(--xpx-border)' }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-xpx-muted">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-xpx-text">{transaction.guest_name}</td>
                    <td className="py-3 px-4 text-sm text-xpx-muted font-mono">
                      {transaction.razorpay_payment_id?.slice(0, 20) || 'N/A'}…
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="px-2 py-1 text-[10px] uppercase tracking-wider rounded-full font-bold"
                        style={{ background: 'rgba(80,200,120,0.10)', color: '#3dae68' }}
                      >
                        {transaction.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-xpx-text text-right">
                      <span className="inline-flex items-center justify-end">
                        <IndianRupee className="w-4 h-4" />
                        {transaction.amount_total?.toLocaleString() || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  footer,
}: {
  label: string;
  value: number;
  icon: typeof DollarSign;
  accent: string;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-5 sm:p-6"
      style={{ background: 'var(--xpx-surface)', border: '1px solid var(--xpx-border)', boxShadow: '0 12px 40px rgba(15,23,42,0.06)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider font-bold text-xpx-subtle">{label}</span>
        <div
          className="p-2 rounded-lg"
          style={{ background: `${accent}14`, border: `1px solid ${accent}33` }}
        >
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold text-xpx-text inline-flex items-center">
        <IndianRupee className="w-6 h-6 sm:w-7 sm:h-7" />
        {value.toLocaleString()}
      </p>
      {footer}
    </div>
  );
}
