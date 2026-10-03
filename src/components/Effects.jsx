import React, { useEffect, useRef, useState } from "react";

// Decorative effects never write to the holder or snapshot ledger.
export function SpiritCrystal() {
  const area = useRef(null),
    canvas = useRef(null),
    pointer = useRef({ x: 0.5, y: 0.5, active: false });
  const [waves, setWaves] = useState([]);
  const [charge, setCharge] = useState({ hits: 0, level: 0 });
  const [burst, setBurst] = useState(null);
  const combo = useRef({ hits: 0, level: 0, last: 0 });
  const idleTimer = useRef();
  useEffect(() => () => clearTimeout(idleTimer.current), []);
  const sequence = useRef(0),
    frame = useRef(0);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const el = canvas.current,
      host = area.current,
      ctx = el.getContext("2d");
    if (!ctx) return;
    let raf = 0,
      last = 0,
      width = 0,
      height = 0,
      visible = true;
    const particles = Array.from(
      { length: window.innerWidth < 720 ? 24 : 48 },
      (_, i) => ({
        x: ((i * 73 + 19) % 101) / 101,
        y: ((i * 47 + 11) % 97) / 97,
        radius: 0.7 + (i % 4) * 0.4,
        speed: 0.006 + (i % 5) * 0.002,
        phase: i * 1.7,
      }),
    );
    const resize = () => {
      const box = host.getBoundingClientRect();
      width = box.width;
      height = box.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (time) => {
      raf = 0;
      if (document.hidden || !visible || media.matches) return;
      if (time - last >= 32) {
        const dt = last ? Math.min((time - last) / 1000, 0.06) : 0;
        last = time;
        ctx.clearRect(0, 0, width, height);
        for (const p of particles) {
          p.y -= dt * p.speed;
          if (p.y < -0.04) p.y = 1.04;
          const x = p.x * width + Math.sin(time / 2700 + p.phase) * 10;
          const y = p.y * height;
          const proximity = pointer.current.active
            ? Math.max(
                0,
                1 -
                  Math.hypot(
                    x - pointer.current.x * width,
                    y - pointer.current.y * height,
                  ) /
                    130,
              )
            : 0;
          const opacity =
            0.2 +
            (Math.sin(time / 1300 + p.phase) + 1) * 0.18 +
            proximity * 0.3;
          ctx.beginPath();
          ctx.fillStyle = `rgba(245,201,94,${opacity})`;
          ctx.arc(x, y, p.radius + proximity, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    const resume = () => {
      if (document.hidden || !visible || media.matches) {
        cancelAnimationFrame(raf);
        raf = 0;
        ctx.clearRect(0, 0, width, height);
      } else if (!raf) {
        last = 0;
        raf = requestAnimationFrame(draw);
      }
    };
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      resume();
    });
    observer.observe(host);
    const sizes = new ResizeObserver(resize);
    sizes.observe(host);
    resize();
    resume();
    document.addEventListener("visibilitychange", resume);
    media.addEventListener("change", resume);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(frame.current);
      observer.disconnect();
      sizes.disconnect();
      document.removeEventListener("visibilitychange", resume);
      media.removeEventListener("change", resume);
    };
  }, []);
  const move = (event) => {
    if (
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const box = area.current.getBoundingClientRect();
    pointer.current = {
      x: (event.clientX - box.left) / box.width,
      y: (event.clientY - box.top) / box.height,
      active: true,
    };
    if (!frame.current)
      frame.current = requestAnimationFrame(() => {
        const p = pointer.current;
        area.current.style.setProperty("--spirit-x", `${(p.x - 0.5) * 14}px`);
        area.current.style.setProperty("--spirit-y", `${(p.y - 0.5) * 10}px`);
        area.current.style.setProperty(
          "--spirit-tilt",
          `${(p.x - 0.5) * 2}deg`,
        );
        frame.current = 0;
      });
  };
  const leave = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    pointer.current.active = false;
    area.current.style.setProperty("--spirit-x", "0px");
    area.current.style.setProperty("--spirit-y", "0px");
    area.current.style.setProperty("--spirit-tilt", "0deg");
  };
  const awaken = (event) => {
    const box = area.current.getBoundingClientRect();
    const keyboard = event.detail === 0;
    const wave = {
      id: ++sequence.current,
      x: keyboard ? 50 : ((event.clientX - box.left) / box.width) * 100,
      y: keyboard ? 45 : ((event.clientY - box.top) / box.height) * 100,
    };
    setWaves((current) => [...current.slice(-9), wave]);
    const time = Date.now();
    const next = { ...combo.current };
    next.hits = (time - next.last > 2200 ? 0 : next.hits) + 1;
    next.last = time;
    if (next.hits === 5) {
      next.hits = 0;
      next.level += 1;
      setBurst({ id: wave.id, level: next.level });
    }
    combo.current = next;
    setCharge({ hits: next.hits, level: next.level });
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      combo.current.hits = 0;
      setCharge((current) => ({ ...current, hits: 0 }));
    }, 2200);
  };
  return (
    <div
      className={`hero-art spirit-stage ${charge.hits ? "is-charging" : ""}`}
      style={{ "--charge": charge.hits / 5 }}
      ref={area}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      <button className="spirit-trigger" aria-label="唤醒灵石" onClick={awaken}>
        <div className="crystal-motion">
          <img
            src="/images/spirit-crystal.png"
            alt="金色灵石悬浮于玄黑岩石之上，灵气环绕"
          />
        </div>
        <canvas className="spirit-particles" ref={canvas} aria-hidden="true" />
        <span className="spirit-hint">
          <span>{charge.level ? `灵境 ${charge.level} 阶` : "连续轻触，凝聚灵气"}</span>
          <span className="spirit-charge-meter" aria-label={`灵气凝聚 ${charge.hits}/5`}>
            {Array.from({ length: 5 }, (_, i) => <i key={i} className={i < charge.hits ? "lit" : ""} />)}
          </span>
        </span>
        <span className="sr-only" role="status">{burst ? `灵境突破，当前 ${charge.level} 阶` : ""}</span>
        {burst && <span className="spirit-combo-burst" key={burst.id} aria-hidden="true"
          onAnimationEnd={(event) => { if (event.target === event.currentTarget) setBurst((current) => current?.id === burst.id ? null : current); }}>
          <i className="combo-ring" /><i className="combo-ring second" />
          <span className="combo-sigil">✦</span><strong>灵境突破</strong><small>灵石共鸣 · 第 {burst.level} 阶</small>
        </span>}
        {waves.map((awakening) => (
          <span
            key={awakening.id}
            className="spirit-awakening"
            style={{ left: `${awakening.x}%`, top: `${awakening.y}%` }}
            aria-hidden="true"
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget) {
                setWaves((current) => current.filter((wave) => wave.id !== awakening.id));
              }
            }}
          >
            <i className="spirit-wave" />
            <i className="spirit-wave second" />
            {Array.from({ length: 12 }, (_, i) => (
              <b
                className="spirit-spark"
                key={i}
                style={{
                  "--spark-angle": `${i * 30}deg`,
                  "--spark-distance": `${55 + (i % 3) * 20}px`,
                }}
              />
            ))}
          </span>
        ))}
      </button>
      <div className="vertical-poem">灵石聚气 · 仙道可期</div>
    </div>
  );
}

export function RewardEffect({ earned, upgraded }) {
  return (
    <div
      className={`reward-effect ${upgraded ? "golden-breakthrough" : "pill-received"}`}
      aria-hidden="true"
    >
      {upgraded > 0 && (
        <>
          <span className="breakthrough-ring" />
          <span className="breakthrough-ring second" />
        </>
      )}
      <span className="reward-float">
        {upgraded ? `+${upgraded} 金丹 · 十丹结金` : `+${earned} 筑基丹`}
      </span>
      {Array.from({ length: upgraded ? 16 : 8 }, (_, i) => (
        <i
          className="reward-mote"
          key={i}
          style={{
            "--mote-left": `${8 + ((i * 29) % 84)}%`,
            "--mote-delay": `${i * 45}ms`,
            "--mote-drift": `${(i % 2 ? 1 : -1) * (15 + i * 2)}px`,
          }}
        />
      ))}
    </div>
  );
}

export function useEntranceEffects() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const nodes = [
      ...document.querySelectorAll(
        ".content > .cultivation-grid, .board-grid > .panel, .rules",
      ),
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.08 },
    );
    nodes.forEach((node) => {
      node.classList.add("reveal-ready");
      observer.observe(node);
    });
    return () => {
      observer.disconnect();
      nodes.forEach((node) =>
        node.classList.remove("reveal-ready", "reveal-visible"),
      );
    };
  }, []);
}

export function BreakthroughNotice({ state, now }) {
  const holder = state.holders.find((h) => h.address === state.selected);
  const reward = holder && state.lastResult?.rewards[holder.address];
  if (!reward?.upgraded || now - state.lastResult.time >= 4500) return null;
  return (
    <aside
      key={state.lastResult.roundId}
      className="breakthrough-notice"
      role="status"
    >
      <div className="breakthrough-emblem">
        <span className="alchemy core" />
        <i />
      </div>
      <div>
        <strong>十丹结金，突破成功</strong>
        <p>凝成 {reward.upgraded} 个金丹 · 仙途更进一步</p>
      </div>
    </aside>
  );
}
