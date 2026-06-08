import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiLogin(email, password);
      login(res.data, res.data.access_token);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07080F',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input { font-family: 'DM Sans', sans-serif; }
        button { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div style={{
        background: '#0F1420',
        border: '1px solid #1E2535',
        borderRadius: 16,
        padding: '40px 44px',
        width: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #00C896, #4D9FFF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, margin: '0 auto 12px',
          }}>✦</div>
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 22, fontWeight: 800, color: '#E8ECF8',
          }}>
            ClinicHub<span style={{ color: '#00C896' }}>.</span>
          </div>
          <div style={{ fontSize: 12, color: '#4A5470', marginTop: 4 }}>
            Sign in to your account
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 600,
              color: '#4A5470', textTransform: 'uppercase',
              letterSpacing: 1, marginBottom: 6,
            }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              style={{
                width: '100%', padding: '10px 14px',
                background: '#07080F', border: '1px solid #1E2535',
                borderRadius: 8, color: '#E8ECF8', fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 600,
              color: '#4A5470', textTransform: 'uppercase',
              letterSpacing: 1, marginBottom: 6,
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 14px',
                background: '#07080F', border: '1px solid #1E2535',
                borderRadius: 8, color: '#E8ECF8', fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#FF5C7A18', border: '1px solid #FF5C7A44',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 12, color: '#FF5C7A', marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px',
              background: loading ? '#1E2535' : '#00C896',
              color: loading ? '#4A5470' : '#000',
              border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 700,
              cursor: loading ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}