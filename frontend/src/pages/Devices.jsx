import { useState, useEffect } from 'react';
import { getDevices, createDevice, addMaintenance, getDeviceRoi } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const D = {
  bg: '#07080F', surface: '#0B0E17', card: '#0F1420',
  border: '#1A2035', text: '#E8ECF8', muted: '#4A5470',
  emerald: '#00C896', emeraldDim: '#00C89615',
  gold: '#FFB020', goldDim: '#FFB02015',
  coral: '#FF5C7A', coralDim: '#FF5C7A15',
  azure: '#5B8FFF', azureDim: '#5B8FFF15',
};

const TB_BRANCH = '3338ff68-9a30-4ebf-9a09-31225e3dda36';
const fmt = n => `CAD $${Number(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const statusColor = s => s === 'profitable' ? D.emerald : s === 'watch' ? D.gold : D.coral;
const statusDim = s => s === 'profitable' ? D.emeraldDim : s === 'watch' ? D.goldDim : D.coralDim;

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: '28px 30px', width: 480, maxWidth: '90vw' }}>
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

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [roi, setRoi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(null);
  const [showLog, setShowLog] = useState(null);
  const { isAdmin } = useAuth();

  const [form, setForm] = useState({ name: '', purchase_cost: '', purchase_date: '', next_maintenance_date: '', maintenance_alert_date: '' });
  const [maintForm, setMaintForm] = useState({ date: '', type: 'routine', cost: '', technician: '', notes: '', downtime_hours: '', next_maintenance_date: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getDevices(TB_BRANCH),
      getDeviceRoi(TB_BRANCH),
    ]).then(([d, r]) => {
      setDevices(d.data);
      setRoi(r.data);
    }).finally(() => setLoading(false));
  };

  const handleAdd = async () => {
    try {
      await createDevice({
        branch_id: TB_BRANCH,
        name: form.name,
        purchase_cost: parseFloat(form.purchase_cost),
        purchase_date: form.purchase_date || undefined,
        next_maintenance_date: form.next_maintenance_date || undefined,
        maintenance_alert_date: form.maintenance_alert_date || undefined,
      });
      setShowAdd(false);
      setForm({ name: '', purchase_cost: '', purchase_date: '', next_maintenance_date: '', maintenance_alert_date: '' });
      loadData();
    } catch (err) {
      alert('Error: ' + err.response?.data?.detail);
    }
  };

  const handleMaintenance = async () => {
    try {
      await addMaintenance({
        device_id: showMaintenance.id,
        date: maintForm.date,
        type: maintForm.type,
        cost: parseFloat(maintForm.cost),
        technician: maintForm.technician || undefined,
        notes: maintForm.notes || undefined,
        downtime_hours: maintForm.downtime_hours ? parseFloat(maintForm.downtime_hours) : undefined,
        next_maintenance_date: maintForm.next_maintenance_date || undefined,
      });
      setShowMaintenance(null);
      setMaintForm({ date: '', type: 'routine', cost: '', technician: '', notes: '', downtime_hours: '', next_maintenance_date: '' });
      loadData();
    } catch (err) {
      alert('Error: ' + err.response?.data?.detail);
    }
  };

  const getRoi = (deviceId) => roi.find(r => r.device_id === deviceId);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: D.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select, button { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: D.azure }} />
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: D.text }}>Devices</div>
          </div>
          <div style={{ fontSize: 11, color: D.muted }}>TouchBrain Counseling · {devices.length} devices</div>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} style={{ padding: '9px 18px', background: D.azure, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            + Add Device
          </button>
        )}
      </div>

      {/* Device cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: D.muted }}>Loading...</div>
      ) : devices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: D.muted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⬡</div>
          <div style={{ fontSize: 14 }}>No devices yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Click "+ Add Device" to get started</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {devices.map((d, i) => {
            const roiData = getRoi(d.id);
            const status = roiData?.status || 'watch';
            const recoveredPct = roiData?.recovered_pct || 0;
            const sc = statusColor(status);
            const sd = statusDim(status);

            return (
              <div key={d.id} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: sc }} />

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: D.text }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>
                      {fmt(d.purchase_cost)} · {d.purchase_date || 'No date'}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: sc, background: sd, border: `1px solid ${sc}33`, textTransform: 'capitalize' }}>
                    {status}
                  </span>
                </div>

                {/* Cost recovery bar */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                    <span style={{ color: D.muted }}>Cost Recovered</span>
                    <span style={{ fontWeight: 700, color: sc }}>{recoveredPct}%</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 4, background: D.border, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(recoveredPct, 100)}%`, height: '100%', background: sc, borderRadius: 4, boxShadow: `0 0 6px ${sc}66`, transition: 'width 0.6s ease' }} />
                  </div>
                </div>

                {/* ROI stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Monthly Rev', value: fmt(roiData?.monthly_revenue_avg || 0), color: D.emerald },
                    { label: 'Maintenance', value: fmt(d.total_maintenance_cost), color: D.coral },
                    { label: roiData?.breakeven_months_remaining > 0 ? 'Break-even' : 'Status', value: roiData?.breakeven_months_remaining > 0 ? `${roiData.breakeven_months_remaining} mo` : 'Paid ✓', color: D.azure },
                  ].map((m, j) => (
                    <div key={j} style={{ background: D.surface, borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 9, color: D.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* Maintenance info */}
                {d.next_maintenance_date && (
                  <div style={{ marginBottom: 12, padding: '8px 10px', background: d.maintenance_due ? D.coralDim : D.surface, borderRadius: 8, border: `1px solid ${d.maintenance_due ? D.coral + '44' : D.border}` }}>
                    <span style={{ fontSize: 11, color: d.maintenance_due ? D.coral : D.muted }}>
                      {d.maintenance_due ? '⚠ Maintenance overdue' : '🔧 Next maintenance'}: {d.next_maintenance_date}
                    </span>
                  </div>
                )}

                {/* Actions */}
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: `1px solid ${D.border}` }}>
                    <button onClick={() => setShowMaintenance(d)} style={{ flex: 1, padding: '7px', background: D.azureDim, border: `1px solid ${D.azure}44`, borderRadius: 7, color: D.azure, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      + Log Maintenance
                    </button>
                    <button onClick={() => setShowLog(d)} style={{ flex: 1, padding: '7px', background: D.surface, border: `1px solid ${D.border}`, borderRadius: 7, color: D.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      View Log
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Device Modal */}
      {showAdd && (
        <Modal title="Add Device" onClose={() => setShowAdd(false)}>
          <Field label="Device Name *">
            <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Biofeedback System" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Purchase Cost (CAD) *">
              <input type="number" style={inputStyle} value={form.purchase_cost} onChange={e => setForm({ ...form, purchase_cost: e.target.value })} placeholder="18000" />
            </Field>
            <Field label="Purchase Date">
              <input type="date" style={inputStyle} value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Next Maintenance">
              <input type="date" style={inputStyle} value={form.next_maintenance_date} onChange={e => setForm({ ...form, next_maintenance_date: e.target.value })} />
            </Field>
            <Field label="Alert Date">
              <input type="date" style={inputStyle} value={form.maintenance_alert_date} onChange={e => setForm({ ...form, maintenance_alert_date: e.target.value })} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '9px 18px', background: 'none', border: `1px solid ${D.border}`, borderRadius: 8, color: D.muted, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleAdd} style={{ padding: '9px 18px', background: D.azure, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Add Device</button>
          </div>
        </Modal>
      )}

      {/* Log Maintenance Modal */}
      {showMaintenance && (
        <Modal title={`Log Maintenance — ${showMaintenance.name}`} onClose={() => setShowMaintenance(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Date *">
              <input type="date" style={inputStyle} value={maintForm.date} onChange={e => setMaintForm({ ...maintForm, date: e.target.value })} />
            </Field>
            <Field label="Type *">
              <select style={inputStyle} value={maintForm.type} onChange={e => setMaintForm({ ...maintForm, type: e.target.value })}>
                <option value="routine">Routine</option>
                <option value="repair">Repair</option>
                <option value="part_replacement">Part Replacement</option>
              </select>
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Cost (CAD) *">
              <input type="number" style={inputStyle} value={maintForm.cost} onChange={e => setMaintForm({ ...maintForm, cost: e.target.value })} placeholder="350" />
            </Field>
            <Field label="Downtime (hours)">
              <input type="number" style={inputStyle} value={maintForm.downtime_hours} onChange={e => setMaintForm({ ...maintForm, downtime_hours: e.target.value })} placeholder="2" />
            </Field>
          </div>
          <Field label="Technician">
            <input style={inputStyle} value={maintForm.technician} onChange={e => setMaintForm({ ...maintForm, technician: e.target.value })} placeholder="Company or person name" />
          </Field>
          <Field label="Notes">
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} value={maintForm.notes} onChange={e => setMaintForm({ ...maintForm, notes: e.target.value })} placeholder="What was done..." />
          </Field>
          <Field label="Next Maintenance Date">
            <input type="date" style={inputStyle} value={maintForm.next_maintenance_date} onChange={e => setMaintForm({ ...maintForm, next_maintenance_date: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => setShowMaintenance(null)} style={{ padding: '9px 18px', background: 'none', border: `1px solid ${D.border}`, borderRadius: 8, color: D.muted, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleMaintenance} style={{ padding: '9px 18px', background: D.azure, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save</button>
          </div>
        </Modal>
      )}

      {/* View Log Modal */}
      {showLog && (
        <Modal title={`Maintenance Log — ${showLog.name}`} onClose={() => setShowLog(null)}>
          <div style={{ fontSize: 12, color: D.muted, marginBottom: 12 }}>
            Total maintenance cost: <strong style={{ color: D.coral }}>{fmt(showLog.total_maintenance_cost)}</strong>
          </div>
          {showLog.maintenance_count === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: D.muted }}>No maintenance logged yet</div>
          ) : (
            <div style={{ fontSize: 12, color: D.muted }}>
              {showLog.maintenance_count} maintenance records — view full log in reports
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button onClick={() => setShowLog(null)} style={{ padding: '9px 18px', background: D.azure, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}