import React from "react";
import { useState } from "react";
import {
  Info,
  RefreshCw,
  Zap,
  RotateCcw,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import {
  number,
  generateHolders,
  freshState,
  saveConfiguration,
  validateHolders,
  validateConfig,
} from "../engine";
export default function Admin({
  state,
  update,
  notice,
  snapshot,
  busy,
}) {
  const [config, setConfig] = useState({ ...state.config }),
    [drafts, setDrafts] = useState(
      state.holders.map((h) => ({
        address: h.address,
        balance: String(h.balance),
      })),
    ),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false),
    [saving, setSaving] = useState(false);
  const change = (key, value) => setConfig((c) => ({ ...c, [key]: value }));
  const save = async () => {
    setError("");
    setSaving(true);
    try {
      const normalized = { ...config, ca: config.ca.trim() },
        holders = drafts.map((h) => ({
          ...h,
          address: h.address.trim(),
          balance: Number(h.balance),
        }));
      validateConfig(normalized);
      validateHolders(holders, normalized.totalSupply);
      const next = await update((s) =>
        saveConfiguration(s, normalized, holders),
      );
      setDrafts(
        next.holders.map((h) => ({
          address: h.address,
          balance: String(h.balance),
        })),
      );
      notice("配置已保存 · 当前使用本地 Holder，真实数据接口待接入");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const regenerate = () => {
    try {
      validateConfig(config);
      setDrafts(
        generateHolders(config.totalSupply, Date.now() % 100000).map((h) => ({
          address: h.address,
          balance: String(h.balance),
        })),
      );
      setError("");
      notice("新 Holder 已生成，点击保存配置后生效");
    } catch (e) {
      setError(e.message);
    }
  };
  const reset = async () => {
    const next = await update(() => freshState());
    setConfig({ ...next.config });
    setDrafts(next.holders.map(h => ({ address: h.address, balance: String(h.balance) })));
    setError("");
    setConfirm(false);
    notice("仙宗数据已重置");
  };
  return (
    <section className="panel admin-workspace" aria-label="管理配置">
      <div className="admin-notice">
        <Info size={16} />
        <span>当前使用本地 Holder，真实数据接口待接入</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="form-grid">
          <label className="span-two">
            Token CA <span>（可选）</span>
            <input
              aria-label="Token CA"
              value={config.ca}
              placeholder="输入 BSC 合约地址，0x…"
              onChange={(e) => change("ca", e.target.value)}
            />
            <small>更换 CA 后重新加载 Holder，并清空当前修炼记录。</small>
          </label>
          <label>
            总供应量
            <input
              aria-label="总供应量"
              type="number"
              min="1000"
              step="1"
              value={config.totalSupply}
              onChange={(e) => change("totalSupply", Number(e.target.value))}
            />
          </label>
          <div className="form-label">
            快照周期
            <div className="segmented">
              {[5, 10].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={config.intervalMinutes === n ? "active" : ""}
                  onClick={() => change("intervalMinutes", n)}
                >
                  {n} 分钟
                </button>
              ))}
            </div>
          </div>
          <div className="threshold span-two">
            <span>
              参与门槛 <b>0.1%</b>
            </span>
            <span>
              {number(config.totalSupply / 1000)} <small>LINGSHI / 单位</small>
            </span>
          </div>
        </div>
        <div className="editor-heading">
          <h3>
            Holder 数据 <small>{drafts.length} 个地址</small>
          </h3>
          <button type="button" className="text-button" onClick={regenerate}>
            <RefreshCw size={14} />
            重新生成
          </button>
        </div>
        <div className="holder-editor">
          <div className="editor-labels">
            <span>钱包地址</span>
            <span>灵石余额</span>
            <span />
          </div>
          {drafts.map((h, i) => (
            <div className="editor-row" key={i}>
              <input
                aria-label={`Holder ${i + 1} 地址`}
                value={h.address}
                onChange={(e) =>
                  setDrafts((rows) =>
                    rows.map((x, j) =>
                      i === j ? { ...x, address: e.target.value } : x,
                    ),
                  )
                }
              />
              <input
                aria-label={`Holder ${i + 1} 余额`}
                type="number"
                min="0"
                step="1"
                value={h.balance}
                onChange={(e) =>
                  setDrafts((rows) =>
                    rows.map((x, j) =>
                      i === j ? { ...x, balance: e.target.value } : x,
                    ),
                  )
                }
              />
              <button
                className="icon-button"
                type="button"
                aria-label={`删除 Holder ${i + 1}`}
                onClick={() =>
                  setDrafts((rows) => rows.filter((_, j) => i !== j))
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="editor-footer">
          <button
            className="text-button"
            type="button"
            onClick={() =>
              setDrafts((rows) => [...rows, { address: "", balance: "0" }])
            }
          >
            <Plus size={14} />
            添加地址
          </button>
          <span>
            余额合计{" "}
            {number(drafts.reduce((s, h) => s + (Number(h.balance) || 0), 0))}
          </span>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="admin-actions">
          <button className="button primary" type="submit" disabled={saving}>
            <Save size={16} />
            {saving ? "保存中…" : "保存配置"}
          </button>
          <button
            type="button"
            className="button outline"
            disabled={busy}
            onClick={() => snapshot()}
          >
            <Zap size={16} />
            立即模拟快照
          </button>
          <button
            type="button"
            className="text-button reset"
            onClick={() => setConfirm(true)}
          >
            <RotateCcw size={14} />
            重置数据
          </button>
        </div>
        <p className="admin-help">
          快照读取已保存的 Holder 数据；编辑后请先保存配置。
        </p>
        {confirm && (
          <div className="reset-confirm">
            <p>重置将恢复默认供应量与地址，并清空丹药、领取状态和快照记录。</p>
            <button type="button" className="button danger" onClick={reset}>
              确认重置
            </button>
            <button
              type="button"
              className="button subtle"
              onClick={() => setConfirm(false)}
            >
              取消
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
