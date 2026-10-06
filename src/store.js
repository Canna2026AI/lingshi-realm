import { useEffect, useState, useRef } from "react";
import { STORAGE_KEY, freshState, parseState, applySnapshot } from "./engine";
import {
  getHolderProvider,
  upsertWallet,
  refreshHolderData,
  validateAddress,
} from "./holderProvider";
const initial = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseState(raw) : freshState();
  } catch {
    return freshState();
  }
};
export function useRealm(onNotice, { allowSnapshots = false } = {}) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const snapshotLock = useRef(false);
  const [now, setNow] = useState(Date.now());
  const transact = async (action) => {
    const commit = async () => {
      let current = state;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          current = parseState(raw);
        } catch {
          /* overwrite invalid demo state */
        }
      }
      const next = await action(current);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        throw new Error(
          "本地存储不可用，操作未提交。请允许浏览器保存网站数据。",
        );
      }
      setState(next);
      setNow(Date.now());
      return next;
    };
    return navigator.locks
      ? navigator.locks.request(STORAGE_KEY, commit)
      : commit();
  };
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let version;
      try {
        version = raw && JSON.parse(raw).version;
      } catch {}
      if (version !== 2)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      onNotice("本地存储不可用，刷新后状态可能丢失。");
    }
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const sync = (e) => {
      if (e.key === STORAGE_KEY && e.newValue)
        try {
          setState(parseState(e.newValue));
        } catch {}
    };
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const snapshot = async () => {
    if (!allowSnapshots || snapshotLock.current) return;
    snapshotLock.current = true;
    setBusy(true);
    try {
      await transact(async (current) => {
        const data = await getHolderProvider(current.config).load({
          ca: current.config.ca,
          chainId: 56,
          excludedAddresses: current.config.excludedAddresses,
          state: current,
        });
        const refreshed = refreshHolderData(current, data);
        const next = applySnapshot(
          refreshed,
          `${current.epoch}:manual:${current.round + 1}`,
          Date.now(),
        );
        onNotice(
          `第 ${next.round} 轮快照完成 · ${next.lastResult.participants} 个地址获得筑基丹`,
        );
        return next;
      });
    } catch (e) {
      onNotice(e.message);
    } finally {
      snapshotLock.current = false;
      setBusy(false);
    }
  };
  const queryWallet = async (address) => {
    const clean = address.trim();
    validateAddress(clean);
    return transact(async (current) => {
      const data = await getHolderProvider(current.config).lookup({
        address: clean,
        ca: current.config.ca,
        chainId: 56,
        state: current,
      });
      return upsertWallet(current, data);
    });
  };
  const update = async (action) => {
    try {
      return await transact(action);
    } catch (e) {
      onNotice(e.message);
      throw e;
    }
  };
  return { state, now, busy, snapshot, update, queryWallet };
}
