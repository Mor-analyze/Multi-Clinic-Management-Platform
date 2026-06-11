import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getRevenueTrend, getServicePnl, getExpenseSummary, getForecast, getInvoiceSummary } from '../services/api';

const D = {
  bg: '#07080F', surface: '#0B0E17', card: '#0F1420',
  border: '#1A2035', text: '#E8ECF8', muted: '#4A5470',
  emerald: '#00C896', emeraldDim: '#00C89615',
  gold: '#FFB020', goldDim: '#FFB02015',
  coral: '#FF5C7A', coralDim: '#FF5C7A15',
  azure: '#5B8FFF', azureDim: '#5B8FFF15',
  purple: '#9B7FFF', purpleDim: '#9B7FFF15',
};

const TB_CLINIC = 'd3417879-4607-469a-a614-b1ec611af077';
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

function KCard({ label, value, sub, color, dim }) {
  return (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at top left, ${dim}, transparent 65%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${color}88, transparent)` }} />
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: D.muted, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: D.text, fontFamily: "'Syne', sans-serif", marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

export default function Finance() {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [services, setServices] = useState([]);
  const [expenses, setExpenses] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [trendMonths, setTrendMonths] = useState(6);
  const [forecastMonths, setForecastMonths] = useState(6);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [trendMonths, forecastMonths]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getInvoiceSummary(TB_CLINIC),
      getRevenueTrend(TB_CLINIC, trendMonths),
      getServicePnl(TB_CLINIC),
      getExpenseSummary(TB_CLINIC),
      getForecast(TB_CLINIC, forecastMonths),
    ]).then(([sm, tr, sv, ex, fc]) => {
      setSummary(sm.data);
      setTrend(tr.data);
      setServices(sv.data);
      setExpenses(ex.data);
      setForecast(fc.data);
    }).finally(() => setLoading(false));
  };

  // Combine trend + forecast for chart
  const combinedChart = [
    ...trend.map(t => ({ ...t, type: 'actual' })),
    ...(forecast?.forecast || []).map(f => ({
      month: f.month,
      billed: f.projected_revenue,
      collected: f.projected_revenue,
      expenses: f.projected_expenses,
      profit: f.projected_profit,
      type: 'forecast',
    }))
  ];

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
        button { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: D.text }}>Finance</div>
          <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>TouchBrain Counseling · All time</div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        <KCard label="Total Billed" value={`CAD ${fmt(summary?.total_billed)}`} sub={`${summary?.collection_rate}% collected`} color={D.azure} dim={D.azureDim} />
        <KCard label="Total Collected" value={`CAD ${fmt(summary?.total_collected)}`} sub="Cash received" color={D.emerald} dim={D.emeraldDim} />
        <KCard label="Outstanding" value={`CAD ${fmt(summary?.total_outstanding)}`} sub="Patients owe" color={D.coral} dim={D.coralDim} />
        <KCard label="Total Expenses" value={`CAD ${fmt(expenses?.total)}`} sub="All categories" color={D.gold} dim={D.goldDim} />
        <KCard label="Net Profit" value={`CAD ${fmt((summary?.total_collected || 0) - (expenses?.total || 0))}`} sub="Collected − Expenses" color={D.purple} dim={D.purpleDim} />
      </div>

      {/* Expense breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Fixed Expenses', value: expenses?.fixed, color: D.azure },
          { label: 'Operations', value: expenses?.operations, color: D.emerald },
          { label: 'Office & Admin', value: expenses?.office, color: D.gold },
        ].map((e, i) => (
          <div key={i} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: D.muted }}>{e.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: e.color }}>CAD {fmt(e.value)}</div>
          </div>
        ))}
      </div>

      {/* Revenue trend + forecast chart */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15 }}>Revenue Trend + Forecast</div>
            <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>Actual history + projected forward</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Trend selector */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: D.muted }}>History:</span>
              {[3, 6, 12].map(m => (
                <button key={m} onClick={() => setTrendMonths(m)}
                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${trendMonths === m ? D.azure : D.border}`, background: trendMonths === m ? D.azureDim : 'transparent', color: trendMonths === m ? D.azure : D.muted }}>
                  {m}mo
                </button>
              ))}
            </div>
            {/* Forecast selector */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: D.muted }}>Forecast:</span>
              {[3, 6, 12].map(m => (
                <button key={m} onClick={() => setForecastMonths(m)}
                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${forecastMonths === m ? D.purple : D.border}`, background: forecastMonths === m ? D.purpleDim : 'transparent', color: forecastMonths === m ? D.purple : D.muted }}>
                  {m}mo
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 10, fontWeight: 600 }}>
          <span style={{ color: D.emerald }}>● Collected</span>
          <span style={{ color: D.coral }}>● Expenses</span>
          <span style={{ color: D.gold }}>● Profit</span>
          <span style={{ color: D.purple, borderLeft: `1px dashed ${D.border}`, paddingLeft: 12 }}>◌ Forecast →</span>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={combinedChart}>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: D.muted }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<TT />} />
            <Line type="monotone" dataKey="collected" stroke={D.emerald} strokeWidth={2.5} dot={false} name="Collected"
              strokeDasharray={undefined} />
            <Line type="monotone" dataKey="expenses" stroke={D.coral} strokeWidth={2} dot={false} name="Expenses"
              strokeDasharray={undefined} />
            <Line type="monotone" dataKey="profit" stroke={D.gold} strokeWidth={2} dot={false} name="Profit"
              strokeDasharray={undefined} />
          </LineChart>
        </ResponsiveContainer>

        {/* Forecast summary */}
        {forecast && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${D.border}` }}>
            {[
              { label: 'Monthly Revenue (baseline)', value: `CAD ${fmt(forecast.baseline_monthly_revenue)}`, color: D.emerald },
              { label: 'Monthly Expenses (baseline)', value: `CAD ${fmt(forecast.baseline_monthly_expenses)}`, color: D.coral },
              { label: 'Monthly Profit (projected)', value: `CAD ${fmt(forecast.baseline_monthly_revenue - forecast.baseline_monthly_expenses)}`, color: D.gold },
            ].map((f, i) => (
              <div key={i} style={{ background: D.surface, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: D.muted, marginBottom: 4 }}>{f.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: f.color }}>{f.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Services P&L */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Services P&L</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: D.surface }}>
              {['Service', 'Sessions', 'Total Billed', 'Total Collected', 'Avg per Session', 'Collection Rate'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {services.map((s, i) => {
              const rate = s.total_billed > 0 ? Math.round((s.total_collected / s.total_billed) * 100) : 0;
              return (
                <tr key={s.service_id} style={{ background: i % 2 === 0 ? 'transparent' : D.surface + '44' }}>
                  <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, borderBottom: `1px solid ${D.border}`, maxWidth: 220 }}>{s.service_name}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: D.azure, fontWeight: 700, borderBottom: `1px solid ${D.border}` }}>{s.total_sessions}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: D.text, borderBottom: `1px solid ${D.border}` }}>CAD {fmt(s.total_billed)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: D.emerald, fontWeight: 600, borderBottom: `1px solid ${D.border}` }}>CAD {fmt(s.total_collected)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: D.gold, borderBottom: `1px solid ${D.border}` }}>CAD {fmt(s.avg_per_session)}</td>
                  <td style={{ padding: '10px 14px', borderBottom: `1px solid ${D.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: D.border, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${rate}%`, height: '100%', background: rate >= 80 ? D.emerald : rate >= 50 ? D.gold : D.coral, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: rate >= 80 ? D.emerald : rate >= 50 ? D.gold : D.coral, minWidth: 30 }}>{rate}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}