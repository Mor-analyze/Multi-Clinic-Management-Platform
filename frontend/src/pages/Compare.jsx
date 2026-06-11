import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getInvoiceSummary, getRevenueTrend, getServicePnl } from '../services/api';

const D = {
  bg: '#07080F', surface: '#0B0E17', card: '#0F1420',
  border: '#1A2035', text: '#E8ECF8', muted: '#4A5470',
  emerald: '#00C896', emeraldDim: '#00C89615',
  gold: '#FFB020', goldDim: '#FFB02015',
  coral: '#FF5C7A', coralDim: '#FF5C7A15',
  azure: '#5B8FFF', azureDim: '#5B8FFF15',
};

const CLINICS = [
  { id: 'd3417879-4607-469a-a614-b1ec611af077', name: 'TouchBrain Counseling', color: '#5B8FFF', short: 'TB' },
  { id: '0abf11de-ef88-4a3f-aba9-d0f0bd94dce1', name: 'Elite Touch Wellness', color: '#00C896', short: 'ET' },
];

const fmt = n => `$${Number(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: D.text }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>{p.name}: CAD ${p.value?.toLocaleString()}</div>
      ))}
    </div>
  );
};

export default function Compare() {
  const [data, setData] = useState({ tb: null, et: null });
  const [trends, setTrends] = useState({ tb: [], et: [] });
  const [services, setServices] = useState({ tb: [], et: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const [tb, et] = CLINICS;
    Promise.all([
      getInvoiceSummary(tb.id),
      getInvoiceSummary(et.id),
      getRevenueTrend(tb.id, 6),
      getRevenueTrend(et.id, 6),
      getServicePnl(tb.id),
      getServicePnl(et.id),
    ]).then(([tbSum, etSum, tbTrend, etTrend, tbSvc, etSvc]) => {
      setData({ tb: tbSum.data, et: etSum.data });
      setTrends({ tb: tbTrend.data, et: etTrend.data });
      setServices({ tb: tbSvc.data, et: etSvc.data });
    }).finally(() => setLoading(false));
  }, []);

  // Combine trend data for side by side bar chart
  const combinedTrend = trends.tb.map((tbMonth, i) => ({
    month: tbMonth.month,
    TouchBrain: tbMonth.collected,
    EliteTouch: trends.et[i]?.collected || 0,
  }));

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: D.bg }}>
      <div style={{ color: D.muted }}>Loading...</div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: D.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: D.text }}>Clinic Comparison</div>
        <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>Elite Touch Wellness vs TouchBrain Counseling</div>
      </div>

      {/* Clinic headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        {CLINICS.map(c => (
          <div key={c.id} style={{ background: D.card, border: `1px solid ${c.color}33`, borderRadius: 12, padding: '16px 20px', borderTop: `2px solid ${c.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, boxShadow: `0 0 8px ${c.color}` }} />
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, color: D.text }}>{c.name}</div>
            </div>
          </div>
        ))}
      </div>

      {/* KPI comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        {CLINICS.map((c, i) => {
          const d = i === 0 ? data.tb : data.et;
          return (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Total Billed', value: `CAD ${fmt(d?.total_billed)}`, color: c.color },
                { label: 'Collected', value: `CAD ${fmt(d?.total_collected)}`, color: D.gold },
                { label: 'Outstanding', value: `CAD ${fmt(d?.total_outstanding)}`, color: D.coral },
                { label: 'Collection Rate', value: `${d?.collection_rate || 0}%`, color: d?.collection_rate >= 80 ? D.emerald : D.gold },
              ].map((k, j) => (
                <div key={j} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: D.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: k.color, fontFamily: "'Syne', sans-serif" }}>{k.value}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Combined revenue trend bar chart */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Revenue Collected — Side by Side</div>
        <div style={{ display: 'flex', gap: 16, fontSize: 10, fontWeight: 600, marginBottom: 14 }}>
          <span style={{ color: CLINICS[0].color }}>■ {CLINICS[0].short}</span>
          <span style={{ color: CLINICS[1].color }}>■ {CLINICS[1].short}</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={combinedTrend} barCategoryGap="30%">
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: D.muted }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<TT />} />
            <Bar dataKey="TouchBrain" fill={CLINICS[0].color} radius={[4, 4, 0, 0]} name="TouchBrain" />
            <Bar dataKey="EliteTouch" fill={CLINICS[1].color} radius={[4, 4, 0, 0]} name="Elite Touch" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Services comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        {CLINICS.map((c, i) => {
          const svcList = i === 0 ? services.tb : services.et;
          const maxBilled = Math.max(...svcList.map(s => s.total_billed), 1);
          return (
            <div key={c.id} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 14, color: c.color }}>{c.short} — Services</div>
              {svcList.length === 0 ? (
                <div style={{ fontSize: 12, color: D.muted }}>No data yet</div>
              ) : svcList.map((s, j) => (
                <div key={j} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: D.muted, maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.service_name}</span>
                    <span style={{ fontWeight: 700, color: c.color }}>CAD {fmt(s.total_billed)}</span>
                  </div>
                  <div style={{ height: 5, background: D.border, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(s.total_billed / maxBilled) * 100}%`, height: '100%', background: c.color, borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>{s.total_sessions} sessions</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

    </div>
  );
}