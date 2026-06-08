import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getOverview, getRevenueTrend, getServicePnl, getOutstanding, getInvoiceSummary } from '../services/api';

const D = {
  bg: '#07080F', surface: '#0B0E17', card: '#0F1420',
  border: '#1A2035', text: '#E8ECF8', muted: '#4A5470',
  emerald: '#00C896', emeraldDim: '#00C89615',
  gold: '#FFB020', goldDim: '#FFB02015',
  coral: '#FF5C7A', coralDim: '#FF5C7A15',
  azure: '#4D9FFF', azureDim: '#4D9FFF15',
};

const fmt = n => `CAD $${Number(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function KCard({ label, value, sub, color, dim }) {
  return (
    <div style={{
      background: D.card, border: `1px solid ${D.border}`,
      borderRadius: 12, padding: '18px 20px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at top left, ${dim}, transparent 65%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${color}88, transparent)` }} />
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: D.muted, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: D.text, letterSpacing: -0.5, marginBottom: 4, fontFamily: "'Syne', sans-serif" }}>{value}</div>
      <div style={{ fontSize: 11, color, fontWeight: 500 }}>{sub}</div>
    </div>
  );
}

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: D.text }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: CAD ${p.value?.toLocaleString()}</div>)}
    </div>
  );
};

export default function ClinicOverview({ clinicId, clinicName, color }) {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [services, setServices] = useState([]);
  const [outstanding, setOutstanding] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getInvoiceSummary(clinicId),
      getRevenueTrend(clinicId, 6),
      getServicePnl(clinicId),
      getOutstanding(clinicId),
    ]).then(([sm, tr, sv, out]) => {
      setSummary(sm.data);
      setTrend(tr.data);
      setServices(sv.data);
      setOutstanding(out.data);
    }).finally(() => setLoading(false));
  }, [clinicId]);

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: D.bg }}>
      <div style={{ color: D.muted }}>Loading...</div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: D.bg }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: D.text }}>
            {clinicName}
          </div>
        </div>
        <div style={{ fontSize: 11, color: D.muted }}>All time · Overview</div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <KCard label="Total Billed" value={fmt(summary?.total_billed)} sub={`${summary?.collection_rate}% collected`} color={color} dim={color + '15'} />
        <KCard label="Total Collected" value={fmt(summary?.total_collected)} sub="Cash in" color={D.gold} dim={D.goldDim} />
        <KCard label="Outstanding" value={fmt(summary?.total_outstanding)} sub="Patients owe" color={D.coral} dim={D.coralDim} />
        <KCard label="Total Invoices" value={summary?.total_invoices || 0} sub="All time" color={D.azure} dim={D.azureDim} />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 16 }}>
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14 }}>Revenue Trend</div>
              <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>Last 6 months</div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 10, fontWeight: 600 }}>
              <span style={{ color }}>● Billed</span>
              <span style={{ color: D.gold }}>● Collected</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: D.muted }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<TT />} />
              <Line type="monotone" dataKey="billed" stroke={color} strokeWidth={2.5} dot={false} name="Billed" />
              <Line type="monotone" dataKey="collected" stroke={D.gold} strokeWidth={2} dot={false} name="Collected" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Services P&L</div>
          {services.slice(0, 4).map((s, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: D.muted, maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.service_name}</span>
                <span style={{ fontWeight: 600, color }}>{fmt(s.total_billed)}</span>
              </div>
              <div style={{ height: 5, background: D.border, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${(s.total_billed / (services[0]?.total_billed || 1)) * 100}%`,
                  height: '100%', background: color, borderRadius: 3,
                }} />
              </div>
              <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>{s.total_sessions} sessions · avg {fmt(s.avg_per_session)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Outstanding */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14 }}>Outstanding Balances</div>
          <span style={{ fontSize: 11, color: D.coral, fontWeight: 600 }}>{outstanding.length} invoices · {fmt(outstanding.reduce((s, i) => s + i.balance, 0))}</span>
        </div>
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: D.surface }}>
                {['Patient', 'Invoice', 'Date', 'Total', 'Balance', 'Days'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outstanding.slice(0, 30).map((inv, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${D.border}` }}>
                  <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 500 }}>{inv.patient_name}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: D.muted }}>{inv.jane_invoice_num}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: D.muted }}>{inv.purchase_date}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color }}>{fmt(inv.total)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: D.coral, fontWeight: 700 }}>{fmt(inv.balance)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: inv.days_outstanding > 30 ? D.coral : D.muted }}>{inv.days_outstanding}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}