import React, { useEffect, useRef, useState } from 'react';
import { Maximize, Minimize, Menu, X, Volume2, VolumeX } from 'lucide-react';
import { scenes, chapters, sceneOffset, totalSpan, nextRealm, realmNames, clamp } from './timeline';
import { useJourney } from './useJourney';
import Scene, { art } from './Scene';
import SpiritDust from './SpiritDust';
import './journey.css';
const assetNames = ['gate', 'cosmos', 'mountain', 'meditation', 'pilgrim', 'stone', 'redrealm', 'jaderealm', 'bluerealm', 'talisman'];
const numerals = ['壹', '贰', '叁', '肆', '伍', '陆'];
export default function Journey() {
  const [loaded, setLoaded] = useState(0), [failures, setFailures] = useState([]), [started, setStarted] = useState(false);
  const [menu, setMenu] = useState(false), [credits, setCredits] = useState(false), [realm, setRealm] = useState(0);
  const [burst, setBurst] = useState(0), [notice, setNotice] = useState(''), [full, setFull] = useState(false), [sound, setSound] = useState(false);
  const holding = useRef(false), noticeTimer = useRef(), audio = useRef(null), tone = useRef(null), launch = useRef();
  const { position, root, pointer, reduced, jump, move, leave } = useJourney(started);
  const scene = scenes[position.index], ready = loaded === assetNames.length && failures.length === 0;
  const paused = credits || menu;
  const entering = position.index < scenes.length - 1 ? clamp((position.progress - .82) / .18) : 0;
  useEffect(() => {
    document.documentElement.classList.add('journey-document'); document.title = '灵石仙宗 · 一触灵石，万境新生';
    let alive = true;
    assetNames.forEach(name => { const image = new Image(); image.onload = () => alive && setLoaded(n => n + 1); image.onerror = () => { if (alive) { setFailures(names => [...names, name]); setLoaded(n => n + 1); } }; image.src = art(name); });
    return () => { alive = false; document.documentElement.classList.remove('journey-document'); clearTimeout(noticeTimer.current); audio.current?.close(); };
  }, []);
  useEffect(() => { const previous = document.body.style.overflow; if (!started || paused) document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = previous; }; }, [started, paused]);
  useEffect(() => { const change = () => setFull(Boolean(document.fullscreenElement)); document.addEventListener('fullscreenchange', change); return () => document.removeEventListener('fullscreenchange', change); }, []);
  useEffect(() => {
    if (!paused) return;
    const previousFocus = document.activeElement;
    const dialog = root.current?.querySelector('[role="dialog"]');
    dialog?.querySelector('button')?.focus();
    const keys = event => {
      if (event.key === 'Escape') { setMenu(false); setCredits(false); }
      if (event.key === 'Tab' && dialog) {
        const controls = [...dialog.querySelectorAll('a[href],button')]; const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', keys); return () => { window.removeEventListener('keydown', keys); previousFocus?.focus?.(); };
  }, [paused]);
  const flashNotice = text => { clearTimeout(noticeTimer.current); setNotice(text); noticeTimer.current = setTimeout(() => setNotice(''), 2800); };
  const transform = () => { const next = nextRealm(realm); setRealm(next); setBurst(n => n + 1); flashNotice(`灵境已开 · ${realmNames[next]}`); };
  const begin = () => { if (!ready) return; window.scrollTo({ top: 0, behavior: 'instant' }); setStarted(true); setTimeout(() => launch.current?.focus(), 0); };
  const restart = () => { setMenu(false); setCredits(false); setRealm(0); setBurst(0); setStarted(false); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const go = index => { if (!ready) return; setMenu(false); if (!started) setStarted(true); requestAnimationFrame(() => jump(index)); };
  const toggleFull = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); else flashNotice('当前浏览器可直接滑动体验'); } catch { flashNotice('全屏未开启，可继续滑动体验'); } };
  const toggleSound = () => {
    if (!audio.current) {
      const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) { flashNotice('当前浏览器不支持环境音'); return; }
      const ctx = new Audio(), gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
      [130.81, 196, 261.63].forEach((frequency, i) => { const oscillator = ctx.createOscillator(), volume = ctx.createGain(); oscillator.type = 'sine'; oscillator.frequency.value = frequency; volume.gain.value = .023 / (i + 1); oscillator.connect(volume); volume.connect(gain); oscillator.start(); });
      audio.current = ctx; tone.current = gain;
    }
    const next = !sound; audio.current.resume(); tone.current.gain.setTargetAtTime(next ? .6 : 0, audio.current.currentTime, .5); setSound(next);
  };
  const openCredits = () => { setMenu(false); setCredits(true); };
  const light = started && scene.light && !paused;
  return <main className={`journey ${started ? 'is-started' : ''} ${light ? 'j-light' : ''} ${reduced ? 'j-reduced' : ''}`} ref={root} onPointerMove={move} onPointerLeave={leave}>
    <div className="j-viewport" aria-label="修仙叙事画卷">
      <div className="j-scenes" aria-hidden={!started || paused} inert={!started || paused ? true : undefined}>
        <div className="j-scene-layer" style={{ opacity: 1 - entering }}><Scene scene={scene} progress={position.progress} realm={realm} reduced={reduced} interactive={started && !paused && entering < .5} onTransform={transform} holding={holding} restart={restart} credits={openCredits} /></div>
        {entering > 0 && <div className="j-scene-layer incoming" style={{ opacity: entering }} aria-hidden="true" inert><Scene scene={scenes[position.index + 1]} progress={0} realm={realm} reduced={reduced} interactive={false} holding={holding} /></div>}
      </div>
      <SpiritDust pointer={pointer} holding={holding} reduced={reduced} realm={realm} enabled={started && !paused} />
      {burst > 0 && scene.id === 'realms' && <div key={burst} className="j-world-wave" aria-hidden="true" />}
      {!started && <div className="j-intro">
        <span className="j-intro-number" aria-hidden="true">{ready ? '一' : String(Math.round(loaded / assetNames.length * 100)).padStart(2, '0')}</span>
        <button className="j-spark-button" onClick={begin} disabled={!ready} aria-label="点击灵光开启仙途"><span className="j-spark" /><span>{failures.length ? '画卷未加载完整' : ready ? '轻触灵光，踏入仙途' : '正在展开画卷…'}</span><small>{ready ? 'CLICK TO AWAKEN' : `${loaded} / ${assetNames.length}`}</small></button>
        {failures.length > 0 && <button className="j-retry" onClick={() => window.location.reload()}>重新加载画卷 ↺</button>}
        <p className="j-intro-caption">一点灵光，万象始生。</p>
      </div>}
      <header className="j-header">
        <button className="j-menu-trigger" aria-label={menu ? '关闭章节导航' : '打开章节导航'} aria-expanded={menu} onClick={() => { setCredits(false); setMenu(!menu); }}><span><img src="/images/lingshi-logo.png" alt="" /></span>{menu ? <X size={24} /> : <Menu size={24} />}</button>
        <a className="j-brand" href="/realm"><strong>灵石仙宗</strong><small>LINGSHI REALM</small></a>
      </header>
      <footer className="j-footer">
        <div className="j-tools"><button aria-label={full ? '退出全屏' : '进入全屏'} onClick={toggleFull}>{full ? <Minimize size={19} /> : <Maximize size={19} />}</button><button aria-label={sound ? '关闭环境音' : '开启环境音'} onClick={toggleSound}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button></div>
        <button className="j-progress" ref={launch} onClick={() => { if (started) setMenu(true); }} aria-label={`当前章节 ${chapters[scene.chapter]}，打开章节导航`} disabled={!started}><span>{started ? `${numerals[scene.chapter]} · ${chapters[scene.chapter]}` : '灵 石 仙 宗'}</span><span className="j-progress-line"><i style={{ transform: `scaleX(${started ? position.overall : 0})` }} /></span></button>
        <button className="j-credits-trigger" onClick={openCredits}>鸣谢</button>
      </footer>
      {menu && <div className="j-overlay j-navigation" role="dialog" aria-modal="true" aria-label="章节导航"><button className="j-overlay-close" aria-label="关闭章节导航" onClick={() => setMenu(false)}><X size={24} /></button><span className="j-overlay-title">仙途画卷</span><nav>{chapters.map((chapter, i) => <button key={chapter} onClick={() => go(scenes.findIndex(s => s.chapter === i))} aria-current={scene.chapter === i ? 'step' : undefined}><small>{numerals[i]}</small><strong>{chapter}</strong><span>↗</span></button>)}</nav><a href="/realm" className="j-nav-realm">进入修炼与天骄榜 ↗</a></div>}
      {credits && <div className="j-overlay j-credit-overlay" role="dialog" aria-modal="true" aria-label="制作鸣谢"><button className="j-overlay-close" aria-label="关闭鸣谢" onClick={() => setCredits(false)}><X size={24} /></button><span className="j-overlay-title">灵石仙宗 · 制作鸣谢</span><h2>每一次触碰，<br />都是新的仙缘。</h2><p>修仙叙事 · 灵石仙宗<br />视觉 · 原创颗粒水墨画卷<br />交互灵感 · The Monolith Project<br />致谢 · 每一位修行者</p><div><button onClick={() => setCredits(false)}>返回画卷 ↗</button><button onClick={restart}>重新启程 ↺</button><a href="/realm">进入仙宗 ↗</a></div></div>}
      {notice && <div className="j-notice" role="status">{notice}</div>}
      <span className="sr-only" aria-live="polite">{started ? `${chapters[scene.chapter]}：${scene.title}` : '点击灵光开启仙途'}</span>
    </div>
    {started && <div className="j-scroll-space" aria-hidden="true" style={{ height: `${(totalSpan + 1) * 100}vh` }} />}
  </main>;
}
