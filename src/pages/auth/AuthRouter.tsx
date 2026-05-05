import { useEffect, useState } from 'react';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';

type AuthPage = 'login' | 'register' | 'forgot' | 'reset-password';

interface AuthRouterProps {
  onClose?: () => void;
}

/**
 * AuthRouter is a tiny URL-aware router for the /auth/* segment.
 * Picks the initial sub-page from the path so links from emails (recovery flow)
 * land on the correct screen, then keeps internal navigation in component state.
 */
export default function AuthRouter(_props: AuthRouterProps) {
  const initialPage = (): AuthPage => {
    if (typeof window === 'undefined') return 'login';
    const p = window.location.pathname;
    if (p.startsWith('/auth/register')) return 'register';
    if (p.startsWith('/auth/forgot')) return 'forgot';
    if (p.startsWith('/auth/reset-password')) return 'reset-password';
    return 'login';
  };

  const [currentPage, setCurrentPage] = useState<AuthPage>(initialPage);

  // Keep URL in sync when user navigates between auth screens.
  const navigate = (page: AuthPage) => {
    setCurrentPage(page);
    const target =
      page === 'login'
        ? '/auth/login'
        : page === 'register'
        ? '/auth/register'
        : page === 'forgot'
        ? '/auth/forgot'
        : '/auth/reset-password';
    if (typeof window !== 'undefined' && window.location.pathname !== target) {
      window.history.replaceState({}, '', target);
    }
  };

  // Handle back/forward inside /auth without remounting host AppRouter.
  useEffect(() => {
    const onPop = () => setCurrentPage(initialPage());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <>
      {currentPage === 'login' && <LoginPage onNavigate={navigate} />}
      {currentPage === 'register' && <RegisterPage onNavigate={navigate} />}
      {currentPage === 'forgot' && <ForgotPasswordPage onNavigate={navigate} />}
      {currentPage === 'reset-password' && <ResetPasswordPage onNavigate={navigate} />}
    </>
  );
}
