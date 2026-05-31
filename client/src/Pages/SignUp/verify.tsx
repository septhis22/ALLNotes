import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabase } from '../../lib/supabase'
import { profilesRepository } from '../../repositories'

export const Verify = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isResending, setIsResending] = useState<boolean>(false);
  const [name,setName] = useState("User");
  useEffect(() => {
    const handleVerification = async () => {
      try {
        // Check for error in hash first
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = hashParams.get('error');
        const errorCode = hashParams.get('error_code');
        const errorDescription = hashParams.get('error_description');

        if (error) {
          setVerificationStatus('error');

          if (errorCode === 'otp_expired') {
            setErrorMessage('Your verification link has expired. Please request a new verification email.');
          } else if (errorCode === 'access_denied') {
            setErrorMessage('Access denied. The verification link may be invalid or already used.');
          } else {
            setErrorMessage(errorDescription ? decodeURIComponent(errorDescription) : 'Verification failed');
          }
          return;
        }

        // Check if we have tokens in the hash (successful verification)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await getSupabase().auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            setVerificationStatus('error');
            setErrorMessage(`Failed to set session: ${error.message}`);
          } else {
            setVerificationStatus('success');

            // Check current user
            const { data: userData } = await getSupabase().auth.getUser();

            const user = userData.user;
            if (user) {
              // Ensure profile row exists immediately
              try {
                await profilesRepository.addOrUpdateName("User");
              } catch (profileErr) {}
            }

            // Clean up URL by removing hash
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          return;
        }

        // Fallback: Check for traditional query parameters (older verification links)
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (token && type === 'signup') {
          const { error } = await getSupabase().auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          });

          if (error) {
            setVerificationStatus('error');
            setErrorMessage(`Verification failed: ${error.message}`);
          } else {
            setVerificationStatus('success');

            setTimeout(() => {
              navigate('/dashboard');
            }, 3000);
          }
          return;
        }

        setVerificationStatus('error');
        setErrorMessage('No verification tokens found. Please check your email verification link.');
      } catch (err: any) {
        setVerificationStatus('error');
        setErrorMessage(`An unexpected error occurred: ${err.message || 'Unknown error'}`);
      }
    };

    handleVerification();
  }, [searchParams, navigate]);

  const handleLoginClick = () => {
    navigate('/login');
  }

  const handleAddName= async ()=>{
    try{
      await profilesRepository.addOrUpdateName(name);
    }catch{}
  }

  const handleResendClick = async () => {
    setIsResending(true);
    try {
      // You'll need to implement this based on how you store the user's email
      // Option 1: If you have the email in localStorage or state
      const email = localStorage.getItem('pendingVerificationEmail');
      
      if (!email) {
        alert('Email not found. Please sign up again.');
        navigate('/signup');
        return;
      }

      const { error } = await getSupabase().auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        alert(`Failed to resend verification email: ${error.message}`);
      } else {
        alert('Verification email sent! Please check your inbox.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        {verificationStatus === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Verifying your email...</h2>
            <p className="text-gray-600">Please wait while we verify your account.</p>
          </>
        )}

        {verificationStatus === 'success' && (
          <div className="space-y-6">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-green-600">Email Verified!</h2>
            <p className="text-gray-600">Please complete your profile to continue.</p>
            
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your name:
              </label>
              <input 
                type="text"
                value={name} 
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your Name"
              />
              <button 
                type="button"
                onClick={async () => {
                  await handleAddName();
                  navigate('/');
                }}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Complete Profile
              </button>
            </div>
          </div>
        )}

        {verificationStatus === 'error' && (
          <>
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <h2 className="text-xl font-semibold text-red-600 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-4 text-sm break-words">{errorMessage}</p>
            <div className="space-y-2">
              <button
                onClick={handleLoginClick}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors w-full"
              >
                Go to Login
              </button>
              <button
                onClick={handleResendClick}
                disabled={isResending}
                className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-2 px-6 rounded-lg transition-colors w-full"
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors w-full"
              >
                Back to Sign Up
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
};

export default Verify;
