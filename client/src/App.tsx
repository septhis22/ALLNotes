import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Pages/Home/Home.tsx';
import Login from './Pages/Login/Login.tsx';
import SignUp from './Pages/SignUp/SignUp.tsx';
import Verify from './Pages/SignUp/verify.tsx';
import CollaborationPage from './Pages/CollaboratioPage/collaborationPage.tsx';
import { AuthProvider } from './Context/AuthContext.tsx';
import ProtectedRoute from './auth/protectedRoute.tsx';
// import MyEditor from './Editor/blockNote.tsx';
import './App.css';

const routes = (
  <AuthProvider>
    <Router>
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/signup' element={<SignUp />} />
        <Route path='/shared' element ={<CollaborationPage/>} />
        <Route path='/' element={<ProtectedRoute redirectTo='/login'><Home /></ProtectedRoute>} />
        <Route path='/verify' element={<ProtectedRoute redirectTo='/login'><Verify /></ProtectedRoute>} />
        <Route path='/collab' element={<ProtectedRoute redirectTo='/login'><CollaborationPage /></ProtectedRoute>} />
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
