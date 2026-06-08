import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getOverview, getRevenueTrend, getServicePnl, getOutstanding } from '../services/api';

const D = {
  bg: '#07080F', surface: '#0B0E17', card: '#0F1420',
  border: '#1A2035', text: '#E8ECF8', muted: '#4A5470',
  emerald: '#00C896', emeraldDim: '#00C89615',
  gold: '#FFB020', goldDim: '#FFB02015',
  coral: '#FF5C7A', coralDim: '#FF5C7A15',
  azure: '#4D9FFF', azureDim: '#4D9FFF15',
};

const TB_CLINIC = 'd3417879-4607-469a-a614-b1ec611af077';

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
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 1, background: `linear-gradient(90deg, ${color}88, transparent)`,
      }} />
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
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: CAD ${p.value?.toLocaleString()}</div>
      ))}
    </div>
  );
};

export default function Overview() {
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [services, setServices] = useState([]);
  const [outstanding, setOutstanding] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getOverview(TB_CLINIC),
      getRevenueTrend(TB_CLINIC, 6),
      getServicePnl(TB_CLINIC),
      getOutstanding(TB_CLINIC),
    ]).then(([ov, tr, sv, out]) => {
      setOverview(ov.data);
      setTrend(tr.data);
      setServices(sv.data);
      setOutstanding(out.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: D.bg }}>
      <div style={{ color: D.muted, fontSize: 13 }}>Loading...</div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: D.bg }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: D.text }}>
          Overview
        </div>
        <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>
          {overview?.period} · TouchBrain Counseling
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <KCard label="Total Billed" value={fmt(overview?.total_billed)} sub={`${overview?.collection_rate}% collected`} color={D.emerald} dim={D.emeraldDim} />
        <KCard label="Total Collected" value={fmt(overview?.total_collected)} sub="Cash in" color={D.gold} dim={D.goldDim} />
        <KCard label="Outstanding" value={fmt(overview?.total_outstanding)} sub="Patients owe" color={D.coral} dim={D.coralDim} />
        <KCard label="Total Sessions" value={overview?.total_sessions || 0} sub="This month" color={D.azure} dim={D.azureDim} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 16 }}>
        {/* Revenue trend */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14 }}>Revenue Trend</div>
              <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>Last 6 months</div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 10, fontWeight: 600 }}>
              <span style={{ color: D.emerald }}>● Billed</span>
              <span style={{ color: D.gold }}>● Collected</span>
              <span style={{ color: D.coral }}>● Expenses</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: D.muted }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<TT />} />
              <Line type="monotone" dataKey="billed" stroke={D.emerald} strokeWidth={2.5} dot={false} name="Billed" />
              <Line type="monotone" dataKey="collected" stroke={D.gold} strokeWidth={2} dot={false} name="Collected" />
              <Line type="monotone" dataKey="expenses" stroke={D.coral} strokeWidth={2} dot={false} name="Expenses" strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Services */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Services</div>
          {services.slice(0, 4).map((s, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: D.muted, maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.service_name}</span>
                <span style={{ fontWeight: 600, color: D.emerald }}>{fmt(s.total_billed)}</span>
              </div>
              <div style={{ height: 5, background: D.border, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${(s.total_billed / (services[0]?.total_billed || 1)) * 100}%`,
                  height: '100%', background: D.emerald, borderRadius: 3,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Outstanding */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14 }}>Outstanding Balances</div>
          <span style={{ fontSize: 11, color: D.muted }}>{outstanding.length} invoices</span>
        </div>
        <div style={{ maxHeight: 280, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: D.surface }}>
                {['Patient', 'Invoice', 'Date', 'Total', 'Collected', 'Balance', 'Days'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${D.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outstanding.slice(0, 20).map((inv, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${D.border}` }}>
                  <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 500 }}>{inv.patient_name}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: D.muted }}>{inv.jane_invoice_num}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: D.muted }}>{inv.purchase_date}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: D.emerald }}>{fmt(inv.total)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: D.gold }}>{fmt(inv.collected)}</td>
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