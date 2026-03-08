import React, { useState } from 'react';
import Navbar from '../../component/Navbar/Navbar';
import { data, Link } from 'react-router-dom';
import PasswordInput from '../../component/Input/PasswordInput';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';


interface LoginInCollabProps {
    setUserId: React.Dispatch<React.SetStateAction<string>>;
  }
  

export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  console.log(data);
  return {data,error};
}



const LoginInCollab: React.FC<LoginInCollabProps> = ({ setUserId }) => {
 
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    console.log("Email:", email);
    console.log("Password:", password);

   
    // Example: simple validation
    if (!email || !password) {
      setError("Please fill in both fields.");
      return;
    }
    loginWithEmail(email, password).then(({ data, error }) => {
      if (error) {
        console.log(error);
        setError(error.message);
      } else {
        setError(null);
        console.log(data.user?.id);
        if (data.user?.id) {
          setUserId(data.user.id);
        }
          }
    });
  };

  return (
    <>
      <Navbar />
      <div className='flex items-center justify-center mt-28'>
        <div className='w-96 border rounded bg-white px-7 py-10'>
          <form onSubmit={handleSubmit}>
            <h4 className="text-2xl mb-7">Login</h4>
            <input
              type="text"
              placeholder="Email"
              className="input-box w-full px-4 py-2 border rounded mb-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <PasswordInput 
              str={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Password"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button type="submit" className="btn-primary w-full mt-4 py-2 bg-blue-500 text-white rounded">
              Login
            </button>
            <p className="text-sm text-center mt-4">
              Not registered yet?{" "}
              <Link to="/SignUp" className="font-medium text-blue-500 underline">
                Create an Account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
};

export default LoginInCollab;