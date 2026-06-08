import { useState } from 'react';
import { importPatients, importSessions, importInvoices } from '../services/api';

const D = {
  bg: '#07080F', surface: '#0B0E17', card: '#0F1420',
  border: '#1A2035', text: '#E8ECF8', muted: '#4A5470',
  emerald: '#00C896', emeraldDim: '#00C89615',
  gold: '#FFB020', goldDim: '#FFB02015',
  coral: '#FF5C7A', coralDim: '#FF5C7A15',
  azure: '#5B8FFF', azureDim: '#5B8FFF15',
};

const TB_CLINIC = 'd3417879-4607-469a-a614-b1ec611af077';
const TB_BRANCH = '3338ff68-9a30-4ebf-9a09-31225e3dda36';

const IMPORT_TYPES = [
  {
    id: 'patients',
    label: 'Clients',
    icon: '○',
    desc: 'Import patient profiles from Jane',
    file: 'clients.csv',
    color: D.azure,
    dim: D.azureDim,
    fn: (file) => importPatients(TB_CLINIC, TB_BRANCH, file),
  },
  {
    id: 'sessions',
    label: 'Sessions',
    icon: '◷',
    desc: 'Import arrived sessions from Jane',
    file: 'arrived_sessions.csv',
    color: D.emerald,
    dim: D.emeraldDim,
    fn: (file) => importSessions(TB_CLINIC, TB_BRANCH, file),
  },
  {
    id: 'invoices',
    label: 'Sales / Invoices',
    icon: '◈',
    desc: 'Import sales and invoice data from Jane',
    file: 'Sales_jan_to_may.csv',
    color: D.gold,
    dim: D.goldDim,
    fn: (file) => importInvoices(TB_CLINIC, TB_BRANCH, file),
  },
];

function ImportCard({ type }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!file) return;
    setStatus('loading');
    setResult(null);
    try {
      const res = await type.fn(file);
      setResult(res.data.result);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setResult({ error: err.response?.data?.detail || 'Import failed' });
    }
  };

  return (
    <div style={{
      background: D.card, border: `1px solid ${D.border}`,
      borderRadius: 12, padding: '22px 24px',
      borderTop: `2px solid ${type.color}`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: type.dim, border: `1px solid ${type.color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: type.color,
        }}>{type.icon}</div>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: D.text }}>{type.label}</div>
          <div style={{ fontSize: 11, color: D.muted }}>{type.desc}</div>
        </div>
      </div>

      {/* Expected file */}
      <div style={{ fontSize: 11, color: D.muted, background: D.surface, borderRadius: 6, padding: '6px 10px', marginBottom: 14 }}>
        Expected file: <span style={{ color: type.color, fontWeight: 600 }}>{type.file}</span>
      </div>

      {/* File picker */}
      <div style={{ marginBottom: 14 }}>
        <label style={{
          display: 'block', width: '100%', padding: '10px 14px',
          background: D.surface, border: `1px dashed ${file ? type.color : D.border}`,
          borderRadius: 8, cursor: 'pointer', textAlign: 'center',
          fontSize: 12, color: file ? type.color : D.muted,
          transition: 'all 0.15s',
        }}>
          {file ? `✓ ${file.name}` : 'Click to select CSV file'}
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={e => { setFile(e.target.files[0]); setStatus(null); setResult(null); }}
          />
        </label>
      </div>

      {/* Import button */}
      <button
        onClick={handleImport}
        disabled={!file || status === 'loading'}
        style={{
          width: '100%', padding: '10px',
          background: !file || status === 'loading' ? D.border : type.color,
          color: !file || status === 'loading' ? D.muted : '#000',
          border: 'none', borderRadius: 8,
          fontSize: 13, fontWeight: 700,
          cursor: !file || status === 'loading' ? 'default' : 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {status === 'loading' ? 'Importing...' : `Import ${type.label}`}
      </button>

      {/* Result */}
      {result && (
        <div style={{
          marginTop: 12, padding: '12px 14px', borderRadius: 8,
          background: status === 'success' ? D.emeraldDim : D.coralDim,
          border: `1px solid ${status === 'success' ? D.emerald + '33' : D.coral + '33'}`,
        }}>
          {status === 'success' ? (
            <div style={{ fontSize: 12, color: D.text, lineHeight: 1.8 }}>
              ✓ Import complete<br />
              {result.created !== undefined && <span style={{ color: D.emerald }}>Created: {result.created}<br /></span>}
              {result.updated !== undefined && <span style={{ color: D.gold }}>Updated: {result.updated}<br /></span>}
              {result.skipped !== undefined && <span style={{ color: D.muted }}>Skipped: {result.skipped}<br /></span>}
              {result.errors?.length > 0 && <span style={{ color: D.coral }}>Errors: {result.errors.length}</span>}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: D.coral }}>✗ {result.error}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function JaneImport() {
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: D.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button, input { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: D.text, marginBottom: 4 }}>
          Jane Import
        </div>
        <div style={{ fontSize: 11, color: D.muted }}>TouchBrain Counseling · Upload CSV exports from Jane App</div>
      </div>

      {/* Instructions */}
      <div style={{
        background: D.azureDim, border: `1px solid ${D.azure}33`,
        borderRadius: 12, padding: '16px 20px', marginBottom: 20,
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ</span>
        <div style={{ fontSize: 12, color: D.text, lineHeight: 1.8 }}>
          <strong>How to export from Jane:</strong><br />
          1. Go to Jane App → Reports<br />
          2. Export <strong>Clients</strong> → upload as Clients below<br />
          3. Export <strong>Arrived Appointments</strong> → upload as Sessions<br />
          4. Export <strong>Sales</strong> → upload as Sales / Invoices<br />
          <span style={{ color: D.muted }}>Re-importing is safe — existing records will be updated, not duplicated.</span>
        </div>
      </div>

      {/* Import cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {IMPORT_TYPES.map(type => (
          <ImportCard key={type.id} type={type} />
        ))}
      </div>
    </div>
  );
}