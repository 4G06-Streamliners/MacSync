import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/login' });

  useEffect(() => {
    // Handle auth query parameter for cross-portal login
    const authToken = (searchParams as any)?.auth;
    if (authToken && !user) {
      // Decode and extract email from token
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        if (payload.user?.email) {
          handleAutoLogin(payload.user.email);
        }
      } catch (error) {
        console.error('Failed to decode auth token:', error);
      }
    }
  }, [searchParams, user]);

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      navigate({ to: '/' });
    }
  }, [user, navigate]);

  const handleAutoLogin = async (userEmail: string) => {
    setIsLoading(true);
    setError('');

    try {
      const success = await login(userEmail);
      if (success) {
        navigate({ to: '/' });
      } else {
        setError('Auto-login failed. Please try logging in manually.');
      }
    } catch (error) {
      setError('Auto-login failed. Please try logging in manually.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const success = await login(email.trim());
      if (success) {
        navigate({ to: '/' });
      } else {
        setError('Login failed. Please check your email and try again.');
      }
    } catch (error) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-bg-gray-light p-5">
      <div className="card max-w-md rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Team D User Portal
          </h1>
          <p className="text-text-gray text-base">
            Sign in to access your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="input-primary"
            />
          </div>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-bg-gray-lighter rounded-md text-sm text-text-gray">
          <p className="m-0 text-center">
            <strong>Team D User Services</strong><br />
            Large event user support and coordination
          </p>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/login')({
  component: LoginPageContent,
});
