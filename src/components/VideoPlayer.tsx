import { useEffect, useRef, useState } from 'react';
import type { GrowthController } from '../app/useGrowth';
import { parseVideo, type GrowthState } from '../domain/model';
import { playbackInterval, type PlaybackSample } from '../domain/playback';

type Player = { getCurrentTime: () => number; getPlayerState: () => number; getPlaybackRate: () => number; destroy: () => void };
type Youtube = { Player: new (element: HTMLIFrameElement, options: { events: { onReady: () => void; onError: () => void } }) => Player };
const youtubeWindow = window as Window & { YT?: Youtube; onYouTubeIframeAPIReady?: () => void };
let youtubeLoading: Promise<Youtube> | undefined;
function loadYoutube(): Promise<Youtube> {
  if (youtubeWindow.YT?.Player) return Promise.resolve(youtubeWindow.YT);
  if (youtubeLoading) return youtubeLoading;
  youtubeLoading = new Promise<Youtube>((resolve, reject) => {
    const script = document.createElement('script');
    const fail = () => { clearTimeout(timer); script.remove(); reject(new Error('Player measurements unavailable.')); };
    const timer = setTimeout(fail, 15_000);
    youtubeWindow.onYouTubeIframeAPIReady = () => { clearTimeout(timer); if (youtubeWindow.YT) resolve(youtubeWindow.YT); else fail(); };
    script.src = 'https://www.youtube.com/iframe_api'; script.onerror = fail; document.head.append(script);
  }).catch((error: unknown) => { youtubeLoading = undefined; throw error; });
  return youtubeLoading;
}
export function VideoPlayer({ resource, app }: { resource: GrowthState['resources'][number]; app: GrowthController }) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Waiting for player measurements.');
  const [error, setError] = useState(false);
  const tracking = app.state!.preferences.tracking && !app.state!.preferences.activityExclusions.includes('learn');
  const { dispatch } = app;
  useEffect(() => {
    const video = parseVideo(resource.url);
    const iframe = document.createElement('iframe');
    iframe.title = resource.title;
    iframe.className = `video-frame ${video.provider === 'TikTok' ? 'vertical' : ''}`;
    iframe.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true; iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    const url = new URL(video.embed);
    if (video.provider === 'YouTube') { url.searchParams.set('enablejsapi', '1'); url.searchParams.set('origin', window.location.origin); url.searchParams.set('playsinline', '1'); }
    iframe.src = url.toString(); container.current!.append(iframe);
    let disposed = false, player: Player | undefined, polling: ReturnType<typeof setInterval> | undefined;
    let previous: PlaybackSample | null = null, playing = false;
    let pending: { start: number; end: number } | null = null;
    let failure = false;
    function flush() {
      const interval = pending; pending = null;
      if (interval && !failure) void dispatch({ type: 'playback.record', id: crypto.randomUUID(), resourceId: resource.id, ...interval }).then((ok) => { if (!ok) { failure = true; if (!disposed) setStatus('Measurement saving stopped. Review the storage error.'); } });
    }
    function sample(position: number, isPlaying: boolean, rate = 1) {
      if (disposed || !tracking || failure || !Number.isFinite(position) || position < 0) return;
      const current = { wall: Date.now(), position, playing: isPlaying, visible: !document.hidden, rate };
      const interval = playbackInterval(previous, current); previous = current;
      if (!interval) { flush(); return; }
      if (pending && pending.end === interval.start && interval.end - pending.start <= 30_000) pending.end = interval.end;
      else { flush(); pending = interval; }
      setStatus('Recording visible playback estimates. No rewards are tied to watching.');
      if (pending && pending.end - pending.start >= 29_000) flush();
    }
    function reset() { flush(); previous = null; }
    function message(event: MessageEvent) {
      if (event.origin !== 'https://www.tiktok.com' || event.source !== iframe.contentWindow || !event.data || typeof event.data !== 'object' || event.data['x-tiktok-player'] !== true) return;
      const data = event.data as { type?: string; value?: unknown };
      if (data.type === 'onStateChange' && typeof data.value === 'number') { reset(); playing = data.value === 1; }
      if (data.type === 'onCurrentTime' && data.value && typeof data.value === 'object' && 'currentTime' in data.value && typeof data.value.currentTime === 'number') sample(data.value.currentTime, playing);
      if (data.type === 'onPlayerError' || data.type === 'onError') { reset(); playing = false; setError(true); }
      if (data.type === 'onPlayerReady' && tracking) setStatus('Player ready. Measurement starts during visible playback.');
    }
    iframe.onerror = () => { if (!disposed) setError(true); };
    if (video.provider === 'TikTok') window.addEventListener('message', message);
    if (tracking && video.provider === 'YouTube') void loadYoutube().then((yt) => {
      if (disposed) return;
      player = new yt.Player(iframe, { events: {
        onReady: () => { if (disposed) return; setStatus('Player ready. Measurement starts during visible playback.'); polling = setInterval(() => { if (player) sample(player.getCurrentTime(), player.getPlayerState() === 1, player.getPlaybackRate()); }, 1000); },
        onError: () => { if (!disposed) { reset(); setError(true); } },
      } });
    }).catch(() => { if (!disposed) setStatus('Player measurements unavailable. You can still use the resource.'); });
    document.addEventListener('visibilitychange', reset);
    window.addEventListener('pagehide', reset);
    return () => { reset(); disposed = true; if (polling) clearInterval(polling); player?.destroy(); iframe.remove(); window.removeEventListener('message', message); document.removeEventListener('visibilitychange', reset); window.removeEventListener('pagehide', reset); };
  }, [resource.id, resource.url, resource.title, tracking, dispatch]);
  return <><div ref={container} />{error && <p className="callout">The provider could not play this video here. Try the original link below; your practice and notes remain available.</p>}<p className="fine-print">{tracking ? status : 'Playback tracking is paused or Learn is excluded. Manage automatic tracking in Settings.'}</p></>;
}
