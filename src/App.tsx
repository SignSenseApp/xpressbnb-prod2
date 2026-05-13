import { Analytics } from '@vercel/analytics/react';
import AppRouter from './AppRouter';

export default function App() {
  return (
    <>
      <AppRouter />
      <Analytics />
    </>
  );
}
