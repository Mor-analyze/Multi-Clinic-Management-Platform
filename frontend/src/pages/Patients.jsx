import { useState, useEffect } from 'react';
import { useSort } from '../hooks/useSort';
import { useNavigate } from 'react-router-dom';
import { getPatients } from '../services/api';

const D = {
  bg: '#07080F', surface: '#0B0E17', card: '#0F1420',
  border: '#1A2035', text: '#E8ECF8', muted: '#4A5470',
  emerald: '#00C896', emeraldDim: '#00C89615',
  gold: '#FFB020', coral: '#FF5C7A',
  azure: '#5B8FFF', azureDim: '#5B8FFF15',
};

const TB_CLINIC = 'd3417879-4607-469a-a614-b1ec611af077';
const fmt = n => `CAD $${Number(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(null);
  const navigate = useNavigate();
  const { sorted: sortedPatients, handleSort, SortIcon } = useSort(patients, 'last_visit','desc');


  useEffect(() => {
    loadPatients();
  }, [activeFilter]);

  const loadPatients = () => {
    setLoading(true);
    getPatients(TB_CLINIC, {
      search: search || undefined,
      is_active: activeFilter,
      limit: 100,
    }).then(res => setPatients(res.data))
      .finally(() => setLoading(false));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadPatients();
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: D.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        tr { transition: background 0.1s; cursor: pointer; }
        tr:hover td { background: #0F142088 !important; }
        input { font-family: 'DM Sans', sans-serif; }
        button { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: D.azure }} />
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: D.text }}>Patients</div>
          </div>
          <div style={{ fontSize: 11, color: D.muted }}>TouchBrain Counseling · {patients.length} patients</div>
        </div>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or phone..."
            style={{
              flex: 1, padding: '9px 14px',
              background: D.card, border: `1px solid ${D.border}`,
              borderRadius: 8, color: D.text, fontSize: 13, outline: 'none',
            }}
          />
          <button type="submit" style={{
            padding: '9px 18px', background: D.azure, color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>Search</button>
        </form>

        {/* Active filter */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'All', value: null },
            { label: 'Active', value: true },
            { label: 'Inactive', value: false },
          ].map(f => (
            <button key={String(f.value)} onClick={() => setActiveFilter(f.value)}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: `1px solid ${activeFilter === f.value ? D.azure : D.border}`,
                background: activeFilter === f.value ? D.azureDim : 'transparent',
                color: activeFilter === f.value ? D.azure : D.muted,
              }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: D.surface }}>
          {[
            { label: 'Patient', key: 'last_name' },
            { label: 'Phone', key: 'phone' },
            { label: 'City', key: 'city' },
            { label: 'First Visit', key: 'first_visit' },
            { label: 'Last Visit', key: 'last_visit' },
            { label: 'Sessions', key: 'total_sessions' },
            { label: 'Total Billed', key: 'total_cost' },
            { label: 'Status', key: 'is_active' },
          ].map(h => (
            <th key={h.label}
              onClick={() => handleSort(h.key)}
              style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
              {h.label}<SortIcon colKey={h.key} />
            </th>
          ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: D.muted }}>Loading...</td></tr>
            ) : patients.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: D.muted }}>No patients found</td></tr>
            ) : sortedPatients.map((p, i) => (
              <tr key={p.id} onClick={() => navigate(`/tb/patients/${p.id}`)}
                style={{ background: i % 2 === 0 ? 'transparent' : D.surface + '44' }}>
                <td style={{ padding: '11px 14px', borderBottom: `1px solid ${D.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${D.azure}, #9B7FFF)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0,
                    }}>
                      {p.first_name?.[0]}{p.last_name?.[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: D.text }}>
                        {p.first_name} {p.last_name}
                      </div>
                      {p.preferred_name && (
                        <div style={{ fontSize: 10, color: D.muted }}>"{p.preferred_name}"</div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: D.muted, borderBottom: `1px solid ${D.border}` }}>{p.phone || '—'}</td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: D.muted, borderBottom: `1px solid ${D.border}` }}>{p.city || '—'}</td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: D.muted, borderBottom: `1px solid ${D.border}` }}>{p.first_visit || '—'}</td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: D.muted, borderBottom: `1px solid ${D.border}` }}>{p.last_visit || '—'}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: D.azure, borderBottom: `1px solid ${D.border}` }}>{p.total_sessions}</td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: D.gold, fontWeight: 600, borderBottom: `1px solid ${D.border}` }}>{fmt(p.total_cost)}</td>
                <td style={{ padding: '11px 14px', borderBottom: `1px solid ${D.border}` }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                    color: p.is_active ? D.emerald : D.muted,
                    background: p.is_active ? D.emeraldDim : D.border + '44',
                    border: `1px solid ${p.is_active ? D.emerald + '33' : D.border}`,
                  }}>{p.is_active ? 'Active' : 'Inactive'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}