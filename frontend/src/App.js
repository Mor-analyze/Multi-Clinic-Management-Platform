import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Overview from './pages/Overview';
import ClinicOverview from './pages/ClinicOverview';
import Layout from './components/Layout';
import Patients from './pages/Patients';
import PatientProfile from './pages/PatientProfile';



const TB_CLINIC = 'd3417879-4607-469a-a614-b1ec611af077';
const ET_CLINIC = '0abf11de-ef88-4a3f-aba9-d0f0bd94dce1';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ background: '#07080F', minHeight: '100vh' }} />;
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
}

const ComingSoon = ({ label }) => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07080F' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: '#E8ECF8', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#4A5470' }}>Coming soon</div>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute><ComingSoon label="Clinic Comparison" /></ProtectedRoute>} />

          {/* Elite Touch */}
          <Route path="/et/overview" element={<ProtectedRoute><ClinicOverview clinicId={ET_CLINIC} clinicName="Elite Touch Wellness" color="#00C896" /></ProtectedRoute>} />
          <Route path="/et/services" element={<ProtectedRoute><ComingSoon label="Elite Touch — Services" /></ProtectedRoute>} />
          <Route path="/et/devices" element={<ProtectedRoute><ComingSoon label="Elite Touch — Devices" /></ProtectedRoute>} />
          <Route path="/et/materials" element={<ProtectedRoute><ComingSoon label="Elite Touch — Materials" /></ProtectedRoute>} />
          <Route path="/et/staff" element={<ProtectedRoute><ComingSoon label="Elite Touch — Staff" /></ProtectedRoute>} />
          <Route path="/et/products" element={<ProtectedRoute><ComingSoon label="Elite Touch — Products" /></ProtectedRoute>} />
          <Route path="/et/expenses" element={<ProtectedRoute><ComingSoon label="Elite Touch — Expenses" /></ProtectedRoute>} />

          {/* TouchBrain */}
          <Route path="/tb/overview" element={<ProtectedRoute><ClinicOverview clinicId={TB_CLINIC} clinicName="TouchBrain Counseling" color="#5B8FFF" /></ProtectedRoute>} />
          <Route path="/tb/services" element={<ProtectedRoute><ComingSoon label="TouchBrain — Services" /></ProtectedRoute>} />
          <Route path="/tb/devices" element={<ProtectedRoute><ComingSoon label="TouchBrain — Devices" /></ProtectedRoute>} />
          <Route path="/tb/materials" element={<ProtectedRoute><ComingSoon label="TouchBrain — Materials" /></ProtectedRoute>} />
          <Route path="/tb/staff" element={<ProtectedRoute><ComingSoon label="TouchBrain — Staff" /></ProtectedRoute>} />
          <Route path="/tb/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
          <Route path="/tb/expenses" element={<ProtectedRoute><ComingSoon label="TouchBrain — Expenses" /></ProtectedRoute>} />
          <Route path="/tb/import" element={<ProtectedRoute><ComingSoon label="Jane Import" /></ProtectedRoute>} />
          <Route path="/tb/patients/:id" element={<ProtectedRoute><PatientProfile /></ProtectedRoute>} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;