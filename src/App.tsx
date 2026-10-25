import { lazy, Suspense, useEffect, useState } from 'react';
import { BookOpen, ChartNoAxesCombined, Coins, House, Settings as SettingsIcon, Sparkles, Sun, Moon, X, Sprout } from 'lucide-react';
import { auth, cloudConfigured } from './services/cloud';
import { useGrowth } from './app/useGrowth';
import { balance } from './domain/model';
import { Onboarding } from './features/Onboarding';
import { Today } from './features/Today';
import { PasswordRecovery } from './features/PasswordRecovery';
import { GrowthFooter } from './components/GrowthFooter';
const Learn = lazy(() => import('./features/Learn').then((m) => ({ default: m.Learn })));
const Progress = lazy(() => import('./features/Progress').then((m) => ({ default: m.Progress })));
const Settings = lazy(() => import('./features/Settings').then((m) => ({ default: m.Settings })));
const Assistant = lazy(() => import('./features/Assistant').then((m) => ({ default: m.Assistant })));
const tabs = [{ id: 'today', title: 'Today', icon: House }, { id: 'learn', title: 'Learn', icon: BookOpen }, { id: 'progress', title: 'Progress', icon: ChartNoAxesCombined }, { id: 'settings', title: 'Settings', icon: SettingsIcon }] as const;
type Tab = typeof tabs[number]['id'];
export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [progressView, setProgressView] = useState<'journey' | 'home' | 'activity'>('journey');
  const [assistant, setAssistant] = useState(false);
  const app = useGrowth(assistant ? 'assistant' : tab);
  const [assistantResource, setAssistantResource] = useState<string>();
  const openAssistant = (resourceId?: string) => { setAssistantResource(resourceId); setAssistant(true); };
  const state = app.state;
  const { notice, setNotice } = app;
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [tab]);
  useEffect(() => { document.querySelector('meta[name="theme-color"]')?.setAttribute('content', (state?.preferences.theme ?? 'dark') === 'dark' ? '#191813' : '#faf6e8'); }, [state?.preferences.theme]);
  useEffect(() => { document.documentElement.dataset.theme = state?.preferences.theme ?? 'dark'; document.documentElement.dataset.textSize = state?.preferences.largeText ? 'large' : 'normal'; document.documentElement.classList.toggle('reduce-motion', state?.preferences.reducedMotion ?? false); }, [state?.preferences.theme, state?.preferences.reducedMotion, state?.preferences.largeText]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5500); return () => clearTimeout(timer); }, [notice, setNotice]);
  useEffect(() => { const update = () => document.documentElement.classList.toggle('animation-paused', document.hidden); update(); document.addEventListener('visibilitychange', update); return () => document.removeEventListener('visibilitychange', update); }, []);
  const alerts = <>{app.error && <div className="toast error" role="alert"><span>{app.error}</span><button className="icon-button" aria-label="Dismiss error" onClick={() => app.setError('')}><X size={18} /></button></div>}{app.notice && <div className="toast" role="status"><span>{app.notice}</span><button className="icon-button" aria-label="Dismiss message" onClick={() => app.setNotice('')}><X size={18} /></button></div>}</>;
  if (app.recovery) return <PasswordRecovery key={app.owner} app={app} />;
  if (!state) return <main className="loading"><span className="brand-mark">i</span><p>Opening your growth space…</p>{alerts}</main>;
  if (!state.profile && app.owner !== 'guest' && !app.lastSynced && cloudConfigured) return <main className="loading"><span className="brand-mark">i</span><p>Opening your account’s saved progress…</p><button className="secondary-button" onClick={() => void app.sync()}>Retry connection</button><button className="subtle-button" onClick={() => void auth?.auth.signOut({ scope: 'local' })}>Return to guest workspace</button>{alerts}</main>;
  if (!state.profile) return <><Onboarding app={app} />{alerts}</>;
  const navigation = (mobile = false) => <nav className={mobile ? 'mobile-nav' : 'desktop-nav'} aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>{tabs.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => { setProgressView('journey'); setTab(item.id); }}><item.icon size={18} /><span>{item.title}</span></button>)}</nav>;
  return <div className="app-shell"><a href="#main" className="skip-link">Skip to content</a>
    <header className="app-header"><a href="#" className="brand" onClick={(e) => { e.preventDefault(); setTab('today'); }} aria-label="Growth OS home"><span className="brand-mark"><Sprout size={24} strokeWidth={1.6} /></span><span>growth<span className="brand-light">os</span></span></a>
      {navigation()}
      <div className="header-actions"><button className="icon-button theme-switch" aria-label={state.preferences.theme === 'dark' ? 'Switch to light appearance' : 'Switch to dark appearance'} onClick={() => void app.dispatch({ type: 'preferences', preferences: { theme: state.preferences.theme === 'dark' ? 'light' : 'dark' } })}>{state.preferences.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button><button className="coin-balance" onClick={() => setTab('progress')} aria-label={`${balance(state)} Growth Coins. Open progress.`}><Coins size={17} />{balance(state)}</button><button className="profile-button" aria-label="Open your settings" onClick={() => setTab('settings')}>{state.profile.name[0].toUpperCase()}</button></div>
    </header>
    <main id="main" className="main-content"><Suspense fallback={<p className="loading-tab">Opening your space…</p>}><div className="page-enter" key={`${app.owner}:${tab}`}>{tab === 'today' && <Today app={app} openAssistant={() => openAssistant()} openLearn={() => setTab('learn')} openProgress={() => { setProgressView('activity'); setTab('progress'); }} openHome={() => { setProgressView('home'); setTab('progress'); }} />}{tab === 'learn' && <Learn app={app} openAssistant={openAssistant} />}{tab === 'progress' && <Progress app={app} initialView={progressView} />}{tab === 'settings' && <Settings app={app} />}</div></Suspense><GrowthFooter app={app} /></main>
    <button className="assistant-fab" aria-label="Assistant" onClick={() => openAssistant()}><Sparkles size={20} /><span>Ask for a little help</span></button>
    {navigation(true)}{assistant && <Suspense fallback={null}><Assistant key={app.owner} resourceId={assistantResource} app={app} onClose={() => setAssistant(false)} /></Suspense>}{alerts}</div>;
}
