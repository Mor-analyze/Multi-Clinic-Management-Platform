import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDemographics } from '../services/api';

const D = {
  bg: '#07080F', surface: '#0B0E17', card: '#0F1420',
  border: '#1A2035', text: '#E8ECF8', muted: '#4A5470',
  emerald: '#00C896', emeraldDim: '#00C89615',
  gold: '#FFB020', goldDim: '#FFB02015',
  coral: '#FF5C7A', coralDim: '#FF5C7A15',
  azure: '#5B8FFF', azureDim: '#5B8FFF15',
  purple: '#9B7FFF',
};

const TB_CLINIC = 'd3417879-4607-469a-a614-b1ec611af077';
const COLORS = ['#5B8FFF', '#00C896', '#FFB020', '#FF5C7A', '#9B7FFF', '#00D4FF', '#FF8C42', '#A8E063'];

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: D.text }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {p.value}</div>)}
    </div>
  );
};

export default function Demographics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDemographics(TB_CLINIC)
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: D.azure }} />
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: D.text }}>Demographics</div>
        </div>
        <div style={{ fontSize: 11, color: D.muted }}>TouchBrain Counseling · Patient insights</div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Patients', value: data?.total_patients, color: D.azure, dim: D.azureDim },
          { label: 'Active Patients', value: data?.active_patients, color: D.emerald, dim: D.emeraldDim },
          { label: 'Inactive Patients', value: data?.inactive_patients, color: D.muted, dim: D.border + '44' },
        ].map((k, i) => (
          <div key={i} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at top left, ${k.dim}, transparent 65%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${k.color}88, transparent)` }} />
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: D.muted, textTransform: 'uppercase', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: k.color, fontFamily: "'Syne', sans-serif" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Age groups + Cities row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>

        {/* Age groups */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Age Groups</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.age_groups} layout="vertical" barCategoryGap="20%">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="group" tick={{ fontSize: 11, fill: D.muted }} axisLine={false} tickLine={false} width={70} />
              <Tooltip content={<TT />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Patients">
                {data?.age_groups?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top cities */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Top Cities</div>
          {data?.top_cities?.map((c, i) => {
            const max = data.top_cities[0]?.count || 1;
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: D.muted }}>{c.city}</span>
                  <span style={{ fontWeight: 700, color: COLORS[i % COLORS.length] }}>{c.count}</span>
                </div>
                <div style={{ height: 5, background: D.border, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(c.count / max) * 100}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New patients per month + Referral sources */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>

        {/* New patients trend */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>New Patients per Month</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data?.monthly_new_patients} barCategoryGap="30%">
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: D.muted }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<TT />} />
              <Bar dataKey="new_patients" fill={D.azure} radius={[4, 4, 0, 0]} name="New Patients" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Referral sources */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Referral Sources</div>
          {data?.referral_sources?.length === 0 ? (
            <div style={{ fontSize: 12, color: D.muted }}>No referral data available</div>
          ) : data?.referral_sources?.map((r, i) => {
            const max = data.referral_sources[0]?.count || 1;
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: D.muted, maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.source}</span>
                  <span style={{ fontWeight: 700, color: COLORS[i % COLORS.length] }}>{r.count}</span>
                </div>
                <div style={{ height: 5, background: D.border, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(r.count / max) * 100}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}