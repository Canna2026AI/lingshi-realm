import React from "react";
import { useState, useRef, useEffect } from "react";
import { Trophy, Search, Radio, Zap, ChevronDown } from "lucide-react";
import {
  sortedHolders,
  shortAddress,
  number,
  percentage,
  TIERS,
} from "../engine";
import { CopyAddress, Pill } from "./UI";
export function Leaderboard({ state, notice }) {
  const [query, setQuery] = useState("");
  const rows = sortedHolders(state.holders)
    .map((h, i) => ({ ...h, rank: i + 1 }))
    .filter((h) =>
      h.address.toLowerCase().includes(query.trim().toLowerCase()),
    );
  return (
    <section id="leaderboard" className="panel leaderboard">
      <div className="panel-title">
        <div>
          <h2>
            <Trophy size={21} />
            Holder 天骄榜
          </h2>
          <p>以灵石为序，见证每一位修仙者</p>
        </div>
        <label className="search">
          <Search size={16} />
          <input
            aria-label="搜索钱包地址"
            placeholder="搜索钱包地址"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div
        className="table-scroll"
        tabIndex={0}
        aria-label="天骄榜，可上下滚动"
      >
        <table>
          <thead>
            <tr>
              <th>排名</th>
              <th>钱包地址</th>
              <th className="numeric">灵石余额</th>
              <th className="numeric">持仓比例</th>
              <th className="numeric">筑基丹</th>
              <th className="numeric">金丹</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr
                key={h.address}
                className={state.selected === h.address ? "selected" : ""}
              >
                <td>
                  <span
                    className={`rank ${h.rank <= 3 ? `top top-${h.rank}` : ""}`}
                  >
                    {String(h.rank).padStart(2, "0")}
                  </span>
                </td>
                <td>
                  <div className="address-cell">
                    <span>{shortAddress(h.address)}</span>
                    <CopyAddress address={h.address} notice={notice} />
                  </div>
                  {h.rank === 1 && <small className="chief">首席天骄</small>}
                  {state.selected === h.address && (
                    <small className="my-label">我的钱包</small>
                  )}
                </td>
                <td className="numeric">{number(h.balance)}</td>
                <td className="numeric muted">
                  {percentage(h.balance, state.config.totalSupply)}
                </td>
                <td className="numeric">{h.pills}</td>
                <td className="numeric gold">{h.cores}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="holder-cards">
          {rows.map((h) => (
            <article
              className={`holder-card ${state.selected === h.address ? "selected" : ""}`}
              key={h.address}
            >
              <span className={`rank ${h.rank <= 3 ? "top" : ""}`}>
                {String(h.rank).padStart(2, "0")}
              </span>
              <div className="holder-card-main">
                <div className="holder-card-head">
                  <span>
                    {shortAddress(h.address)}
                    <CopyAddress address={h.address} notice={notice} />
                  </span>
                  <b>{number(h.balance)}</b>
                </div>
                <div className="holder-card-sub">
                  <span>
                    {h.rank === 1
                      ? "首席天骄"
                      : state.selected === h.address
                        ? "我的钱包"
                        : `持仓 ${percentage(h.balance, state.config.totalSupply)}`}
                  </span>
                  <span>
                    <Pill />
                    {h.pills}
                    <Pill core />
                    {h.cores}
                  </span>
                </div>
                {(h.rank === 1 || state.selected === h.address) && (
                  <small className="muted">
                    持仓 {percentage(h.balance, state.config.totalSupply)}
                  </small>
                )}
              </div>
            </article>
          ))}
        </div>
        {!rows.length && (
          <div className="no-results">
            <Search size={26} />
            <p>未找到匹配的钱包</p>
            <button className="text-button" onClick={() => setQuery("")}>
              清除搜索
            </button>
          </div>
        )}
      </div>
      <div className="table-footer">
        <span>
          共 {rows.length} 个地址 <span className="sep">/</span>按持仓降序
        </span>
        <span>
          向下滚动查看
          <ChevronDown size={13} />
        </span>
      </div>
    </section>
  );
}
function Event({ event }) {
  const time = new Date(event.time).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  });
  return (
    <article className={`event event-${event.type}`}>
      <span className="event-dot" />
      <div>
        <div className="event-meta">
          <span>
            {event.type === "core" || event.type === "upgrade"
              ? "境界突破"
              : event.type === "summary"
                ? `第 ${event.round} 轮快照`
                : "灵丹入府"}
          </span>
          <time>{time}</time>
        </div>
        <p>
          {event.type === "summary" ? (
            <>
              本轮快照完成，<b>{event.participants}</b> 个地址获得筑基丹
            </>
          ) : event.type === "core" || event.type === "upgrade" ? (
            <>
              {shortAddress(event.address)}
              <br />
              <b>
                {event.type === "core"
                  ? "十丹结金，突破成功"
                  : `${TIERS.find((t) => t.field === event.tier)?.name || "仙阶"}进阶，突破成功`}
              </b>
              {event.amount > 1
                ? ` · ${event.amount} 个${TIERS.find((t) => t.field === event.tier)?.name || "金丹"}`
                : ""}
            </>
          ) : (
            <>
              {shortAddress(event.address)} 获得 <b>{event.amount}</b> 颗筑基丹
            </>
          )}
        </p>
      </div>
    </article>
  );
}
export function SnapshotFeed({ state }) {
  const ref = useRef(),
    paused = useRef(false);
  useEffect(() => {
    let frame,
      last = 0,
      carry = 0;
    const step = (t) => {
      const el = ref.current;
      if (el && !paused.current && el.scrollHeight > el.clientHeight) {
        const dt = last ? Math.min(t - last, 32) : 0;
        carry += dt * 0.025;
        if (carry >= 1) {
          const pixels = Math.floor(carry);
          el.scrollTop += pixels;
          carry -= pixels;
        }
        if (el.scrollTop >= el.scrollHeight / 2 && el.dataset.loop === "true")
          el.scrollTop -= el.scrollHeight / 2;
      }
      last = t;
      frame = requestAnimationFrame(step);
    };
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [state.events.length]);
  return (
    <section id="snapshots" className="panel snapshots">
      <div className="panel-title">
        <h2>
          <Radio size={21} />
          灵脉快照动态
        </h2>
        <span className="live-dot" title="修炼动态" />
      </div>
      <div
        className="feed-scroll"
        data-loop={state.events.length > 6}
        ref={ref}
        tabIndex={0}
        aria-label="快照动态，悬停暂停滚动"
        onMouseEnter={() => (paused.current = true)}
        onMouseLeave={() => (paused.current = false)}
        onFocus={() => (paused.current = true)}
        onBlur={() => (paused.current = false)}
        onTouchStart={() => (paused.current = true)}
        onTouchEnd={() => (paused.current = false)}
      >
        {state.events.length ? (
          <>
            {state.events.map((e) => (
              <Event key={e.id} event={e} />
            ))}
            {state.events.length > 6 && (
              <div aria-hidden="true">
                {state.events.map((e) => (
                  <Event key={`repeat-${e.id}`} event={e} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="empty-feed">
            <div className="orbital">
              <div />
              <Pill core />
            </div>
            <h3>等待灵脉苏醒</h3>
            <p>
              首次快照后，发丹与突破记录
              <br />
              将在此汇聚
            </p>
          </div>
        )}
      </div>
      <div className="feed-foot">
        <span>
          {state.round
            ? `已完成 ${state.round} 轮快照`
            : "每轮快照，都是一次进阶"}
        </span>
      </div>
    </section>
  );
}
