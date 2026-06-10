import { useState, useEffect } from 'react';
import api from '../services/api';
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

const assessmentColor = t => t === 'brainmap' ? D.purple : t === 'remap' ? D.gold : D.muted;
const assessmentDim = t => t === 'brainmap' ? D.purpleDim : t === 'remap' ? D.goldDim : 'transparent';
const assessmentLabel = t => t === 'brainmap' ? '🧠 Brainmap' : t === 'remap' ? '🔄 Remap' : 'Regular Session';

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: '28px 30px', width: 500, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: D.text }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: D.muted, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '9px 12px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, color: D.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' };
const Field = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: D.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
    {children}
  </div>
);

export default function Services({ clinicId, clinicName, color }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', base_price: '', duration_minutes: '', assessment_type: 'none' });
  const { isAdmin } = useAuth();

  useEffect(() => { loadServices(); }, [clinicId]);

  const loadServices = () => {
    setLoading(true);
    api.get(`/services/?clinic_id=${clinicId}`)
      .then(res => setServices(res.data))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  };

  const handleEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description || '',
      base_price: s.base_price || '',
      duration_minutes: s.duration_minutes || '',
      assessment_type: s.assessment_type || 'none',
    });
  };

  const handleSave = async () => {
    try {
      await api.patch(`/services/${editing.id}`, {
        ...form,
        base_price: form.base_price ? parseFloat(form.base_price) : null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      });
      setEditing(null);
      loadServices();
    } catch (err) {
      const detail = err.response?.data?.detail;
      alert('Error: ' + (typeof detail === 'object' ? JSON.stringify(detail) : detail));
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/services/', {
        ...form,
        clinic_id: clinicId,
        base_price: form.base_price ? parseFloat(form.base_price) : null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      });
      setEditing(null);
      setForm({ name: '', description: '', base_price: '', duration_minutes: '', assessment_type: 'none' });
      loadServices();
    } catch (err) {
      const detail = err.response?.data?.detail;
      alert('Error: ' + (typeof detail === 'object' ? JSON.stringify(detail) : detail));
    }
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: D.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select, button { font-family: 'DM Sans', sans-serif; }
        tr:hover td { background: #0F142088 !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: D.text }}>Services</div>
          </div>
          <div style={{ fontSize: 11, color: D.muted }}>{clinicName} · {services.length} services</div>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditing('new'); setForm({ name: '', description: '', base_price: '', duration_minutes: '', assessment_type: 'none' }); }}
            style={{ padding: '9px 18px', background: color, color: '#000', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            + Add Service
          </button>
        )}
      </div>

      {/* Info box */}
      <div style={{ background: D.azureDim, border: `1px solid ${D.azure}33`, borderRadius: 10, padding: '14px 18px', marginBottom: 16, fontSize: 12, color: D.muted, lineHeight: 1.7 }}>
        <strong style={{ color: D.text }}>Service Mapping</strong> — These services are auto-created from Jane imports.
        Click <strong style={{ color: D.text }}>Edit</strong> to rename a service, set the price, duration, or mark it as a Brain Map / Re-map assessment.
        Changes apply to all future imports automatically.
      </div>

      {/* Table */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: D.surface }}>
              {['Service Name', 'Jane Import Name', 'Base Price', 'Duration', 'Type', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: D.muted }}>Loading...</td></tr>
            ) : services.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: D.muted }}>No services yet — import Jane data first</td></tr>
            ) : services.map((s, i) => (
              <tr key={s.id} style={{ background: i % 2 === 0 ? 'transparent' : D.surface + '44' }}>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: D.text, borderBottom: `1px solid ${D.border}` }}>
                  {s.name}
                </td>
                <td style={{ padding: '11px 14px', fontSize: 11, color: D.muted, borderBottom: `1px solid ${D.border}`, maxWidth: 220 }}>
                  <span style={{ fontFamily: 'monospace', background: D.surface, padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                    {s.jane_name || s.name}
                  </span>
                </td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: D.gold, fontWeight: 600, borderBottom: `1px solid ${D.border}` }}>
                  {s.base_price ? `CAD $${s.base_price}` : '—'}
                </td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: D.muted, borderBottom: `1px solid ${D.border}` }}>
                  {s.duration_minutes ? `${s.duration_minutes} min` : '—'}
                </td>
                <td style={{ padding: '11px 14px', borderBottom: `1px solid ${D.border}` }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, color: assessmentColor(s.assessment_type), background: assessmentDim(s.assessment_type), border: `1px solid ${assessmentColor(s.assessment_type)}33` }}>
                    {assessmentLabel(s.assessment_type)}
                  </span>
                </td>
                <td style={{ padding: '11px 14px', borderBottom: `1px solid ${D.border}` }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, color: s.is_active ? D.emerald : D.muted, background: s.is_active ? D.emeraldDim : D.border + '44' }}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '11px 14px', borderBottom: `1px solid ${D.border}` }}>
                  {isAdmin && (
                    <button onClick={() => handleEdit(s)}
                      style={{ padding: '5px 12px', background: D.azureDim, border: `1px solid ${D.azure}44`, borderRadius: 6, color: D.azure, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit/Add Modal */}
      {editing && (
        <Modal title={editing === 'new' ? 'Add Service' : 'Edit Service'} onClose={() => setEditing(null)}>
          {editing !== 'new' && (
            <div style={{ background: D.surface, borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 12, color: D.muted }}>
              Jane name: <span style={{ fontFamily: 'monospace', color: D.text }}>{editing.name}</span>
            </div>
          )}
          <Field label="Display Name *">
            <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Individual Counselling" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Base Price (CAD)">
              <input type="number" style={inputStyle} value={form.base_price} onChange={e => setForm({ ...form, base_price: e.target.value })} placeholder="180" />
            </Field>
            <Field label="Duration (minutes)">
              <input type="number" style={inputStyle} value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} placeholder="50" />
            </Field>
          </div>
          <Field label="Assessment Type">
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'none', label: 'Regular Session' },
                { value: 'brainmap', label: '🧠 Brainmap' },
                { value: 'remap', label: '🔄 Remap' },
              ].map(t => (
                <button key={t.value} onClick={() => setForm({ ...form, assessment_type: t.value })}
                  style={{ flex: 1, padding: '8px', border: `1.5px solid ${form.assessment_type === t.value ? assessmentColor(t.value) : D.border}`, borderRadius: 7, background: form.assessment_type === t.value ? assessmentDim(t.value) : 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: form.assessment_type === t.value ? assessmentColor(t.value) : D.muted }}>
                  {t.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Description">
            <input style={inputStyle} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => setEditing(null)} style={{ padding: '9px 18px', background: 'none', border: `1px solid ${D.border}`, borderRadius: 8, color: D.muted, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={editing === 'new' ? handleCreate : handleSave}
              style={{ padding: '9px 18px', background: color, color: '#000', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {editing === 'new' ? 'Add Service' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}