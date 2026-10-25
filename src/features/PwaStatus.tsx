import { useEffect, useState } from 'react';
import { ArrowUpRight, Download } from 'lucide-react';
import { Modal } from '../components/Modal';
import { useRegisterSW } from 'virtual:pwa-register/react';
interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>; }
export function PwaStatus({ activeSession, pendingChanges }: { activeSession: boolean; pendingChanges: boolean }) {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [error, setError] = useState('');
  const [showInstall, setShowInstall] = useState(false);
  const { needRefresh: [refresh, setRefresh], offlineReady: [ready, setReady], updateServiceWorker } = useRegisterSW({ onRegisterError: () => setError('Offline setup could not finish. Reconnect and reload to try again.') });
  useEffect(() => {
    const event = (e: Event) => { e.preventDefault(); setInstall(e as InstallEvent); };
    window.addEventListener('beforeinstallprompt', event);
    const installed = () => setInstall(null); window.addEventListener('appinstalled', installed);
    return () => { window.removeEventListener('beforeinstallprompt', event); window.removeEventListener('appinstalled', installed); };
  }, []);
  return <div className="pwa-status"><button className="install-pill" onClick={() => setShowInstall(true)}><Download size={18} /> Keep your world close <ArrowUpRight size={18} /></button>{showInstall && <Modal title="Install on this device" onClose={() => setShowInstall(false)}><p>Make a little room for growth on your home screen.</p><div className="install-instructions"><h3>On a phone or tablet</h3><p>Use your browser’s Install app or Add to Home Screen menu. On iPhone or iPad, open Safari’s Share menu, then choose Add to Home Screen.</p><h3>On your computer</h3><p>Look for the install icon in your browser’s address bar or its app menu. If your browser doesn’t offer installation, your growth space still works here.</p><p className="fine-print">Open the app online and wait for offline setup before using it without a connection. Videos, live AI, and synchronization need internet access.</p>{install && <button className="primary-button" onClick={() => { void install.prompt().then(() => install.userChoice).then(() => { setInstall(null); setShowInstall(false); }).catch(() => setError('Use your browser’s install menu to add this app.')); }}><Download size={18} /> Install Growth OS</button>}</div></Modal>}{error && <p role="status">{error}</p>}{refresh && <div className="update-bar"><p>An update is ready.{activeSession ? ' Finish your focus session before reloading.' : pendingChanges ? ' Save open drafts before reloading. Saved changes stay on this device.' : ' Save any open drafts before reloading.'}</p><button className="secondary-button" disabled={activeSession} onClick={() => { if (window.confirm('Reload to update? Unsaved form drafts will be lost. Saved progress is kept.')) void updateServiceWorker(true); }}>Reload and update</button><button className="subtle-button" onClick={() => setRefresh(false)}>Later</button></div>}{ready && <div className="update-bar"><p>Your app is ready for offline use. Videos and live AI still need a connection.</p><button className="subtle-button" onClick={() => setReady(false)}>Got it</button></div>}</div>;
}
