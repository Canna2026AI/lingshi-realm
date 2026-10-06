import React, { useState } from "react";
import {
  TIERS,
  number,
  units,
  weight,
  rankName,
  shortAddress,
  setAutoCombine,
} from "../engine";
export default function WalletPanel({
  realm,
  compact = false,
  locked = false,
}) {
  const { state, queryWallet, update, notice } = realm;
  const h = state.holders.find((h) => h.address === state.selected);
  const [address, setAddress] = useState(h?.address || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = async (value) => {
    setBusy(true);
    setError("");
    try {
      const next = await queryWallet(value);
      setAddress(next.selected);
      notice("洞府已载入");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const sample =
    state.holders.find((x) => x.pills >= 10) ||
    state.holders.find((x) => x.balance === 3500000) ||
    state.holders[0];
  return (
    <section
      className={`forge-wallet ${compact ? "compact" : ""}`}
      inert={locked ? true : undefined}
      data-no-nav
      aria-label="我的修炼钱包"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(address);
        }}
      >
        <label htmlFor={`forge-address-${compact ? "c" : "f"}`}>
          我的洞府地址
        </label>
        <div>
          <input
            id={`forge-address-${compact ? "c" : "f"}`}
            aria-label="我的钱包地址"
            placeholder="输入完整 0x 钱包地址"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button disabled={busy}>{busy ? "查询中…" : "查询持仓"}</button>
        </div>
      </form>
      <button
        className="forge-sample"
        disabled={busy}
        onClick={() => load(sample.address)}
      >
        载入体验钱包 · {shortAddress(sample.address)}
      </button>
      {error && (
        <p className="forge-error" role="alert">
          {error}
        </p>
      )}
      {h ? (
        <>
          <div className="forge-balance">
            <span>灵石余额 · $LINGSHI</span>
            <strong>{number(h.balance)}</strong>
            <small>
              {rankName(h)} · {units(h.balance)} 修炼单位 · 权重{" "}
              {number(weight(h))}
            </small>
          </div>
          <div className="forge-tier-counts">
            {TIERS.map((t) => (
              <div key={t.field}>
                <img src={`/images/flow/${t.asset}.webp`} alt="" />
                <span>{t.name}</span>
                <b>{h[t.field]}</b>
              </div>
            ))}
          </div>
          <label className="forge-auto">
            <input
              type="checkbox"
              checked={h.autoCombine}
              onChange={async (e) => {
                const enabled = e.target.checked;
                try {
                  await update((s) => setAutoCombine(s, h.address, enabled));
                } catch {}
              }}
            />
            自动进阶 <small>关闭后可在炉中手动十合一</small>
          </label>
        </>
      ) : (
        <p className="forge-await">
          输入地址或载入体验钱包，查看灵石与五阶材料。
        </p>
      )}
    </section>
  );
}
