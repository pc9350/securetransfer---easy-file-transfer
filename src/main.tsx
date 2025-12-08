import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Note: StrictMode is disabled because it causes issues with WebRTC connections.
// StrictMode in React 18 intentionally mounts, unmounts, and remounts components
// to help find bugs. However, this destroys the PeerJS connection on the first
// unmount, and our initialization guard prevents reconnection on remount.
// This is a known issue with side-effects like WebSocket/WebRTC connections in StrictMode.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <App />
  </BrowserRouter>
);

