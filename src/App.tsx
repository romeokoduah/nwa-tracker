import { useEffect } from 'react';
import { Router } from './router';
import { startSync, stopSync } from './store/sync';

export function App() {
  useEffect(() => {
    startSync();
    return () => stopSync();
  }, []);

  return <Router />;
}
