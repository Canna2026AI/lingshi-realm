export const STORAGE_KEY = "lingshi-realm:v1";
export const DEFAULT_CONFIG = {
  ca: "",
  totalSupply: 1_000_000_000,
  intervalMinutes: 10,
  thresholdPermille: 1,
  excludedAddresses: [],
};
export const shortAddress = (address) =>
  `${address.slice(0, 5)}…${address.slice(-4)}`;
export const number = (n) => new Intl.NumberFormat("en-US").format(n);
export const percentage = (balance, supply) =>
  `${((balance / supply) * 100).toFixed(4)}%`;
export const units = (balance, supply) =>
  Number((BigInt(balance) * 1000n) / BigInt(supply));
export const weight = (h) => h.pills + h.cores * 12;
export const sortedHolders = (holders) =>
  [...holders].sort(
    (a, b) => b.balance - a.balance || a.address.localeCompare(b.address),
  );
const BALANCES = [
  18000000, 12000000, 8500000, 6000000, 5000000, 3500000, 3000000, 2500000,
  2000000, 1500000, 1100000, 1000000, 999000, 750000, 500000, 250000, 100000,
  50000, 10000, 0,
];
export function generateHolders(
  supply = DEFAULT_CONFIG.totalSupply,
  seed = 27,
) {
  let s = seed >>> 0;
  const hex = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s.toString(16).padStart(8, "0");
  };
  return BALANCES.map((balance, i) => ({
    address: `0x${hex()}${hex()}${hex()}${hex()}${hex()}`,
    balance: Number((BigInt(balance) * BigInt(supply)) / 1_000_000_000n),
    pills: 0,
    cores: 0,
    claimed: false,
  }));
}
export function freshState(
  now = Date.now(),
  config = DEFAULT_CONFIG,
  seed = 27,
) {
  return {
    version: 1,
    epoch: `${now}-${seed}`,
    config: { ...config },
    holders: generateHolders(config.totalSupply, seed),
    selected: null,
    nextAt: now + config.intervalMinutes * 60000,
    updatedAt: now,
    round: 0,
    completedRoundIds: [],
    events: [],
    lastResult: null,
  };
}
export function validateConfig(config) {
  if (!Number.isSafeInteger(config.totalSupply) || config.totalSupply < 1000)
    throw new Error("总供应量须为不小于 1,000 的整数。");
  if (![5, 10].includes(config.intervalMinutes))
    throw new Error("快照周期仅支持 5 或 10 分钟。");
  if (config.ca && !/^0x[0-9a-fA-F]{40}$/.test(config.ca))
    throw new Error("Token CA 必须是 0x 开头的 42 位合约地址。");
}
export function validateHolders(holders, supply) {
  if (!holders.length) throw new Error("请至少保留一个 Holder。");
  const addresses = new Set();
  let total = 0n;
  for (const h of holders) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(h.address))
      throw new Error("Holder 地址必须是 0x 开头的 42 位地址。");
    if (addresses.has(h.address.toLowerCase()))
      throw new Error("Holder 地址不能重复。");
    addresses.add(h.address.toLowerCase());
    if (!Number.isSafeInteger(h.balance) || h.balance < 0)
      throw new Error("余额须为非负整数。");
    total += BigInt(h.balance);
  }
  if (total > BigInt(supply))
    throw new Error("Holder 余额合计不能超过总供应量。");
}
export function applySnapshot(state, roundId, now = Date.now()) {
  if (state.completedRoundIds.includes(roundId)) return state;
  validateConfig(state.config);
  validateHolders(state.holders, state.config.totalSupply);
  const excluded = new Set(
    state.config.excludedAddresses.map((a) => a.toLowerCase()),
  );
  let participants = 0,
    totalPills = 0,
    totalCores = 0;
  const events = [],
    rewards = {};
  const holders = state.holders.map((h) => {
    const earned = excluded.has(h.address.toLowerCase())
      ? 0
      : units(h.balance, state.config.totalSupply);
    if (!earned) return h;
    participants++;
    totalPills += earned;
    const accumulated = h.pills + earned;
    const upgraded = Math.floor(accumulated / 10);
    totalCores += upgraded;
    events.push({
      id: `${roundId}:${h.address}:pill`,
      type: "pill",
      address: h.address,
      amount: earned,
      time: now,
      round: state.round + 1,
    });
    if (upgraded)
      events.push({
        id: `${roundId}:${h.address}:core`,
        type: "core",
        address: h.address,
        amount: upgraded,
        time: now,
        round: state.round + 1,
      });
    rewards[h.address] = { earned, upgraded };
    return { ...h, pills: accumulated % 10, cores: h.cores + upgraded };
  });
  events.unshift({
    id: `${roundId}:summary`,
    type: "summary",
    participants,
    totalPills,
    totalCores,
    time: now,
    round: state.round + 1,
  });
  return {
    ...state,
    holders,
    round: state.round + 1,
    completedRoundIds: [...state.completedRoundIds, roundId],
    events: [...events, ...state.events].slice(0, 200),
    updatedAt: now,
    nextAt: now + state.config.intervalMinutes * 60000,
    lastResult: {
      roundId,
      participants,
      totalPills,
      totalCores,
      rewards,
      time: now,
    },
  };
}
export function saveConfiguration(state, config, drafts, now = Date.now()) {
  validateConfig(config);
  validateHolders(drafts, config.totalSupply);
  if (state.config.ca !== config.ca)
    return freshState(now, config, Math.floor(now % 100000));
  const prior = new Map(state.holders.map((h) => [h.address.toLowerCase(), h]));
  const holders = drafts.map((h) => ({
    ...(prior.get(h.address.toLowerCase()) || {
      pills: 0,
      cores: 0,
      claimed: false,
    }),
    address: h.address,
    balance: h.balance,
  }));
  return {
    ...state,
    config,
    holders,
    selected: holders.some((h) => h.address === state.selected)
      ? state.selected
      : null,
    updatedAt: now,
    nextAt:
      config.intervalMinutes !== state.config.intervalMinutes
        ? now + config.intervalMinutes * 60000
        : state.nextAt,
  };
}
export function parseState(raw) {
  const s = JSON.parse(raw);
  if (
    !s ||
    s.version !== 1 ||
    !Array.isArray(s.holders) ||
    !Array.isArray(s.events) ||
    !Array.isArray(s.completedRoundIds) ||
    !Number.isFinite(s.nextAt) ||
    !Number.isSafeInteger(s.round)
  )
    throw new Error("保存数据无效。");
  validateConfig(s.config);
  validateHolders(s.holders, s.config.totalSupply);
  for (const h of s.holders)
    if (
      !Number.isSafeInteger(h.pills) ||
      h.pills < 0 ||
      h.pills >= 10 ||
      !Number.isSafeInteger(h.cores) ||
      h.cores < 0
    )
      throw new Error("丹药数据无效。");
  return s;
}
