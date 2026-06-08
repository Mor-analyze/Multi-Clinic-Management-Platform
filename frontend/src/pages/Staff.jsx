import { useState, useEffect } from 'react';
import { getStaff, createStaff, updateWage } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const D = {
  bg: '#07080F', surface: '#0B0E17', card: '#0F1420',
  border: '#1A2035', text: '#E8ECF8', muted: '#4A5470',
  emerald: '#00C896', emeraldDim: '#00C89615',
  gold: '#FFB020', goldDim: '#FFB02015',
  coral: '#FF5C7A', coralDim: '#FF5C7A15',
  azure: '#5B8FFF', azureDim: '#5B8FFF15',
  violet: '#9B7FFF', violetDim: '#9B7FFF15',
};

const TB_BRANCH = '3338ff68-9a30-4ebf-9a09-31225e3dda36';
const fmt = n => `CAD $${Number(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const signalColor = s => s === 'keep' ? D.emerald : s === 'watch' ? D.gold : D.coral;
const signalDim = s => s === 'keep' ? D.emeraldDim : s === 'watch' ? D.goldDim : D.coralDim;
const signalLabel = s => s === 'keep' ? '↑ Keep' : s === 'watch' ? '→ Watch' : '↓ Review';

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000088',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: D.card, border: `1px solid ${D.border}`,
        borderRadius: 14, padding: '28px 30px', width: 460,
        maxWidth: '90vw', boxShadow: '0 20px 60px #00000060',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: D.text }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: D.muted, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '9px 12px',
  background: D.surface, border: `1px solid ${D.border}`,
  borderRadius: 8, color: D.text, fontSize: 13,
  outline: 'none', fontFamily: 'inherit',
};

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: D.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
    {children}
  </div>
);

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showWage, setShowWage] = useState(null);
  const { isAdmin } = useAuth();

  // Add staff form
  const [form, setForm] = useState({ full_name: '', job_title: '', email: '', phone: '', hourly_rate: '', hired_at: '' });

  // Wage form
  const [wageForm, setWageForm] = useState({ new_rate: '', effective_from: '' });

  useEffect(() => { loadStaff(); }, []);

  const loadStaff = () => {
    setLoading(true);
    getStaff(TB_BRANCH)
      .then(res => setStaff(res.data))
      .finally(() => setLoading(false));
  };

  const handleAdd = async () => {
    try {
      await createStaff({
        branch_id: TB_BRANCH,
        full_name: form.full_name,
        job_title: form.job_title || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        hourly_rate: parseFloat(form.hourly_rate),
        hired_at: form.hired_at || undefined,
      });
      setShowAdd(false);
      setForm({ full_name: '', job_title: '', email: '', phone: '', hourly_rate: '', hired_at: '' });
      loadStaff();
    } catch (err) {
      alert('Error adding staff: ' + err.response?.data?.detail);
    }
  };

  const handleWageUpdate = async () => {
    try {
      await updateWage(showWage.id, parseFloat(wageForm.new_rate), wageForm.effective_from);
      setShowWage(null);
      setWageForm({ new_rate: '', effective_from: '' });
      loadStaff();
    } catch (err) {
      alert('Error updating wage: ' + err.response?.data?.detail);
    }
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: D.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, button { font-family: 'DM Sans', sans-serif; }
        tr { transition: background 0.1s; }
        tr:hover td { background: #0F142088 !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: D.azure }} />
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: D.text }}>Staff</div>
          </div>
          <div style={{ fontSize: 11, color: D.muted }}>TouchBrain Counseling · {staff.length} staff members</div>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} style={{
            padding: '9px 18px', background: D.azure, color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>+ Add Staff</button>
        )}
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Staff', value: staff.length, color: D.azure, dim: D.azureDim },
          { label: 'Total Wages', value: fmt(staff.reduce((s, x) => s + (x.current_hourly_rate || 0) * 160, 0)), color: D.coral, dim: D.coralDim },
          { label: 'Total Revenue Gen.', value: fmt(staff.reduce((s, x) => s + (x.total_revenue || 0), 0)), color: D.emerald, dim: D.emeraldDim },
          { label: 'Top Performer', value: staff.sort((a, b) => b.total_revenue - a.total_revenue)[0]?.full_name?.split(' ')[0] || '—', color: D.gold, dim: D.goldDim },
        ].map((k, i) => (
          <div key={i} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at top left, ${k.dim}, transparent 65%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${k.color}88, transparent)` }} />
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: D.muted, textTransform: 'uppercase', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: D.text, fontFamily: "'Syne', sans-serif" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Staff cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: D.muted }}>Loading...</div>
      ) : staff.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: D.muted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
          <div style={{ fontSize: 14 }}>No staff members yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Click "+ Add Staff" to get started</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {staff.map((s, i) => {
            const signal = s.signal || 'watch';
            return (
              <div key={s.id} style={{
                background: D.card, border: `1px solid ${D.border}`,
                borderRadius: 12, padding: '20px 22px',
                borderTop: `2px solid ${signalColor(signal)}`,
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${D.azure}, ${D.violet})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
                    }}>
                      {s.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: D.text }}>{s.full_name}</div>
                      <div style={{ fontSize: 11, color: D.muted }}>{s.job_title || 'Staff'}</div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                    color: signalColor(signal), background: signalDim(signal),
                    border: `1px solid ${signalColor(signal)}33`,
                  }}>{signalLabel(signal)}</span>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Sessions', value: s.total_sessions || 0, color: D.azure },
                    { label: 'Revenue', value: fmt(s.total_revenue), color: D.emerald },
                    { label: 'Net Contribution', value: fmt(s.net_contribution), color: s.net_contribution >= 0 ? D.gold : D.coral },
                  ].map((m, j) => (
                    <div key={j} style={{ background: D.surface, borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 9, color: D.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{m.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* Wage + actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${D.border}` }}>
                  <div>
                    <div style={{ fontSize: 10, color: D.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Hourly Rate</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: D.text }}>
                      CAD ${s.current_hourly_rate}/hr
                    </div>
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setShowWage(s); setWageForm({ new_rate: s.current_hourly_rate, effective_from: new Date().toISOString().slice(0, 10) }); }}
                        style={{ padding: '6px 12px', background: D.azureDim, border: `1px solid ${D.azure}44`, borderRadius: 7, color: D.azure, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        Update Wage
                      </button>
                    </div>
                  )}
                </div>

                {/* Contact */}
                {(s.email || s.phone) && (
                  <div style={{ marginTop: 10, fontSize: 11, color: D.muted }}>
                    {s.phone && <span style={{ marginRight: 12 }}>📞 {s.phone}</span>}
                    {s.email && <span>✉ {s.email}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAdd && (
        <Modal title="Add Staff Member" onClose={() => setShowAdd(false)}>
          <Field label="Full Name *">
            <input style={inputStyle} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Full name" />
          </Field>
          <Field label="Job Title">
            <input style={inputStyle} value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} placeholder="e.g. Lead Psychologist" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Email">
              <input type="email" style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@clinic.com" />
            </Field>
            <Field label="Phone">
              <input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="604-555-0000" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Hourly Rate (CAD) *">
              <input type="number" style={inputStyle} value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: e.target.value })} placeholder="65" />
            </Field>
            <Field label="Hire Date">
              <input type="date" style={inputStyle} value={form.hired_at} onChange={e => setForm({ ...form, hired_at: e.target.value })} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '9px 18px', background: 'none', border: `1px solid ${D.border}`, borderRadius: 8, color: D.muted, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleAdd} style={{ padding: '9px 18px', background: D.azure, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Add Staff</button>
          </div>
        </Modal>
      )}

      {/* Update Wage Modal */}
      {showWage && (
        <Modal title={`Update Wage — ${showWage.full_name}`} onClose={() => setShowWage(null)}>
          <div style={{ background: D.azureDim, border: `1px solid ${D.azure}33`, borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: D.muted }}>
            Current rate: <strong style={{ color: D.text }}>CAD ${showWage.current_hourly_rate}/hr</strong>
          </div>
          <Field label="New Hourly Rate (CAD) *">
            <input type="number" style={inputStyle} value={wageForm.new_rate} onChange={e => setWageForm({ ...wageForm, new_rate: e.target.value })} />
          </Field>
          <Field label="Effective From *">
            <input type="date" style={inputStyle} value={wageForm.effective_from} onChange={e => setWageForm({ ...wageForm, effective_from: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => setShowWage(null)} style={{ padding: '9px 18px', background: 'none', border: `1px solid ${D.border}`, borderRadius: 8, color: D.muted, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleWageUpdate} style={{ padding: '9px 18px', background: D.azure, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Update Wage</button>
          </div>
        </Modal>
      )}
    </div>
  );
}