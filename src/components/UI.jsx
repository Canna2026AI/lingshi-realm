import React from "react";
import { useEffect, useRef } from "react";
import { Copy, X } from "lucide-react";
export function Brand({ href = "#home" }) {
  return (
    <a className="brand" href={href} aria-label="灵石仙宗首页">
      <span className="brand-mark">
        <img src="/images/lingshi-logo.png" width="44" height="44" alt="" aria-hidden="true" />
      </span>
      <span>
        <strong>灵石仙宗</strong>
        <small>LINGSHI REALM</small>
      </span>
    </a>
  );
}
export function CopyAddress({ address, notice }) {
  return (
    <button
      className="copy"
      title={address}
      aria-label={`复制地址 ${address}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(address);
          notice("完整地址已复制");
        } catch {
          notice("复制失败，请在钱包选择窗口复制完整地址。");
        }
      }}
    >
      <Copy size={14} />
    </button>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const old = document.activeElement,
      prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = ref.current.querySelectorAll(
          "button:not(:disabled), input, select, textarea, a[href]",
        );
        if (!nodes.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", key);
      old?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""}`}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="关闭窗口"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Pill({ core = false }) {
  return (
    <span
      aria-hidden="true"
      className={core ? "alchemy core" : "alchemy pill"}
    />
  );
}
export function Countdown({ nextAt, now }) {
  const sec = Math.max(0, Math.ceil((nextAt - now) / 1000));
  return (
    <span className="countdown">
      {String(Math.floor(sec / 60)).padStart(2, "0")}
      <i>:</i>
      {String(sec % 60).padStart(2, "0")}
    </span>
  );
}
