import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useSubmit } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { profilesRepository } from '../../repositories'

export const Verify = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isResending, setIsResending] = useState<boolean>(false);
  const [isAdding, setIsAdding] =  useState(true);
  const [name,setName] = useState("User");
  useEffect(() => {
    const handleVerification = async () => {
      try {
        console.log('Full URL:', window.location.href);
        
        // Check for error in hash first
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = hashParams.get('error');
        const errorCode = hashParams.get('error_code');
        const errorDescription = hashParams.get('error_description');
        
        if (error) {
          console.log('Error found in hash:', { error, errorCode, errorDescription });
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
        const tokenType = hashParams.get('type');
        
        console.log('Access Token:', accessToken ? 'Present' : 'Not found');
        console.log('Refresh Token:', refreshToken ? 'Present' : 'Not found');
        console.log('Token Type:', tokenType);

        if (accessToken && refreshToken) {
          // User has been successfully verified and we have tokens
          console.log('Tokens found in hash, setting session...');
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Error setting session:', error);
            setVerificationStatus('error');
            setErrorMessage(`Failed to set session: ${error.message}`);
          } else {
            console.log('Session set successfully:', data);
            setVerificationStatus('success');
            
            // Check current user
            const { data: user } = await supabase.auth.getUser();
            console.log('Current user after setting session:', user);

            const id = user.user?.id;
            
            // Clean up URL by removing hash
            window.history.replaceState({}, document.title, window.location.pathname);
            // try{
            //   const response  = await axios.get("http://localhost:8080/addUser",{headers:{'Authorization':`Bearer :${token}`}});
            // }catch{

            // }
            
            // Auto-redirect after 3 seconds
            // setTimeout(() => {
            //   navigate('/dashboard'); // or wherever you want to redirect verified users
            // }, 3000);
          }
          return;
        }

        // Fallback: Check for traditional query parameters (older verification links)
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        console.log('Query Token:', token);
        console.log('Query Type:', type);

        if (token && type === 'signup') {
          console.log('Attempting traditional OTP verification...');
          
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          });

          if (error) {
            console.error('Traditional verification error:', error);
            setVerificationStatus('error');
            setErrorMessage(`Verification failed: ${error.message}`);
          } else {
            console.log('Traditional verification successful:', data);
            setVerificationStatus('success');
            
            setTimeout(() => {
              navigate('/dashboard');
            }, 3000);
          }
          return;
        }

        // No verification tokens found
        console.log('No verification tokens found in URL');
        setVerificationStatus('error');
        setErrorMessage('No verification tokens found. Please check your email verification link.');

      } catch (err: any) {
        console.error('Unexpected error during verification:', err);
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
      console.log("Name Updated succesfully");
    }catch{
      console.log("eror adding the name");
    }
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

      const { error } = await supabase.auth.resend({
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
          <>
            <div>
              <form >
                  <p>Enter you name here:</p><br/>
                  <input value={name} onChange={e => setName(e.target.value)} /><br/>
                  <button onClick={handleAddName}></button>
              </form>
            </div>
          </>
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
