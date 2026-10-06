import React, { useEffect, useRef, useState } from "react";
import { createCharge } from "./charge";
import { TIERS, combineWallet } from "../engine";
import WalletPanel from "./WalletPanel";
const asset = (name) => `/images/flow/${name}.webp`;
export default function Alchemy({
  mode,
  reduced,
  holding,
  interactive,
  realm,
}) {
  const [progress, setProgress] = useState(0),
    [phase, setPhase] = useState("idle"),
    [tier, setTier] = useState(0),
    [feedback, setFeedback] = useState(""),
    [produced, setProduced] = useState(null),
    [tap, setTap] = useState(0);
  const frame = useRef(0),
    charge = useRef(createCharge()),
    capture = useRef(null),
    phaseRef = useRef("idle"),
    manualRef = useRef(false),
    alive = useRef(true);
  const h = realm.state.holders.find((h) => h.address === realm.state.selected);
  const from = TIERS[tier],
    to = TIERS[tier + 1];
  const stop = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    charge.current.cancel();
    holding.current = false;
    const c = capture.current;
    capture.current = null;
    if (c)
      try {
        c.el.releasePointerCapture(c.id);
      } catch {}
    if (phaseRef.current === "running") {
      phaseRef.current = "idle";
      setPhase("idle");
      setProgress(0);
      setFeedback("聚气已暂停，可继续长按或点击点火。");
    }
    manualRef.current = false;
  };
  useEffect(() => {
    if (!interactive) stop();
  }, [interactive]);
  useEffect(() => {
    alive.current = true;
    const blur = () => {
      if (manualRef.current) stop();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", blur);
    return () => {
      alive.current = false;
      cancelAnimationFrame(frame.current);
      holding.current = false;
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", blur);
    };
  }, []);
  const start = (manual = false, event) => {
    if (
      phaseRef.current === "running" ||
      phaseRef.current === "committing" ||
      !interactive
    )
      return;
    setTap((n) => n + 1);
    setProduced(null);
    if (!h) {
      setFeedback("请先输入钱包地址，或载入体验钱包。");
      realm.notice("请先载入我的洞府");
      return;
    }
    if (event) {
      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
        capture.current = { el: event.currentTarget, id: event.pointerId };
      } catch {}
    }
    setProgress(0);
    setFeedback("");
    setPhase("running");
    phaseRef.current = "running";
    manualRef.current = manual;
    holding.current = true;
    const began = performance.now(),
      address = h.address,
      index = tier;
    if (manual) charge.current.begin(began);
    const complete = async () => {
      phaseRef.current = "committing";
      manualRef.current = false;
      holding.current = false;
      const c = capture.current;
      capture.current = null;
      if (c)
        try {
          c.el.releasePointerCapture(c.id);
        } catch {}
      try {
        if (h[TIERS[index].field] < 10) {
          if (alive.current)
            setFeedback(
              `灵气已聚拢 · 还需 ${10 - h[TIERS[index].field]} 个${TIERS[index].name}，本炉未合成。`,
            );
        } else {
          const next = await realm.update((s) =>
            combineWallet(s, address, index),
          );
          const after = next.holders.find((x) => x.address === address);
          if (alive.current) {
            setProduced(TIERS[index + 1].asset);
            setFeedback(
              `突破成功 · 消耗 10 ${TIERS[index].name}，获得 1 ${TIERS[index + 1].name} · 剩余 ${after[TIERS[index].field]} ${TIERS[index].name}`,
            );
          }
          realm.notice(
            index === 0
              ? "十丹结金，突破成功"
              : `${TIERS[index + 1].name}进阶，突破成功`,
          );
        }
      } catch (e) {
        if (alive.current) setFeedback(e.message);
      } finally {
        phaseRef.current = "done";
        if (alive.current) setPhase("done");
      }
    };
    const tick = (now) => {
      const p = reduced
        ? 1
        : manual
          ? charge.current.sample(now).progress
          : Math.min(1, (now - began) / 2300);
      setProgress(p);
      if (p >= 1) complete();
      else frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };
  useEffect(() => {
    if (
      phaseRef.current !== "running" &&
      phaseRef.current !== "committing" &&
      !produced
    )
      setFeedback("");
  }, [h?.address, h?.[from.field]]);
  const running = phase === "running" || phase === "committing";
  return (
    <div
      className={`flow-alchemy flow-alchemy-${mode} flow-alchemy-${phase}`}
      style={{ "--brew": progress }}
    >
      <WalletPanel
        realm={realm}
        compact={mode === "combine"}
        locked={running}
      />
      <div className="flow-alchemy-art" aria-hidden="true">
        <div className="flow-alchemy-glow" />
        <img className="cauldron-art" src={asset("cauldron")} alt="" />
        <div className="brew-stone">
          <img
            src={asset(mode === "combine" ? from.asset : "spirit-stone")}
            alt=""
          />
          <span
            className="brew-ring"
            style={{
              background: `conic-gradient(#e8c382 ${progress * 360}deg,transparent 0deg)`,
            }}
          />
          <span>{running ? "凝气中…" : "长按整座熔炼炉"}</span>
        </div>
        {mode === "combine" && (
          <div className="pill-orbit">
            {Array.from(
              { length: Math.min(10, h?.[from.field] || 0) },
              (_, i) => {
                const a = (i * Math.PI) / 5 + progress * Math.PI * 3,
                  r = 1 - progress;
                return (
                  <img
                    key={i}
                    src={asset(from.asset)}
                    alt=""
                    style={{
                      transform: `translate(calc(-50% + ${Math.cos(a) * r * 170}px),calc(-50% + ${Math.sin(a) * r * 150}px)) scale(${1 - progress * 0.5})`,
                      opacity: progress > 0.82 ? 0 : 1,
                    }}
                  />
                );
              },
            )}
          </div>
        )}
        {produced && (
          <img className="flow-alchemy-result" src={asset(produced)} alt="" />
        )}
        {running && (
          <div className="flow-alchemy-streams">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} style={{ "--i": i }} />
            ))}
          </div>
        )}
        {tap > 0 && <div key={tap} className="forge-touch-wave" />}
      </div>
      <button
        className="forge-hit"
        aria-label="按住整个熔炼炉凝气，点击也可点火"
        data-no-nav
        onPointerDown={(e) => {
          if (e.button === 0) start(true, e);
        }}
        onPointerUp={() => {
          if (manualRef.current) stop();
        }}
        onPointerCancel={stop}
        onLostPointerCapture={() => {
          if (capture.current) stop();
        }}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            start(true);
          }
        }}
        onKeyUp={(e) => {
          if ((e.key === " " || e.key === "Enter") && manualRef.current) stop();
        }}
        onBlur={() => {
          if (manualRef.current) stop();
        }}
        onClick={() => start(false)}
      />
      <div className="flow-alchemy-controls" data-no-nav>
        <div
          className="forge-tier-select"
          role="group"
          aria-label="选择熔炼等级"
        >
          {TIERS.slice(0, -1).map((t, i) => (
            <button
              key={t.field}
              aria-pressed={tier === i}
              disabled={running}
              onClick={() => {
                setTier(i);
                setProduced(null);
                setFeedback("");
                setPhase("idle");
                phaseRef.current = "idle";
                setProgress(0);
              }}
            >
              {TIERS[i + 1].name}
            </button>
          ))}
        </div>
        <button
          className="journey-action"
          disabled={running}
          onClick={() => start(false)}
        >
          {running ? `正在熔炼 ${Math.round(progress * 100)}%` : "点火炼丹 →"}
        </button>
        <p className="flow-alchemy-outcome" role="status">
          {feedback ||
            `10 ${from.name} → 1 ${to.name} · 当前 ${h?.[from.field] || 0} 个${from.name}`}
        </p>
        <small>合丹消耗已有材料，灵石持仓保留。</small>
      </div>
    </div>
  );
}
