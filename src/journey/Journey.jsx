import React, { useEffect, useRef, useState } from "react";
import {
  Maximize,
  Minimize,
  Menu,
  X,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRealm } from "../store";
import { scenes, chapters, totalSpan, clamp } from "./timeline";
import { useJourney } from "./useJourney";
import Scene, { art } from "./Scene";
import { flowArt } from "./Gallery";
import SpiritDust from "./SpiritDust";
import "./journey.css";
import "./flow.css";
const assets = [
  ...["gate", "mountain", "pilgrim"].map(art),
  ...[
    "planet-map",
    "planet-landscape",
    "cauldron",
    "spirit-stone",
    "foundation-pill",
    "gold-core",
    "nascent-soul",
    "divine-spirit",
    "tribulation",
    "cave",
    "scroll",
  ].map(flowArt),
];
const numerals = ["壹", "贰", "叁", "肆", "伍", "陆"];
export default function Journey() {
  const [loaded, setLoaded] = useState(0),
    [failed, setFailed] = useState(false),
    [started, setStarted] = useState(false),
    [menu, setMenu] = useState(false),
    [credits, setCredits] = useState(false),
    [notice, setNotice] = useState(""),
    [full, setFull] = useState(false),
    [sound, setSound] = useState(false);
  const timer = useRef(),
    audio = useRef(),
    tone = useRef(),
    holding = useRef(false);
  const flashNotice = (text) => {
    clearTimeout(timer.current);
    setNotice(text);
    timer.current = setTimeout(() => setNotice(""), 3500);
  };
  const realm = useRealm(flashNotice);
  realm.notice = flashNotice;
  const {
    position,
    root,
    pointer,
    reduced,
    jump,
    move,
    leave,
    transition,
    traveling,
  } = useJourney(started);
  const scene = scenes[position.index],
    paused = menu || credits,
    ready = loaded === assets.length && !failed,
    entering = transition
      ? transition.mix
      : position.index < scenes.length - 1
        ? clamp((position.progress - 0.5) / 0.5) ** 2 *
          (3 - 2 * clamp((position.progress - 0.5) / 0.5))
        : 0;
  const activeIndex =
    !traveling && entering >= 0.5
      ? Math.min(position.index + 1, scenes.length - 1)
      : position.index;
  useEffect(() => {
    document.documentElement.classList.add("journey-document");
    document.title = "灵石仙宗 · 灵气入炉，十丹结金";
    let alive = true;
    assets.forEach((src) => {
      const img = new Image();
      img.onload = () => alive && setLoaded((n) => n + 1);
      img.onerror = () => {
        if (alive) {
          setFailed(true);
          setLoaded((n) => n + 1);
        }
      };
      img.src = src;
    });
    return () => {
      alive = false;
      document.documentElement.classList.remove("journey-document");
      clearTimeout(timer.current);
      audio.current?.close();
    };
  }, []);
  useEffect(() => {
    const previous = document.body.style.overflow;
    if (!started || paused) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [started, paused]);
  useEffect(() => {
    if (started || !ready) return;
    setStarted(true);
    const awaken = () => setStarted(true);
    window.addEventListener("wheel", awaken, { passive: true });
    window.addEventListener("touchmove", awaken, { passive: true });
    return () => {
      window.removeEventListener("wheel", awaken);
      window.removeEventListener("touchmove", awaken);
    };
  }, [started, ready]);
  useEffect(() => {
    const change = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  useEffect(() => {
    if (!paused) return;
    const prior = document.activeElement,
      dialog = root.current?.querySelector('[role="dialog"]');
    dialog?.querySelector("button")?.focus();
    const key = (e) => {
      if (e.key === "Escape") {
        setMenu(false);
        setCredits(false);
      }
      if (e.key === "Tab" && dialog) {
        const controls = [
            ...dialog.querySelectorAll("button:not(:disabled),a"),
          ],
          first = controls[0],
          last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      prior?.focus?.();
    };
  }, [paused]);
  const go = (index) => {
    if (!ready || traveling) return;
    setMenu(false);
    setCredits(false);
    setStarted(true);
    requestAnimationFrame(() => jump(index, activeIndex));
  };
  const next = () => go(Math.min(activeIndex + 1, scenes.length - 1));
  const restart = () => go(0);
  const toggleFull = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else flashNotice("可直接滑动体验");
    } catch {
      flashNotice("全屏未开启，可继续体验");
    }
  };
  const toggleSound = () => {
    if (!audio.current) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      const ctx = new Audio(),
        gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
      [130.81, 196, 261.63].forEach((f, i) => {
        const o = ctx.createOscillator(),
          v = ctx.createGain();
        o.frequency.value = f;
        v.gain.value = 0.023 / (i + 1);
        o.connect(v);
        v.connect(gain);
        o.start();
      });
      audio.current = ctx;
      tone.current = gain;
    }
    const next = !sound;
    audio.current.resume();
    tone.current.gain.setTargetAtTime(
      next ? 0.6 : 0,
      audio.current.currentTime,
      0.5,
    );
    setSound(next);
  };
  const sceneProps = {
    reduced,
    holding,
    realm,
    next,
    restart,
    paused,
    ready,
    launch: transition?.launch || 0,
  };
  return (
    <main
      ref={root}
      onClick={(e) => {
        if (
          paused ||
          traveling ||
          holding.current ||
          e.target.closest(
            'button,a,input,select,textarea,label,[role="dialog"],[data-no-nav],.board-scroll',
          )
        )
          return;
        const target =
          e.clientY < window.innerHeight / 2
            ? activeIndex - 1
            : activeIndex + 1;
        if (target >= 0 && target < scenes.length) go(target);
      }}
      onPointerMove={move}
      onPointerLeave={leave}
      className={`journey flow-journey is-started ${scene.light && !paused ? "j-light" : ""} ${reduced ? "j-reduced" : ""}`}
    >
      <div className="j-viewport" aria-label="修仙玩法画卷">
        <div
          className="j-scenes"
          inert={paused ? true : undefined}
          aria-hidden={paused}
        >
          <div className="j-scene-layer" style={{ opacity: 1 }}>
            <Scene
              scene={scene}
              progress={position.progress}
              interactive={!paused && !traveling && entering < 0.5}
              {...sceneProps}
            />
          </div>
          {entering > 0 && (
            <div
              className="j-scene-layer incoming"
              style={{
                opacity: entering,
                pointerEvents: !traveling && entering >= 0.5 ? "auto" : "none",
              }}
              aria-hidden={traveling || entering < 0.5}
              inert={traveling || entering < 0.5 ? true : undefined}
            >
              <Scene
                scene={
                  scenes[transition ? transition.target : position.index + 1]
                }
                progress={0}
                interactive={!paused && !traveling && entering >= 0.5}
                {...sceneProps}
              />
            </div>
          )}
        </div>
        <SpiritDust
          pointer={pointer}
          holding={holding}
          reduced={reduced}
          realm={0}
          enabled={ready && !paused}
        />
        {entering > 0 && entering < 1 && (
          <div
            className="journey-cloud-veil"
            style={{ opacity: Math.sin(Math.PI * entering) * 0.16 }}
            aria-hidden="true"
          />
        )}
        <div className="journey-area-hint" aria-hidden="true">
          <span>上半屏 · 返回上一幕</span>
          <span>下半屏 · 进入下一幕</span>
        </div>
        <header className="j-header">
          <button
            className="j-menu-trigger"
            aria-label="打开章节导航"
            aria-expanded={menu}
            onClick={() => {
              setCredits(false);
              setMenu(!menu);
            }}
          >
            <span>
              <img src="/images/lingshi-logo.png" alt="" />
            </span>
            <Menu size={24} />
          </button>
          <button className="j-brand" onClick={() => go(0)} aria-label="灵石仙宗首页">
            <strong>灵石仙宗</strong>
            <small>LINGSHI REALM</small>
          </button>
        </header>
        <footer className="j-footer">
          <div className="j-tools">
            <button
              aria-label={full ? "退出全屏" : "进入全屏"}
              onClick={toggleFull}
            >
              {full ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
            <button
              aria-label={sound ? "关闭环境音" : "开启环境音"}
              onClick={toggleSound}
            >
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
          <button
            className="j-progress"
            onClick={() => setMenu(true)}
            aria-label={`当前章节 ${chapters[scene.chapter]}，打开章节导航`}
          >
            <span>
              {numerals[scene.chapter]} · {chapters[scene.chapter]}
            </span>
            <span className="j-progress-line">
              <i style={{ transform: `scaleX(${position.overall})` }} />
            </span>
          </button>
          <div className="journey-step-controls">
            <button
              aria-label="上一幕"
              disabled={!activeIndex || traveling}
              onClick={() => go(activeIndex - 1)}
            >
              <ChevronLeft size={19} />
            </button>
            <button
              aria-label="下一幕"
              disabled={
                activeIndex === scenes.length - 1 || traveling || !ready
              }
              onClick={next}
            >
              <ChevronRight size={19} />
            </button>
            <button
              className="j-credits-trigger"
              onClick={() => {
                setMenu(false);
                setCredits(true);
              }}
            >
              鸣谢
            </button>
          </div>
        </footer>
        {failed && (
          <div className="j-notice">
            画卷加载未完成{" "}
            <button onClick={() => window.location.reload()}>重新加载 ↺</button>
          </div>
        )}
        {menu && (
          <div
            className="j-overlay j-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="章节导航"
          >
            <button
              className="j-overlay-close"
              aria-label="关闭章节导航"
              onClick={() => setMenu(false)}
            >
              <X />
            </button>
            <span className="j-overlay-title">仙途画卷</span>
            <nav>
              {chapters.map((name, i) => (
                <button
                  key={name}
                  disabled={!ready || traveling}
                  aria-current={i === position.index ? "step" : undefined}
                  onClick={() => go(i)}
                >
                  <small>{numerals[i]}</small>
                  <strong>{name}</strong>
                  <span>↗</span>
                </button>
              ))}
            </nav>
            <button onClick={() => go(2)} className="j-nav-realm">
              我的熔炼炉 ↗
            </button>
          </div>
        )}
        {credits && (
          <div
            className="j-overlay j-credit-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="制作鸣谢"
          >
            <button
              className="j-overlay-close"
              aria-label="关闭鸣谢"
              onClick={() => setCredits(false)}
            >
              <X />
            </button>
            <span className="j-overlay-title">灵石仙宗 · 制作鸣谢</span>
            <h2>
              持灵石，入仙门。
              <br />
              十丹结金，道心长明。
            </h2>
            <p>
              原创颗粒水墨 · 五幕修仙旅程
              <br />
              交互灵感 · The Monolith Project
              <br />
              致谢每一位修行者
            </p>
            <div>
              <button onClick={() => setCredits(false)}>返回画卷 ↗</button>
              <button onClick={restart}>重新启程 ↺</button>
            </div>
          </div>
        )}
        {notice && (
          <div className="j-notice" role="status">
            {notice}
          </div>
        )}
        <span className="sr-only" aria-live="polite">
          {chapters[scene.chapter]}：{scene.title}
        </span>
      </div>
      {started && (
        <div
          className="j-scroll-space"
          aria-hidden="true"
          style={{ height: `${(totalSpan + 1) * 100}vh` }}
        />
      )}
    </main>
  );
}
