import React from "react";
import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  Coins,
  Flame,
  Clock,
  Users,
  BookOpen,
  Menu,
  X,
  CheckCircle2,
  Gem,
} from "lucide-react";
import { useRealm } from "./store";
import { Brand } from "./components/UI";
import {
  SpiritCrystal,
  useEntranceEffects,
  BreakthroughNotice,
} from "./components/Effects";
import Cultivation from "./components/Cultivation";
import { Leaderboard, SnapshotFeed } from "./components/Leaderboard";
import WalletPicker from "./components/WalletPicker";
import { number, shortAddress } from "./engine";
export default function App() {
  useEntranceEffects();
  const [toast, setToast] = useState(null),
    [walletOpen, setWalletOpen] = useState(false),
    [mobileNav, setMobileNav] = useState(false);
  const timer = useRef();
  const notice = (message) => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4500);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  const { state, now, update, queryWallet } = useRealm(notice);
  const choose = () => setWalletOpen(true);
  const select = async (address) => {
    await update((s) => ({ ...s, selected: address }));
    setWalletOpen(false);
    notice("已进入仙宗，仙途由此开启");
    document
      .getElementById("cultivation")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <span className="ticker">$LINGSHI</span>
          <nav className={mobileNav ? "open" : ""} aria-label="主导航">
            {[
              ["项目介绍", "home"],
              ["我的修炼", "cultivation"],
              ["天骄榜", "leaderboard"],
              ["快照动态", "snapshots"],
            ].map(([name, id]) => (
              <a href={`#${id}`} key={id} onClick={() => setMobileNav(false)}>
                {name}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <button className="button primary header-cta" onClick={choose}>
              {state.selected ? shortAddress(state.selected) : "进入仙宗"}
              <ArrowRight size={15} />
            </button>
            <button
              className="icon-button menu-toggle"
              aria-label={mobileNav ? "关闭导航" : "打开导航"}
              onClick={() => setMobileNav(!mobileNav)}
            >
              {mobileNav ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>
      <main id="home">
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-copy">
              <h1>
                持<span>灵石</span>，踏仙途
              </h1>
              <h2>定时快照，凝丹进阶</h2>
              <p>
                以灵石为基，聚天地灵气。
                <br />
                持有 $LINGSHI，积丹结金，开启你的链上修仙之旅。
              </p>
              <div className="hero-actions">
                <button className="button primary large" onClick={choose}>
                  开始修炼
                  <ArrowRight size={19} />
                </button>
                <a className="button outline large" href="#rules">
                  了解修炼规则
                  <ArrowRight size={17} />
                </a>
              </div>
              <div className="network">
                <span className="bnb-mark">
                  <Gem size={13} />
                </span>
                BNB Smart Chain
                <span className="network-line" />
                <span>Lingshi Realm</span>
              </div>
            </div>
            <SpiritCrystal />
          </div>
        </section>
        <div className="stats-band">
          <div className="stats-inner">
            {[
              {
                icon: Coins,
                label: "灵石总供应量",
                value: number(state.config.totalSupply),
              },
              {
                icon: Flame,
                label: "修炼门槛",
                value: "100,000",
                suffix: "枚起修",
              },
              {
                icon: Clock,
                label: "快照周期",
                value: state.config.intervalMinutes,
                suffix: "分钟 / 轮",
              },
              {
                icon: Users,
                label: "仙宗 Holder",
                value: state.holders.length,
                suffix: "位修仙者",
              },
            ].map(({ icon: Icon, label, value, suffix }) => (
              <div className="stat" key={label}>
                <span className="stat-icon">
                  <Icon size={25} strokeWidth={1.6} />
                </span>
                <div>
                  <span className="stat-label">{label}</span>
                  <div className="stat-value">
                    {value}
                    {suffix && <small>{suffix}</small>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="content">
          <Cultivation
            state={state}
            now={now}
            choose={choose}
            notice={notice}
            update={update}
          />
          <div className="board-grid section-gap">
            <Leaderboard state={state} notice={notice} />
            <SnapshotFeed state={state} />
          </div>
          <section id="rules" className="rules section-gap">
            <div className="rules-title">
              <h2>
                <BookOpen size={21} />
                修炼之道
              </h2>
              <span>以灵石为始，循天道而行</span>
            </div>
            <div className="rule-steps">
              {[
                {
                  title: "持有灵石",
                  text: "持有 10 万灵石，开启修炼",
                  detail: `每 ${number(100000)} 枚灵石，计为一个修炼单位。`,
                },
                {
                  title: "定时凝丹",
                  text: "每单位，每轮获得 1 颗筑基丹",
                  detail: `每 ${state.config.intervalMinutes} 分钟快照，单位数量向下取整。`,
                },
                {
                  title: "十丹结金",
                  text: "10 颗筑基丹 → 1 个金丹",
                  detail: "自动消耗、保留余丹，金丹权重为 12。",
                },
              ].map((r, i) => (
                <div className="rule-step" key={r.title}>
                  <span className="rule-number">0{i + 1}</span>
                  <div>
                    <h3>{r.title}</h3>
                    <p>{r.text}</p>
                    <small>{r.detail}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <footer>
        <div className="footer-inner">
          <Brand />
          <p>以灵石，证道长生</p>
          <span>
            BNB Smart Chain <i>·</i> $LINGSHI
          </span>
        </div>
      </footer>
      {walletOpen && (
        <WalletPicker
          queryWallet={queryWallet}
          state={state}
          onClose={() => setWalletOpen(false)}
          onSelect={select}
        />
      )}{" "}
      <BreakthroughNotice state={state} now={now} />
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
        </div>
      )}
    </>
  );
}
