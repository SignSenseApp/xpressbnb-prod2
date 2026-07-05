import AppRouter from './AppRouter';
import AppErrorBoundary from './components/AppErrorBoundary';
import VercelWebAnalytics from './components/VercelWebAnalytics';

export default function App() {
  return (
    <AppErrorBoundary>
      <AppRouter />
      <VercelWebAnalytics />
    </AppErrorBoundary>
  );
}
