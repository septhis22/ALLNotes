import React, { useState } from 'react'
import Navbar from '../../component/Navbar/Navbar';
import PasswordInput from '../../component/Input/PasswordInput';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'http://localhost:5173/verify', // after they confirm
    },
  });
  if (error) throw error;
  return data;
}

export const SignUp = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Fixed: was missing parentheses
    setError(null);
    setLoading(true);

    try {
      // Basic validation
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }
      
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      await signUpWithEmail(email, password);
      
      // Success - you might want to redirect or show success message
      alert('Please check your email to verify your account!');
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className='flex items-center justify-center mt-28'>
        <div className='w-96 border rounded bg-white px-7 py-10'>
          <form onSubmit={handleSubmit}>
            <h4 className="text-2xl mb-7">Register</h4>
            
            <input
              type="email" // Changed from "text" to "email"
              placeholder="Email"
              className="input-box w-full px-4 py-2 border rounded mb-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <PasswordInput
              str={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            
            <button 
              type="submit" 
              className="btn-primary w-full mt-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
            
            <p className="text-sm text-center mt-4">
              <Link to="/Login" className="font-medium text-blue-500 underline">
                Already have an account? Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  )
}

export default SignUp;