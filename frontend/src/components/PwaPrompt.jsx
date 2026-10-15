import { useEffect, useState } from 'react';
import { Download, RefreshCw, WifiOff, X, Share } from 'lucide-react';

const safeGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

const bar = {
  position: 'fixed', left: 12, right: 12,
  bottom: 'calc(12px + env(safe-area-inset-bottom))',
  zIndex: 60, maxWidth: 440, margin: '0 auto',
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 12px', borderRadius: 12,
  background: '#1B2A41', color: '#fff',
  boxShadow: '0 8px 24px rgba(0,0,0,.25)', fontSize: 14,
};
const action = {
  background: '#C89B3C', color: '#1B2A41', border: 0, borderRadius: 8,
  padding: '8px 12px', fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40,
};
const close = { background: 'transparent', border: 0, color: '#fff', cursor: 'pointer', padding: 8, display: 'flex' };

export default function PwaPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [showIos, setShowIos] = useState(false);
  const [waiting, setWaiting] = useState(null);
  const [offline, setOffline] = useState(!navigator.onLine);

  // Service worker registration + update detection (production only)
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    let registration;
    const onVisible = () => { if (document.visibilityState === 'visible') registration?.update().catch(() => {}); };

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        registration = reg;
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          sw?.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) setWaiting(sw);
          });
        });
        document.addEventListener('visibilitychange', onVisible);
      })
      .catch((err) => console.warn('Service worker registration failed:', err));

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Install prompt
  useEffect(() => {
    if (isStandalone()) return;
    const onPrompt = (e) => {
      e.preventDefault();
      if (safeGet('pwa-install-dismissed') !== '1') setInstallEvent(e);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (isIos() && safeGet('pwa-ios-dismissed') !== '1') setShowIos(true);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Online / offline
  useEffect(() => {
    const up = () => setOffline(false);
    const down = () => setOffline(true);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice.catch(() => {});
    setInstallEvent(null);
  };

  if (waiting) {
    return (
      <div style={bar} role="status">
        <RefreshCw size={18} />
        <span style={{ flex: 1 }}>A new version is available.</span>
        <button style={action} onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}>Update</button>
      </div>
    );
  }

  if (offline) {
    return (
      <div style={{ ...bar, background: '#B5533C' }} role="status">
        <WifiOff size={18} />
        <span style={{ flex: 1 }}>You&apos;re offline. Some features need a connection.</span>
      </div>
    );
  }

  if (installEvent) {
    return (
      <div style={bar} role="dialog" aria-label="Install app">
        <Download size={18} />
        <span style={{ flex: 1 }}>Install APT Rent for quick access.</span>
        <button style={action} onClick={install}>Install</button>
        <button style={close} aria-label="Dismiss" onClick={() => { safeSet('pwa-install-dismissed', '1'); setInstallEvent(null); }}>
          <X size={16} />
        </button>
      </div>
    );
  }

  if (showIos) {
    return (
      <div style={bar} role="dialog" aria-label="Install app">
        <Share size={18} />
        <span style={{ flex: 1 }}>To install: tap <b>Share</b>, then <b>Add to Home Screen</b>.</span>
        <button style={close} aria-label="Dismiss" onClick={() => { safeSet('pwa-ios-dismissed', '1'); setShowIos(false); }}>
          <X size={16} />
        </button>
      </div>
    );
  }

  return null;
}