import React, { useEffect, useRef, useState } from "react";
import { createCharge } from "./charge";
import { combineInventory, emptyInventory } from "../engine";
const asset = (name) => `/images/flow/${name}.webp`;
export default function Alchemy({ mode, reduced, holding, interactive }) {
  const [progress, setProgress] = useState(0),
    [phase, setPhase] = useState("idle"),
    [amount, setAmount] = useState(10);
  const frame = useRef(0),
    charge = useRef(createCharge()),
    capture = useRef(null),
    phaseRef = useRef("idle");
  const stop = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    charge.current.cancel();
    holding.current = false;
    const c = capture.current;
    capture.current = null;
    if (c) {
      try {
        c.el.releasePointerCapture(c.id);
      } catch {}
    }
    if (phaseRef.current === "running") {
      phaseRef.current = "idle";
      setPhase("idle");
      setProgress(0);
    }
  };
  useEffect(() => {
    if (!interactive) stop();
  }, [interactive]);
  useEffect(() => {
    const blur = () => stop();
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", blur);
    return () => {
      cancelAnimationFrame(frame.current);
      holding.current = false;
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", blur);
    };
  }, []);
  const start = (manual = false, e) => {
    if (phaseRef.current === "running") return;
    if (e) {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      capture.current = { el: e.currentTarget, id: e.pointerId };
    }
    setProgress(0);
    setPhase("running");
    phaseRef.current = "running";
    holding.current = true;
    const began = performance.now();
    if (manual) charge.current.begin(began);
    const tick = (now) => {
      const p = reduced
        ? 1
        : manual
          ? charge.current.sample(now).progress
          : Math.min(1, (now - began) / (mode === "combine" ? 2600 : 2300));
      setProgress(p);
      if (p >= 1) {
        phaseRef.current = "done";
        setPhase("done");
        holding.current = false;
        const c = capture.current;
        capture.current = null;
        if (c) {
          try {
            c.el.releasePointerCapture(c.id);
          } catch {}
        }
      } else frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };
  const reset = () => {
    stop();
    phaseRef.current = "idle";
    setPhase("idle");
    setProgress(0);
  };
  const result = combineInventory({
    ...emptyInventory(),
    pills: amount,
  }).holder;
  return (
    <div
      className={`flow-alchemy flow-alchemy-${mode} flow-alchemy-${phase}`}
      style={{ "--brew": progress }}
    >
      <div className="flow-alchemy-art" aria-hidden="true">
        <div className="flow-alchemy-glow" />
        <img className="cauldron-art" src={asset("cauldron")} alt="" />
        {mode === "combine" && (
          <div className="pill-orbit">
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i * Math.PI) / 5 + progress * Math.PI * 3,
                r = phase === "done" ? 0 : 1 - progress;
              return (
                <img
                  key={i}
                  src={asset("foundation-pill")}
                  alt=""
                  style={{
                    transform: `translate(calc(-50% + ${Math.cos(a) * r * 170}px),calc(-50% + ${Math.sin(a) * r * 150}px)) scale(${1 - progress * 0.5})`,
                    opacity: progress > 0.82 ? 0 : 1,
                  }}
                />
              );
            })}
          </div>
        )}
        {phase === "done" && (
          <img
            className="flow-alchemy-result"
            src={asset(mode === "combine" ? "gold-core" : "foundation-pill")}
            alt=""
          />
        )}
        {phase === "running" && (
          <div className="flow-alchemy-streams">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} style={{ "--i": i }} />
            ))}
          </div>
        )}
      </div>
      {mode === "furnace" && (
        <button
          className="brew-stone"
          aria-label="按住灵石凝气"
          onPointerDown={(e) => {
            if (e.button === 0) start(true, e);
          }}
          onPointerUp={stop}
          onPointerCancel={stop}
          onLostPointerCapture={stop}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) {
              e.preventDefault();
              start(true);
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") stop();
          }}
          onBlur={stop}
        >
          <img src={asset("spirit-stone")} alt="灵石" />
          <span
            className="brew-ring"
            style={{
              background: `conic-gradient(#e8c382 ${progress * 360}deg,transparent 0deg)`,
            }}
          />
          <span>{phase === "running" ? "凝气中…" : "按住凝气"}</span>
        </button>
      )}
      <div className="flow-alchemy-controls">
        {mode === "combine" && (
          <div
            className="flow-alchemy-examples"
            role="group"
            aria-label="合丹材料示例"
          >
            {[10, 12].map((n) => (
              <button
                key={n}
                aria-pressed={amount === n}
                disabled={phase === "running"}
                onClick={() => {
                  reset();
                  setAmount(n);
                }}
              >
                {n} 丹示例
              </button>
            ))}
          </div>
        )}
        <button
          className="journey-action"
          disabled={phase === "running"}
          onClick={() => (phase === "done" ? reset() : start())}
        >
          {phase === "running"
            ? mode === "combine"
              ? "丹药汇聚中…"
              : "灵气入炉中…"
            : phase === "done"
              ? "再体验一次 ↺"
              : mode === "combine"
                ? "开始合丹 →"
                : "点火炼丹 →"}
        </button>
        <p className="flow-alchemy-outcome" role="status">
          {phase === "done"
            ? mode === "combine"
              ? `十丹结金，突破成功 · ${result.cores} 金丹 / ${result.pills} 筑基丹`
              : "这一炉：1 颗筑基丹，凝丹成功"
            : mode === "combine"
              ? `${amount} 筑基丹 → 1 金丹${amount === 12 ? " + 2 筑基丹" : ""}`
              : "可按住灵石，也可点击点火炼丹"}
        </p>
        <small>炼丹体验 · 持仓不变 · 不修改洞府资产</small>
      </div>
    </div>
  );
}
