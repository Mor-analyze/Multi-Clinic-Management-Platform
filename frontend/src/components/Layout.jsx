import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const D = {
  bg: '#07080F', surface: '#0B0E17', card: '#0F1420',
  border: '#1A2035', text: '#E8ECF8', muted: '#4A5470',
  emerald: '#00C896', azure: '#5B8FFF',
};

const NAV = [
  { group: 'Owner View', color: null, items: [
    { id: 'overview', label: 'Combined Overview', icon: '⊞', path: '/' },
    { id: 'finance', label: 'Finance', icon: '◈', path: '/finance' },
    { id: 'compare', label: 'Clinic Comparison', icon: '◈', path: '/compare' },
  ]},
  { group: 'Elite Touch Wellness', color: '#00C896', items: [
    { id: 'et-overview', label: 'Overview', icon: '◉', path: '/et/overview' },
    { id: 'et-services', label: 'Services', icon: '✦', path: '/et/services' },
    { id: 'et-devices', label: 'Devices', icon: '⬡', path: '/et/devices' },
    { id: 'et-materials', label: 'Materials', icon: '◆', path: '/et/materials' },
    { id: 'et-staff', label: 'Staff', icon: '◎', path: '/et/staff' },
    { id: 'et-products', label: 'Products', icon: '◇', path: '/et/products' },
    { id: 'et-expenses', label: 'Expenses', icon: '◌', path: '/et/expenses' },
  ]},
  { group: 'TouchBrain Counseling', color: '#5B8FFF', items: [
    { id: 'tb-overview', label: 'Overview', icon: '◉', path: '/tb/overview' },
    { id: 'tb-services', label: 'Services', icon: '✦', path: '/tb/services' },
    { id: 'tb-devices', label: 'Devices', icon: '⬡', path: '/tb/devices' },
    { id: 'tb-materials', label: 'Materials', icon: '◆', path: '/tb/materials' },
    { id: 'tb-staff', label: 'Staff', icon: '◎', path: '/tb/staff' },
    { id: 'tb-patients', label: 'Patients', icon: '○', path: '/tb/patients' },
    { id: 'tb-expenses', label: 'Expenses', icon: '◌', path: '/tb/expenses' },
    { id: 'tb-import', label: 'Jane Import', icon: '↓', path: '/tb/import' },
    { id: 'tb-demographics', label: 'Demographics', icon: '◑', path: '/tb/demographics' },
  ]},
];

const RECEPT_NAV = [
  { group: 'Daily Work', color: '#5B8FFF', items: [
    { id: 'tb-patients', label: 'Patients', icon: '○', path: '/tb/patients' },
  ]},
  { group: 'Reference', color: null, items: [
    { id: 'tb-inventory', label: 'Inventory', icon: '▣', path: '/tb/inventory' },
  ]},
];

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = isAdmin ? NAV : RECEPT_NAV;

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: D.bg, color: D.text,
      fontFamily: "'DM Sans', sans-serif",
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nb { cursor: pointer; border-radius: 7px; transition: all 0.15s; display: flex; align-items: center; gap: 9px; padding: 7px 10px; color: ${D.muted}; white-space: nowrap; overflow: hidden; border: none; background: none; width: 100%; font-family: 'DM Sans', sans-serif; font-size: 12px; text-align: left; }
        .nb:hover { background: ${D.border}; color: ${D.text}; }
        .nb.active { background: #1E253522; color: ${D.text}; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: ${D.border}; }
      `}</style>

      {/* Sidebar */}
      <div style={{
        width: collapsed ? 50 : 210,
        background: D.surface,
        borderRight: `1px solid ${D.border}`,
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease',
        flexShrink: 0, overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '16px 10px' : '16px 14px',
          borderBottom: `1px solid ${D.border}`,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: `linear-gradient(135deg, ${D.emerald}, ${D.azure})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#000', fontSize: 11, fontWeight: 800, flexShrink: 0,
          }}>✦</div>
          {!collapsed && (
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 800 }}>
              ClinicHub<span style={{ color: D.emerald }}>.</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 6px' }}>
          {nav.map(g => (
            <div key={g.group} style={{ marginBottom: 16 }}>
              {!collapsed && (
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 2,
                  color: g.color || '#2E3548',
                  textTransform: 'uppercase', padding: '0 6px', marginBottom: 4,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  {g.color && (
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: g.color, display: 'inline-block',
                    }} />
                  )}
                  {g.group}
                </div>
              )}
              {g.items.map(n => {
                const active = location.pathname === n.path;
                const groupColor = g.color || D.emerald;
                return (
                  <button
                    key={n.id}
                    className={`nb ${active ? 'active' : ''}`}
                    onClick={() => navigate(n.path)}
                    style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                  >
                    <span style={{
                      fontSize: 12, flexShrink: 0,
                      color: active ? groupColor : D.muted,
                    }}>{n.icon}</span>
                    {!collapsed && (
                      <span style={{
                        fontWeight: active ? 600 : 400,
                        color: active ? D.text : D.muted,
                      }}>{n.label}</span>
                    )}
                    {!collapsed && active && (
                      <span style={{
                        marginLeft: 'auto', width: 4, height: 4,
                        borderRadius: '50%', background: groupColor, flexShrink: 0,
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* User */}
        <div style={{ padding: collapsed ? '10px' : '10px 12px', borderTop: `1px solid ${D.border}` }}>
          {!collapsed && user && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: D.text }}>{user.full_name}</div>
              <div style={{ fontSize: 10, color: D.muted, textTransform: 'capitalize' }}>{user.role}</div>
            </div>
          )}
          <button onClick={() => { logout(); navigate('/login'); }} style={{
            width: '100%', padding: '6px 8px',
            background: 'none', border: `1px solid ${D.border}`,
            borderRadius: 6, color: D.muted, fontSize: 11,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start', gap: 6,
          }}>
            <span>⏻</span>
            {!collapsed && 'Sign Out'}
          </button>
        </div>

        <button onClick={() => setCollapsed(!collapsed)} style={{
          padding: '10px', borderTop: `1px solid ${D.border}`,
          color: D.muted, background: 'none', border: 'none',
          fontSize: 10, cursor: 'pointer',
          display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end',
          paddingRight: collapsed ? undefined : 14,
        }}>
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}