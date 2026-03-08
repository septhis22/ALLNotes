import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Pages/Home/Home.tsx';
import Login from './Pages/Login/Login.tsx';
import SignUp from './Pages/SignUp/SignUp.tsx';
import Verify from './Pages/SignUp/verify.tsx';
import CollaborationPage from './Pages/CollaboratioPage/collaborationPage.tsx';
import { Profile } from './Pages/Profile/Profile.tsx';
import { AuthProvider } from './Context/AuthContext.tsx';
import ProtectedRoute from './auth/protectedRoute.tsx';
import { testSupabaseConnection } from './testSupabase.tsx';
import './App.css';

// Test component that runs the Supabase test
const TestPage = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Supabase Connection Test</h1>
      <p>Check browser console for test results...</p>
      <button 
        onClick={() => testSupabaseConnection()}
        style={{ padding: '10px 20px', cursor: 'pointer' }}
      >
        Run Test
      </button>
    </div>
  );
};

const routes = (
  <AuthProvider>
    <Router>
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/signup' element={<SignUp />} />
        <Route path='/test' element={<TestPage />} />

        <Route path='/' element={<ProtectedRoute redirectTo='/login'><Home /></ProtectedRoute>} />
        <Route path='/verify' element={<ProtectedRoute redirectTo='/login'><Verify /></ProtectedRoute>} />
        <Route path='/collab' element={<ProtectedRoute redirectTo='/login'><CollaborationPage /></ProtectedRoute>} />
        <Route path='/profile' element={<ProtectedRoute redirectTo='/login'><Profile /></ProtectedRoute>} />
      </Routes>
    </Router>
  </AuthProvider>
);

export const App = () => {
  return (
    <div>
      {routes}
    </div>
  );
};

export default App;
