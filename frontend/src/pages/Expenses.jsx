import { useState, useEffect } from 'react';
import { getExpenses, getExpenseSummary, getSubcategories, createExpense } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useSort } from '../hooks/useSort';
import api from '../services/api';


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
const fmt = n => `CAD $${Number(n || 0).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const catColor = c => c === 'fixed' ? D.azure : c === 'operations' ? D.emerald : D.gold;
const catDim = c => c === 'fixed' ? D.azureDim : c === 'operations' ? D.emeraldDim : D.goldDim;
const catLabel = c => c === 'fixed' ? 'Fixed' : c === 'operations' ? 'Operations' : 'Office & Admin';

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

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const { isAdmin } = useAuth();
  const [importing, setImporting] = useState(false);
  const handleExcelImport = async (e) => {
    
  const file = e.target.files[0];
  if (!file) return;
  setImporting(true);
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(
      `/expenses/import?clinic_id=${TB_CLINIC}&branch_id=${TB_BRANCH}`,
      formData
    );
    alert(`Import complete!\nCreated: ${res.data.created}\nSkipped: ${res.data.skipped}${res.data.errors.length > 0 ? '\nErrors: ' + res.data.errors.join(', ') : ''}`);
    loadData();
  } catch (err) {
    alert('Import failed: ' + err.response?.data?.detail);
  } finally {
    setImporting(false);
    e.target.value = '';
  }
};

  const [form, setForm] = useState({
    subcategory_id: '', amount: '', description: '',
    expense_date: new Date().toISOString().slice(0, 10),
    reference_num: '',
  });

  const { sorted, handleSort, SortIcon } = useSort(expenses, 'expense_date', 'desc');

  useEffect(() => { loadData(); }, [categoryFilter]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getExpenses(TB_CLINIC, { category: categoryFilter || undefined, limit: 100 }),
      getExpenseSummary(TB_CLINIC),
      getSubcategories(TB_CLINIC),
    ]).then(([exp, sum, subs]) => {
      setExpenses(exp.data);
      setSummary(sum.data);
      setSubcategories(subs.data);
    }).finally(() => setLoading(false));
  };

  const handleAdd = async () => {
    try {
      await createExpense({
        clinic_id: TB_CLINIC,
        branch_id: TB_BRANCH,
        subcategory_id: form.subcategory_id,
        amount: parseFloat(form.amount),
        description: form.description || undefined,
        expense_date: form.expense_date,
        reference_num: form.reference_num || undefined,
      });
      setShowAdd(false);
      setForm({ subcategory_id: '', amount: '', description: '', expense_date: new Date().toISOString().slice(0, 10), reference_num: '' });
      loadData();
    } catch (err) {
      if (err.response?.status === 409) {
        const detail = err.response.data.detail;
        alert(`Duplicate reference number!\nAlready recorded on ${detail.existing_expense?.date} for ${detail.existing_expense?.amount}`);
      } else {
        alert('Error: ' + err.response?.data?.detail);
      }
    }
  };

  // Group subcategories by category
  const subsByCategory = subcategories.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: D.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select, button { font-family: 'DM Sans', sans-serif; }
        tr { transition: background 0.1s; }
        tr:hover td { background: #0F142088 !important; }
        th { cursor: pointer; user-select: none; }
        th:hover { color: #E8ECF8 !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: D.azure }} />
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: D.text }}>Expenses</div>
          </div>
          <div style={{ fontSize: 11, color: D.muted }}>TouchBrain Counseling · {expenses.length} records</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ padding: '9px 16px', background: D.surface, border: `1px solid ${D.border}`, color: importing ? D.muted : D.text, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: importing ? 'default' : 'pointer', display: 'inline-block' }}>
            {importing ? 'Importing...' : '↑ Import Excel'}
            <input type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleExcelImport} disabled={importing} />
          </label>
          <button onClick={() => setShowAdd(true)} style={{ padding: '9px 18px', background: D.azure, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            + Add Expense
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Expenses', value: fmt(summary?.total), color: D.coral, dim: D.coralDim },
          { label: 'Fixed', value: fmt(summary?.fixed), color: D.azure, dim: D.azureDim },
          { label: 'Operations', value: fmt(summary?.operations), color: D.emerald, dim: D.emeraldDim },
          { label: 'Office & Admin', value: fmt(summary?.office), color: D.gold, dim: D.goldDim },
        ].map((k, i) => (
          <div key={i} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden', cursor: i > 0 ? 'pointer' : 'default' }}
            onClick={() => i > 0 && setCategoryFilter(categoryFilter === ['fixed','operations','office'][i-1] ? null : ['fixed','operations','office'][i-1])}>
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at top left, ${k.dim}, transparent 65%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${k.color}88, transparent)` }} />
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: D.muted, textTransform: 'uppercase', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: D.text, fontFamily: "'Syne', sans-serif" }}>{k.value}</div>
            {i > 0 && <div style={{ fontSize: 10, color: k.color, marginTop: 4 }}>Click to filter</div>}
          </div>
        ))}
      </div>

      {/* Active filter indicator */}
      {categoryFilter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: D.muted }}>Filtered by:</span>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, color: catColor(categoryFilter), background: catDim(categoryFilter), border: `1px solid ${catColor(categoryFilter)}33` }}>
            {catLabel(categoryFilter)}
          </span>
          <button onClick={() => setCategoryFilter(null)} style={{ fontSize: 11, color: D.muted, background: 'none', border: 'none', cursor: 'pointer' }}>✕ Clear</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: D.surface }}>
              {[
                { label: 'Date', key: 'expense_date' },
                { label: 'Category', key: 'category' },
                { label: 'Subcategory', key: 'subcategory' },
                { label: 'Amount', key: 'amount' },
                { label: 'Description', key: 'description' },
                { label: 'Reference #', key: 'reference_num' },
              ].map(h => (
                <th key={h.label} onClick={() => handleSort(h.key)}
                  style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${D.border}`, whiteSpace: 'nowrap' }}>
                  {h.label}<SortIcon colKey={h.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: D.muted }}>Loading...</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: D.muted }}>No expenses found</td></tr>
            ) : sorted.map((e, i) => (
              <tr key={e.id} style={{ background: i % 2 === 0 ? 'transparent' : D.surface + '44' }}>
                <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: `1px solid ${D.border}`, fontWeight: 600 }}>{e.expense_date}</td>
                <td style={{ padding: '10px 14px', borderBottom: `1px solid ${D.border}` }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, color: catColor(e.category), background: catDim(e.category), border: `1px solid ${catColor(e.category)}33` }}>
                    {catLabel(e.category)}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: `1px solid ${D.border}`, color: D.muted }}>{e.subcategory}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: `1px solid ${D.border}`, fontWeight: 700, color: D.coral }}>{fmt(e.amount)}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: `1px solid ${D.border}`, color: D.muted, maxWidth: 250 }}>{e.description || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 11, borderBottom: `1px solid ${D.border}`, color: D.gold, fontFamily: 'monospace' }}>{e.reference_num || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      {showAdd && (
        <Modal title="Add Expense" onClose={() => setShowAdd(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Date *">
              <input type="date" style={inputStyle} value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
            </Field>
            <Field label="Amount (CAD) *">
              <input type="number" style={inputStyle} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </Field>
          </div>

          <Field label="Category & Subcategory *">
            <select style={inputStyle} value={form.subcategory_id} onChange={e => setForm({ ...form, subcategory_id: e.target.value })}>
              <option value="">Select subcategory...</option>
              {Object.entries(subsByCategory).map(([cat, subs]) => (
                <optgroup key={cat} label={catLabel(cat)}>
                  {subs.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          <Field label="Description">
            <input style={inputStyle} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What was this expense for?" />
          </Field>

          <Field label="Reference # (receipt or bank ref)">
            <input style={inputStyle} value={form.reference_num} onChange={e => setForm({ ...form, reference_num: e.target.value })} placeholder="REF-2026-001" />
          </Field>

          <div style={{ background: D.azureDim, border: `1px solid ${D.azure}33`, borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 11, color: D.muted }}>
            💡 Reference number prevents duplicate entries. Use receipt number or bank reference.
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: '9px 18px', background: 'none', border: `1px solid ${D.border}`, borderRadius: 8, color: D.muted, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleAdd} disabled={!form.subcategory_id || !form.amount}
              style={{ padding: '9px 18px', background: !form.subcategory_id || !form.amount ? D.border : D.azure, color: !form.subcategory_id || !form.amount ? D.muted : '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: !form.subcategory_id || !form.amount ? 'default' : 'pointer' }}>
              Save Expense
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}