import React from "react";
import {
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  ChevronRight,
  Coins,
} from "lucide-react";
import { number, percentage, units, weight, shortAddress } from "../engine";
import { Pill, CopyAddress, Countdown } from "./UI";
import Inventory from "./Inventory";
import { RewardEffect } from "./Effects";
export default function Cultivation({ state, now, choose, notice, update }) {
  const h = state.holders.find((h) => h.address === state.selected),
    u = h ? units(h.balance) : 0,
    reward = h && state.lastResult?.rewards[h.address],
    recent = state.lastResult && now - state.lastResult.time < 4500;
  const claim = async () => {
    if (!h) {
      choose();
      return;
    }
    if (h.claimed) {
      notice("本次领取已完成 · 不产生真实 BNB 转账");
      return;
    }
    await update((s) => ({
      ...s,
      holders: s.holders.map((x) =>
        x.address === h.address ? { ...x, claimed: true } : x,
      ),
    }));
    notice("领取体验完成 · 不产生真实 BNB 转账");
  };
  return (
    <section id="cultivation" className="cultivation-grid section-gap">
      <div
        className={`panel cultivation ${recent && reward?.upgraded ? "breakthrough" : ""}`}
      >
        {recent && reward && (
          <RewardEffect
            key={state.lastResult.roundId}
            earned={reward.earned}
            upgraded={reward.upgraded}
          />
        )}
        <div className="panel-title">
          <h2>
            <Wallet size={20} />
            我的修炼
          </h2>
          <button className="text-button" onClick={choose}>
            {h ? "切换钱包" : "选择钱包"}
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="wallet-line">
          <div className="wallet-tag">
            <span className="wallet-dot" />
            {h ? shortAddress(h.address) : "待入仙宗"}
            {h && <CopyAddress address={h.address} notice={notice} />}
          </div>
          {h ? (
            <span className={`eligibility ${u ? "eligible" : ""}`}>
              <CheckCircle2 size={13} />
              {u ? "已达到修炼门槛" : "尚未达到 10 万灵石门槛"}
            </span>
          ) : (
            <span className="muted">选择一个钱包，开启你的修炼之旅</span>
          )}
          <div className="next-snapshot">
            <Clock size={13} />
            <span>宗门轮次</span>
            <span className="countdown">第 {state.round} 轮</span>
          </div>
        </div>
        <div
          className={`cultivation-numbers ${recent && reward ? "reward-pulse" : ""}`}
          key={state.round}
        >
          <div className="balance-cell">
            <span>
              灵石余额 <small>($LINGSHI)</small>
            </span>
            <strong>{h ? number(h.balance) : "—"}</strong>
          </div>
          <div>
            <span>持仓比例</span>
            <strong>
              {h ? percentage(h.balance, state.config.totalSupply) : "—"}
            </strong>
          </div>
          <div>
            <span>修炼单位</span>
            <strong>{h ? u : "—"}</strong>
          </div>
          <div>
            <span>
              <Pill />
              筑基丹
            </span>
            <strong>{h ? h.pills : "—"}</strong>
          </div>
          <div>
            <span>
              <Pill core />
              金丹
            </span>
            <strong className={recent && reward?.upgraded ? "core-pop" : ""}>
              {h ? h.cores : "—"}
            </strong>
          </div>
          <div>
            <span>当前权重</span>
            <strong className="gold">{h ? weight(h) : "—"}</strong>
          </div>
        </div>
        {h && <Inventory holder={h} update={update} notice={notice} />}
        {h && (
          <div
            className="pill-meter"
            role="img"
            aria-label={`筑基丹进度 ${h.pills}/10`}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <span className={i < h.pills ? "filled" : ""} key={i} />
            ))}
          </div>
        )}
        <div className="cultivation-foot">
          <span>
            {h
              ? `距离下个金丹还需 ${Math.max(0, 10 - h.pills)} 颗筑基丹`
              : "每持有 10 万灵石获得一个修炼单位"}
          </span>
          {recent && reward?.upgraded ? (
            <b className="gold">十丹结金，突破成功</b>
          ) : (
            <span>
              筑基丹权重 1 <span className="sep">/</span> 金丹权重 12
            </span>
          )}
        </div>
      </div>
      <div className="panel dividend">
        <div className="panel-title">
          <h2>
            <Coins size={20} />
            BNB 分红
          </h2>
          <ArrowUpRight size={17} className="muted" />
        </div>
        <div className="bnb">
          <strong>0.0000</strong>
          <span>BNB</span>
        </div>
        <button className="button primary" onClick={claim}>
          {h?.claimed ? "已完成领取" : "领取体验"}
          <ArrowUpRight size={16} />
        </button>
        <small>领取流程体验 · 无链上转账</small>
      </div>
    </section>
  );
}
