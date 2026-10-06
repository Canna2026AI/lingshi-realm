import React, { useEffect, useRef, useState } from "react";
import {
  TIERS,
  sortedHolders,
  weight,
  units,
  shortAddress,
  number,
  rankName,
} from "../engine";
import Inventory from "../components/Inventory";
import { flowArt } from "./Gallery";
export default function RealmBoard({ realm, notice, restart }) {
  const { state, update, queryWallet } = realm;
  const [mode, setMode] = useState("weight"),
    [query, setQuery] = useState(""),
    [draft, setDraft] = useState(""),
    [searching, setSearching] = useState(false),
    [detail, setDetail] = useState(null),
    [copied, setCopied] = useState(false);
  const dialog = useRef(),
    copyTimer = useRef();
  const ranked = sortedHolders(state.holders, mode).map((h, i) => ({
      ...h,
      rank: i + 1,
    })),
    rows = ranked.filter((h) =>
      h.address.toLowerCase().includes(query.trim().toLowerCase()),
    );
  const h = state.holders.find((h) => h.address === detail);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  useEffect(() => {
    if (!detail) return;
    const prior = document.activeElement;
    dialog.current?.querySelector("button")?.focus();
    const key = (e) => {
      if (e.key === "Escape") setDetail(null);
      if (e.key === "Tab") {
        const controls = [
          ...dialog.current.querySelectorAll("button:not(:disabled),input,a"),
        ];
        const first = controls[0],
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
  }, [detail]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(h.address);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      notice("复制未完成，可选中完整地址复制。");
    }
  };
  const myCave = () => {
    setDetail(
      state.selected ||
        ranked.find((x) => x.balance === 3500000)?.address ||
        ranked[0].address,
    );
  };
  return (
    <>
      <section
        className="realm-board"
        aria-label="宗门天骄榜"
        inert={detail ? true : undefined}
      >
        <img className="scroll-art" src={flowArt("scroll")} alt="" />
        <div className="scroll-content">
          <h1>宗门天骄榜</h1>
          <p className="board-motto">灵石汇英才，道心照千秋。</p>
          <div className="board-filters">
            <div role="group" aria-label="榜单排序">
              <button
                aria-pressed={mode === "weight"}
                onClick={() => setMode("weight")}
              >
                仙阶榜
              </button>
              <button
                aria-pressed={mode === "balance"}
                onClick={() => setMode("balance")}
              >
                灵石榜
              </button>
            </div>
            <form
              className="board-search"
              onSubmit={(e) => {
                e.preventDefault();
                setQuery(draft.trim());
              }}
              data-no-nav
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="输入完整钱包地址，或部分地址搜索"
                aria-label="搜索天骄地址"
                spellCheck={false}
              />
              <button type="submit">搜索</button>
              <button
                type="button"
                disabled={searching}
                onClick={async () => {
                  setSearching(true);
                  try {
                    const next = await queryWallet(draft);
                    setDraft(next.selected);
                    setQuery(next.selected);
                    setDetail(next.selected);
                  } catch (e) {
                    notice(e.message);
                  } finally {
                    setSearching(false);
                  }
                }}
              >
                {searching ? "查询中…" : "查询持仓"}
              </button>
            </form>
          </div>
          <div className="board-tier-legend">
            {TIERS.map((t) => (
              <span key={t.field}>
                <img src={flowArt(t.asset)} alt="" />
                {t.name}
                <small>权重 {number(t.weight)}</small>
              </span>
            ))}
          </div>
          {!query && (
            <div className="board-podium">
              {ranked.slice(0, 3).map((x) => (
                <button key={x.address} onClick={() => setDetail(x.address)}>
                  <img
                    src={flowArt(
                      [...TIERS].reverse().find((t) => x[t.field] > 0)?.asset ||
                        "spirit-stone",
                    )}
                    alt=""
                  />
                  <div>
                    <strong>{["壹", "贰", "叁"][x.rank - 1]}</strong>
                    <b>{x.rank === 1 ? "首席天骄" : `第${x.rank}席`}</b>
                    <span>{shortAddress(x.address)}</span>
                    <small>
                      {mode === "weight"
                        ? `权重 ${number(weight(x))}`
                        : `${number(x.balance)} 灵石`}
                    </small>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div
            className="board-scroll"
            tabIndex={0}
            aria-label="宗门榜单，可上下滚动"
          >
            <table>
              <thead>
                <tr>
                  <th>排名</th>
                  <th>道友</th>
                  <th>灵石余额</th>
                  <th>仙阶</th>
                  {TIERS.map((t) => (
                    <th key={t.field} className="tier-column">
                      {t.name}
                    </th>
                  ))}
                  <th>权重</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => (
                  <tr
                    key={x.address}
                    className={state.selected === x.address ? "mine" : ""}
                  >
                    <td>{String(x.rank).padStart(2, "0")}</td>
                    <td>
                      <button
                        aria-label={`查看道友 ${shortAddress(x.address)}`}
                        onClick={() => setDetail(x.address)}
                      >
                        {shortAddress(x.address)}
                        {state.selected === x.address && <em>我的洞府</em>}
                      </button>
                    </td>
                    <td>{number(x.balance)}</td>
                    <td>{rankName(x)}</td>
                    {TIERS.map((t) => (
                      <td key={t.field} className="tier-column">
                        {number(x[t.field])}
                      </td>
                    ))}
                    <td>{number(weight(x))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="board-mobile-cards">
              {rows.map((x) => (
                <button
                  key={x.address}
                  className={state.selected === x.address ? "mine" : ""}
                  onClick={() => setDetail(x.address)}
                >
                  <strong>{String(x.rank).padStart(2, "0")}</strong>
                  <span>
                    <b>{shortAddress(x.address)}</b>
                    <small>
                      {rankName(x)} ·{" "}
                      {state.selected === x.address
                        ? "我的洞府"
                        : `${number(x.balance)} 灵石`}
                    </small>
                    <span className="board-card-tiers">
                      {TIERS.map((t) => (
                        <span key={t.field}>
                          {t.name} <b>{x[t.field]}</b>
                        </span>
                      ))}
                    </span>
                  </span>
                  <span>
                    {number(weight(x))}
                    <small>权重</small>
                  </span>
                </button>
              ))}
            </div>
            {!rows.length && (
              <div className="board-empty">
                未找到匹配的道友
                <button
                  onClick={() => {
                    setQuery("");
                    setDraft("");
                  }}
                >
                  清除搜索
                </button>
              </div>
            )}
          </div>
          <div className="board-bottom">
            <span>
              {rows.length} 位道友 · 按{mode === "weight" ? "权重" : "灵石余额"}
              排序
            </span>
            <button onClick={myCave}>查看我的洞府 →</button>
            <button onClick={restart}>重新启程 ↺</button>
          </div>
        </div>
      </section>
      {h && (
        <div
          className="cave-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="道友洞府"
          ref={dialog}
        >
          <button
            className="cave-close"
            aria-label="关闭洞府"
            onClick={() => setDetail(null)}
          >
            ×
          </button>
          <span>道友洞府</span>
          <h2>{shortAddress(h.address)}</h2>
          <div className="cave-address">
            <code>{h.address}</code>
            <button onClick={copy}>{copied ? "已复制" : "复制地址"}</button>
          </div>
          <div className="cave-metrics">
            <div>
              灵石余额<b>{number(h.balance)}</b>
            </div>
            <div>
              修炼单位<b>{units(h.balance)}</b>
            </div>
            <div>
              当前权重<b>{number(weight(h))}</b>
            </div>
            <div>
              当前仙阶<b>{rankName(h)}</b>
            </div>
          </div>
          <Inventory holder={h} update={update} notice={notice} />
          <div className="cave-actions">
            <button
              className="journey-action"
              onClick={async () => {
                try {
                  await update((s) => ({ ...s, selected: h.address }));
                  notice("已设为我的洞府");
                } catch {}
              }}
            >
              {state.selected === h.address ? "已选中我的洞府" : "设为我的洞府"}
            </button>
            <a href="/realm">完整修炼页面 ↗</a>
          </div>
          <p className="cave-help">
            100,000 灵石 / 修炼单位 · 合丹消耗已有仙阶材料，灵石余额保留。
          </p>
          <h3>近期突破</h3>
          <div className="cave-events">
            {state.events
              .filter(
                (e) =>
                  e.address === h.address &&
                  (e.type === "core" || e.type === "upgrade"),
              )
              .slice(0, 4)
              .map((e) => (
                <p key={e.id}>
                  {new Date(e.time).toLocaleTimeString("zh-CN", {
                    hour12: false,
                    timeZone: "Asia/Taipei",
                  })}{" "}
                  · 获得 {e.amount} 个
                  {TIERS.find((t) => t.field === e.tier)?.name || "金丹"}
                </p>
              ))}
            {!state.events.some(
              (e) =>
                e.address === h.address &&
                (e.type === "core" || e.type === "upgrade"),
            ) && <p>尚无突破记录，修行由此开始。</p>}
          </div>
        </div>
      )}
    </>
  );
}
