import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Layout } from './components/layout/Layout';
import { LoadingSpinner } from './components/shared/LoadingSpinner';

// Lazy load pages for code splitting
const Landing = lazy(() => import('./pages/Landing'));
const Receive = lazy(() => import('./pages/Receive'));
const Send = lazy(() => import('./pages/Send'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Security = lazy(() => import('./pages/Security'));
const Help = lazy(() => import('./pages/Help'));

function App() {
  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/receive" element={<Receive />} />
          <Route path="/send" element={<Send />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/security" element={<Security />} />
          <Route path="/help" element={<Help />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;

