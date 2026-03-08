import { useEffect, useState } from 'react';
import Navbar from '../../component/Navbar/Navbar';
import { Link } from 'react-router-dom';
import PasswordInput from '../../component/Input/PasswordInput';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../Context/AuthContext';
import { syncNotes } from '../../utils/ConflictHandler';
import { useVerifyUser } from '../../utils/verifyUser';
import useUpdateProfile from '../../utils/useUserUpdateProfile';

export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

const Login = () => {
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { userId, setUserId } = useAuthContext();
  const verifyUser = useVerifyUser();

  // Check for existing valid token on component mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const verifiedUserId = await verifyUser();
        if (verifiedUserId && verifiedUserId !== "Guest") {
          console.log('Auto-login successful for user:', verifiedUserId);
          updateProfile();
        } else {
          console.log('No valid session found');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingAuth();
  }, [verifyUser, navigate]);


  const handleAutoLogin=()=>{
    syncNotes(userId,setIsLoading).then(()=>{
     navigate('/',{state:{user:userId}});
    });
  }


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError("Please fill in both fields.");
      return;
    }

    setIsAuthenticating(true);

    try {
      const { data, error } = await loginWithEmail(email, password);
      
      if (error) {
        console.log('Login error:', error);
        setError(error.message);
      } else if (data.user?.id) {
        setUserId(data.user.id);
        console.log('Manual login successful for user:', data.user.id);
        
        syncNotes(data.user.id, () => {
          setIsAuthenticating(false);
          navigate('/', { state: { user: data.user.id } });
        });
        return;
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Login error:", err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className='flex items-center justify-center mt-28'>
          <div className='w-96 border rounded bg-white px-7 py-10 text-center'>
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="ml-2">Checking authentication...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className='flex items-center justify-center mt-28'>
        <div className='w-96 border rounded bg-white px-7 py-10'>
          <form onSubmit={handleSubmit}>
            <h4 className="text-2xl mb-7">Login</h4>
            <input
              type="email"
              placeholder="Email"
              className="input-box w-full px-4 py-2 border rounded mb-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isAuthenticating}
            />
            <PasswordInput
              str={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              // disabled={isAuthenticating}
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button 
              type="submit" 
              className="btn-primary w-full mt-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isAuthenticating}
            >
              {isAuthenticating ? 'Logging in...' : 'Login'}
            </button>
            <p className="text-sm text-center mt-4">
              Not registered yet?{" "}
              <Link to="/SignUp" className="font-medium text-blue-500 underline">
                Create an Account
              </Link>
            </p>
          </form>
          <button 
              onClick={handleAutoLogin}
              className="w-full mt-3 py-2 bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200 hover:border-green-400 transition-colors duration-200 font-medium text-sm shadow-sm"
              disabled={isAuthenticating}
            >
              {`Continue as ${userId}`}
            </button>

        </div>
      </div>
    </>
  );
};

export default Login;