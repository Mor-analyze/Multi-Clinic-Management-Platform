import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatient } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const D = {
  bg: '#07080F', surface: '#0B0E17', card: '#0F1420',
  border: '#1A2035', text: '#E8ECF8', muted: '#4A5470',
  emerald: '#00C896', emeraldDim: '#00C89615',
  gold: '#FFB020', goldDim: '#FFB02015',
  coral: '#FF5C7A', coralDim: '#FF5C7A15',
  azure: '#5B8FFF', azureDim: '#5B8FFF15',
  purple: '#9B7FFF', purpleDim: '#9B7FFF15',
};

const fmt = n => `CAD $${Number(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

function LineChart({ data, color }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const PAD = { top: 24, right: 20, bottom: 36, left: 36 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    ctx.clearRect(0, 0, W, H);

    const maxVal = Math.max(...data.map(d => d.count)) + 1;
    const xStep = chartW / (data.length - 1 || 1);
    const xPos = i => PAD.left + i * xStep;
    const yPos = v => PAD.top + chartH - (v / maxVal) * chartH;

    // Grid
    ctx.strokeStyle = '#1A2035';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();
      ctx.fillStyle = D.muted; ctx.font = '10px DM Sans, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), PAD.left - 6, y + 4);
    }

    // Fill
    const grad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top + chartH);
    grad.addColorStop(0, color + '40'); grad.addColorStop(1, color + '00');
    ctx.beginPath();
    data.forEach((d, i) => i === 0 ? ctx.moveTo(xPos(i), yPos(d.count)) : ctx.lineTo(xPos(i), yPos(d.count)));
    ctx.lineTo(xPos(data.length - 1), PAD.top + chartH);
    ctx.lineTo(PAD.left, PAD.top + chartH);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    data.forEach((d, i) => i === 0 ? ctx.moveTo(xPos(i), yPos(d.count)) : ctx.lineTo(xPos(i), yPos(d.count)));
    ctx.stroke();

    // Dots + markers
    data.forEach((d, i) => {
      const x = xPos(i), y = yPos(d.count);
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0F1420'; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();

      if (d.brainmap) {
        ctx.beginPath(); ctx.arc(x, y - 16, 9, 0, Math.PI * 2);
        ctx.fillStyle = D.purple; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px DM Sans';
        ctx.textAlign = 'center'; ctx.fillText('B', x, y - 12);
      }
      if (d.remap) {
        ctx.beginPath(); ctx.arc(x, y - 16, 9, 0, Math.PI * 2);
        ctx.fillStyle = D.gold; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px DM Sans';
        ctx.textAlign = 'center'; ctx.fillText('R', x, y - 12);
      }

      ctx.fillStyle = D.muted; ctx.font = '9px DM Sans'; ctx.textAlign = 'center';
      ctx.fillText(d.month, x, PAD.top + chartH + 14);
    });
  }, [data, color]);

return (
  <canvas
    ref={canvasRef}
    width={1200}
    height={360}
    style={{ width: '100%', height: 'auto' }}
  />
);
}

export default function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatient(id)
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: D.bg }}>
      <div style={{ color: D.muted }}>Loading patient...</div>
    </div>
  );

  if (!data) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: D.bg }}>
      <div style={{ color: D.coral }}>Patient not found</div>
    </div>
  );

  const { patient, regular_sessions, assessments, totals } = data;
  const brainmap = assessments.find(a => a.service_assessment_type === 'brainmap');
  const remaps = assessments.filter(a => a.service_assessment_type === 'remap');

  // Build chart data from sessions
  const sessionsByMonth = {};
  [...regular_sessions, ...assessments].forEach(s => {
    if (!s.session_date) return;
    const month = s.session_date.substring(0, 7);
    sessionsByMonth[month] = (sessionsByMonth[month] || 0) + 1;
  });

  let cumulative = 0;
  const brainmapMonth = brainmap?.session_date?.substring(0, 7);
  const remapMonths = remaps.map(r => r.session_date?.substring(0, 7));

  const chartData = Object.entries(sessionsByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => {
      cumulative += count;
      const label = new Date(month + '-01').toLocaleDateString('en-CA', { month: 'short', year: '2-digit' });
      return {
        month: label,
        count: cumulative,
        brainmap: month === brainmapMonth,
        remap: remapMonths.includes(month),
      };
    });

  return (
    <div style={{ flex: 1, overflow: 'auto', background: D.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        tr { transition: background 0.1s; }
        tr:hover td { background: #0F142088 !important; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#0B1825', borderBottom: `1px solid ${D.border}`, padding: '0 28px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 18, marginBottom: 18 }}>
          <button onClick={() => navigate('/tb/patients')} style={{
            background: 'none', border: 'none', color: D.muted,
            cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}>← Back to Patients</button>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                padding: '7px 14px', background: 'none',
                border: `1px solid ${D.azure}55`, borderRadius: 7,
                color: D.azure, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>✎ Edit</button>
              <button style={{
                padding: '7px 14px', background: D.gold,
                border: 'none', borderRadius: 7,
                color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>+ Add Assessment</button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 50, height: 50, borderRadius: '50%',
            background: `linear-gradient(135deg, ${D.azure}, ${D.purple})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 18, fontWeight: 700, flexShrink: 0,
          }}>
            {patient.first_name?.[0]}{patient.last_name?.[0]}
          </div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: D.text }}>
              {patient.first_name} {patient.last_name}
              {patient.preferred_name && (
                <span style={{ fontSize: 15, fontWeight: 300, color: D.muted, marginLeft: 10 }}>
                  "{patient.preferred_name}"
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>
              TouchBrain Counseling · {patient.jane_id}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ background: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)' }}>
          {[
            { label: 'Status', value: <span style={{ color: patient.is_active ? D.emerald : D.coral, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: patient.is_active ? D.emerald : D.coral, display: 'inline-block' }} />
              {patient.is_active ? 'Active' : 'Inactive'}
            </span> },
            { label: 'Date of Birth', value: fmtDate(patient.date_of_birth) },
            { label: 'First Visit', value: fmtDate(patient.first_visit) },
            { label: 'Total Sessions', value: <span style={{ color: D.azure, fontWeight: 700 }}>{totals.total_sessions}</span> },
            { label: 'Total Billed', value: <span style={{ color: D.gold, fontWeight: 700 }}>{fmt(totals.total_billed)}</span> },
            { label: 'Outstanding', value: <span style={{ color: totals.total_outstanding > 0 ? D.coral : D.emerald, fontWeight: 700 }}>{fmt(totals.total_outstanding)}</span> },
          ].map((m, i) => (
            <div key={i} style={{ padding: '14px 18px', borderRight: i < 5 ? `1px solid ${D.border}` : 'none' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: D.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>{m.label}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Assessments + Sessions by type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Assessments */}
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: D.text, marginBottom: 14 }}>Assessments</div>

            {brainmap ? (
              <div style={{ background: D.purpleDim, border: `1px solid ${D.purple}33`, borderRadius: 9, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: D.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>B</div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: D.purple }}>Brain Map</span>
                  <span style={{ fontSize: 11, color: D.muted, marginLeft: 'auto' }}>{fmtDate(brainmap.session_date)}</span>
                </div>
                {brainmap.notes && <p style={{ fontSize: 12, color: D.muted, lineHeight: 1.5 }}>{brainmap.notes}</p>}
              </div>
            ) : (
              <div style={{ padding: '12px 14px', background: D.surface, borderRadius: 9, marginBottom: 10, fontSize: 12, color: D.muted }}>
                No Brain Map recorded yet
              </div>
            )}

            {remaps.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 600, color: D.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Re-maps ({remaps.length})</div>
                {remaps.map((r, i) => (
                  <div key={i} style={{ background: D.goldDim, border: `1px solid ${D.gold}33`, borderRadius: 9, padding: '11px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: D.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700 }}>R{i + 1}</div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: D.gold }}>Re-map {i + 1}</span>
                      <span style={{ fontSize: 11, color: D.muted, marginLeft: 'auto' }}>{fmtDate(r.session_date)}</span>
                    </div>
                    {r.notes && <p style={{ fontSize: 12, color: D.muted, lineHeight: 1.5 }}>{r.notes}</p>}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Contact info */}
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: D.text, marginBottom: 14 }}>Contact Information</div>
            {[
              { label: 'Phone', value: patient.phone, icon: '📞' },
              { label: 'Email', value: patient.email, icon: '✉' },
              { label: 'Address', value: [patient.street_address, patient.city, patient.province, patient.postal_code].filter(Boolean).join(', '), icon: '📍' },
              { label: 'Date of Birth', value: fmtDate(patient.date_of_birth), icon: '🎂' },
            ].map((c, i) => (
              <div key={i} style={{ background: D.surface, borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: D.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>{c.icon} {c.label}</div>
                <div style={{ fontSize: 13, color: c.value ? D.text : D.muted }}>{c.value || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Cumulative Sessions</div>
            <div style={{ fontSize: 11, color: D.muted, marginBottom: 14 }}>
              <span style={{ color: D.purple, fontWeight: 700 }}>B</span> = Brain Map &nbsp;·&nbsp;
              <span style={{ color: D.gold, fontWeight: 700 }}>R</span> = Re-map
            </div>
            <LineChart data={chartData} color={D.azure} />
          </div>
        )}

        {/* Session history */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${D.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700 }}>Session History</div>
            <span style={{ fontSize: 11, color: D.muted }}>{regular_sessions.length} sessions</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: D.surface }}>
                {['Date', 'Service', 'Duration', 'Cost', 'Collected', 'Balance', ...(isAdmin ? [''] : [])].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regular_sessions.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: D.muted }}>No sessions found</td></tr>
              ) : regular_sessions.map((s, i) => (
                <tr key={s.id} style={{ background: i % 2 === 0 ? 'transparent' : D.surface + '44' }}>
                  <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: `1px solid ${D.border}`, fontWeight: 600 }}>{fmtDate(s.session_date)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: `1px solid ${D.border}`, color: D.muted, maxWidth: 220 }}>{s.service_name || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: `1px solid ${D.border}`, color: D.muted }}>{s.duration_minutes ? `${s.duration_minutes} min` : '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: `1px solid ${D.border}`, color: D.azure, fontWeight: 600 }}>{fmt(s.cost)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: `1px solid ${D.border}`, color: D.gold }}>{fmt(s.collected)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: `1px solid ${D.border}`, color: s.balance > 0 ? D.coral : D.emerald, fontWeight: 600 }}>{fmt(s.balance)}</td>
                  {isAdmin && (
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${D.border}` }}>
                      <button style={{ fontSize: 11, padding: '3px 8px', background: 'none', border: `1px solid ${D.coral}44`, borderRadius: 5, color: D.coral, cursor: 'pointer' }}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}