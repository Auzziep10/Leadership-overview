import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../services/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

export function Login() {
  const { user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);
    
    try {
      if (isForgotPassword) {
        await sendPasswordResetEmail(auth, email);
        setSuccessMessage('Password reset email has been sent! Check your inbox.');
      } else if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create user doc
        await setDoc(doc(db, "users", user.uid), {
          name,
          email,
          role: 'staff',
          initials: name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authenticate');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '100vh' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '400px', border: '1px solid var(--color-zinc-200)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', marginBottom: '8px', textAlign: 'center' }}>
          {isForgotPassword ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account')}
        </h1>
        <p style={{ color: 'var(--color-zinc-500)', fontSize: '13px', textAlign: 'center', marginBottom: '32px' }}>
          {isForgotPassword ? 'Enter your email address to receive a password reset link.' : 'Leadership Overview Print Shop OS'}
        </p>

        {error && <div style={{ color: 'red', fontSize: '12px', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
        {successMessage && <div style={{ color: 'green', fontSize: '13px', marginBottom: '16px', textAlign: 'center', fontWeight: 500 }}>{successMessage}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin && !isForgotPassword && (
            <input 
              type="text" 
              placeholder="Full Name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required
              style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }}
            />
          )}
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
            style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }}
          />
          {!isForgotPassword && (
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--color-zinc-200)', borderRadius: '8px', outline: 'none' }}
            />
          )}
          <button type="submit" className="auth-button" style={{ marginTop: '8px', padding: '14px' }} disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : (isForgotPassword ? 'Send Reset Link' : (isLogin ? 'Sign In' : 'Sign Up'))}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isForgotPassword ? (
            <button 
              type="button" 
              onClick={() => {
                setIsForgotPassword(false);
                setError('');
                setSuccessMessage('');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--color-zinc-600)', cursor: 'pointer', fontWeight: 500 }}
            >
              Back to Sign In
            </button>
          ) : (
            <>
              {isLogin && (
                <button 
                  type="button" 
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError('');
                    setSuccessMessage('');
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-zinc-500)', cursor: 'pointer', fontWeight: 500 }}
                >
                  Forgot Password?
                </button>
              )}
              <button 
                type="button" 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccessMessage('');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--color-zinc-600)', cursor: 'pointer', fontWeight: 500 }}
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
