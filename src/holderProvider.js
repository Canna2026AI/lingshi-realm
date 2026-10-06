import { emptyInventory, validateHolders } from "./engine.js";
export const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
export function validateAddress(address) {
  if (!ADDRESS_RE.test(address))
    throw new Error("请输入 0x 开头的完整 42 位钱包地址。");
}
// The adapter boundary is independent of the page and ledger. A future BSC
// indexer serves complete, normalized whole-token balances from this contract.
export class MockHolderProvider {
  async load({ state }) {
    return {
      totalSupply: state.config.totalSupply,
      holders: state.holders,
      updatedAt: Date.now(),
      source: "mock",
    };
  }
  async lookup({ address, state }) {
    validateAddress(address);
    const existing = state.holders.find(
      (h) => h.address.toLowerCase() === address.toLowerCase(),
    );
    if (existing)
      return {
        address: existing.address,
        balance: existing.balance,
        updatedAt: Date.now(),
        source: "mock",
      };
    const hash = [...address.toLowerCase()].reduce(
      (n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0,
      17,
    );
    const available =
      state.config.totalSupply -
      state.holders.reduce((n, h) => n + h.balance, 0);
    return {
      address: address.toLowerCase(),
      balance: Math.min(Math.max(0, available), ((hash % 36) + 1) * 100000),
      updatedAt: Date.now(),
      source: "mock",
    };
  }
}
export class BscHolderProvider {
  constructor(endpoint, fetcher = (...args) => fetch(...args)) {
    this.endpoint = endpoint;
    this.fetcher = fetcher;
  }
  async request({ ca, chainId = 56, address }) {
    if (!ADDRESS_RE.test(ca || ""))
      throw new Error("请先在后台填写有效的 Token CA。");
    if (!this.endpoint) throw new Error("Holder 接口尚未配置。");
    const url = new URL(
      this.endpoint,
      typeof location === "undefined" ? "https://localhost" : location.origin,
    );
    url.searchParams.set("ca", ca);
    url.searchParams.set("chainId", String(chainId));
    if (address) url.searchParams.set("address", address);
    const response = await this.fetcher(url.toString(), {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok)
      throw new Error(
        `Holder 接口读取失败（${response.status}），未修改修炼数据。`,
      );
    return response.json();
  }
  async load(args) {
    const data = await this.request(args);
    if (
      !Number.isSafeInteger(data.totalSupply) ||
      data.totalSupply < 1000 ||
      !Array.isArray(data.holders) ||
      !Number.isFinite(data.updatedAt)
    )
      throw new Error("Holder 接口返回格式无效。");
    validateHolders(data.holders, data.totalSupply);
    return { ...data, source: "bsc" };
  }
  async lookup(args) {
    validateAddress(args.address);
    const data = await this.request(args);
    const h = Array.isArray(data.holders)
      ? data.holders.find(
          (h) => String(h.address).toLowerCase() === args.address.toLowerCase(),
        ) || { address: args.address, balance: 0 }
      : data;
    if (
      !ADDRESS_RE.test(h.address) ||
      h.address.toLowerCase() !== args.address.toLowerCase() ||
      !Number.isSafeInteger(h.balance) ||
      h.balance < 0
    )
      throw new Error("钱包持仓接口返回格式无效。");
    return {
      address: h.address,
      balance: h.balance,
      updatedAt: data.updatedAt || Date.now(),
      source: "bsc",
    };
  }
}
export const holderProvider = new MockHolderProvider();
export const getHolderProvider = (config) =>
  config.holderApiUrl
    ? new BscHolderProvider(config.holderApiUrl)
    : holderProvider;
export function upsertWallet(state, data) {
  validateAddress(data.address);
  const prior = state.holders.find(
    (h) => h.address.toLowerCase() === data.address.toLowerCase(),
  );
  const h = {
    ...emptyInventory(),
    autoCombine: false,
    claimed: false,
    ...prior,
    address: prior?.address || data.address.toLowerCase(),
    balance: data.balance,
  };
  const holders = prior
    ? state.holders.map((x) => (x === prior ? h : x))
    : [...state.holders, h];
  validateHolders(holders, state.config.totalSupply);
  return {
    ...state,
    holders,
    selected: h.address,
    dataUpdatedAt: data.updatedAt,
  };
}
export function refreshHolderData(state, data) {
  const prior = new Map(state.holders.map((h) => [h.address.toLowerCase(), h]));
  validateHolders(data.holders, data.totalSupply);
  const holders = data.holders.map((h) => ({
    ...emptyInventory(),
    autoCombine: false,
    claimed: false,
    ...prior.get(h.address.toLowerCase()),
    address: h.address,
    balance: h.balance,
  }));
  return {
    ...state,
    config: { ...state.config, totalSupply: data.totalSupply },
    holders,
    selected: holders.some((h) => h.address === state.selected)
      ? state.selected
      : null,
    dataUpdatedAt: data.updatedAt,
  };
}
