export const STORAGE_KEY = "lingshi-realm:v1";
export const UNIT_TOKENS = 100_000;
export const TIERS = [
  { field: "pills", name: "筑基丹", weight: 1, asset: "foundation-pill" },
  { field: "cores", name: "金丹", weight: 12, asset: "gold-core" },
  { field: "souls", name: "元婴", weight: 144, asset: "nascent-soul" },
  { field: "spirits", name: "化神", weight: 1728, asset: "divine-spirit" },
  { field: "ascensions", name: "渡劫", weight: 20736, asset: "tribulation" },
];
export const DEFAULT_CONFIG = {
  ca: "",
  totalSupply: 1_000_000_000,
  intervalMinutes: 5,
  unitTokens: UNIT_TOKENS,
  thresholdPermille: 0.1,
  excludedAddresses: [],
};
export const shortAddress = (a) => `${a.slice(0, 5)}…${a.slice(-4)}`;
export const number = (n) => new Intl.NumberFormat("en-US").format(n);
export const percentage = (balance, supply) =>
  `${((balance / supply) * 100).toFixed(4)}%`;
export const units = (balance) => Number(BigInt(balance) / BigInt(UNIT_TOKENS));
export const weight = (h) =>
  TIERS.reduce((sum, t) => sum + (h[t.field] || 0) * t.weight, 0);
export const rankName = (h) =>
  [...TIERS].reverse().find((t) => h[t.field] > 0)?.name || "初入仙门";
export const sortedHolders = (holders, mode = "balance") =>
  [...holders].sort(
    (a, b) =>
      (mode === "weight" ? weight(b) - weight(a) : 0) ||
      b.balance - a.balance ||
      a.address.localeCompare(b.address),
  );
export const emptyInventory = () =>
  Object.fromEntries(TIERS.map((t) => [t.field, 0]));
export function combineInventory(holder) {
  const next = { ...emptyInventory(), ...holder },
    upgrades = [];
  for (let i = 0; i < TIERS.length - 1; i++) {
    const from = TIERS[i].field,
      to = TIERS[i + 1].field;
    const amount = Math.floor(next[from] / 10);
    if (amount) {
      next[from] %= 10;
      next[to] += amount;
      upgrades.push({ tier: to, amount });
    }
  }
  return { holder: next, upgrades };
}
const BALANCES = [
  18000000, 12000000, 8500000, 6000000, 5000000, 3500000, 3000000, 2500000,
  2000000, 1500000, 1100000, 1000000, 999000, 750000, 500000, 250000, 100000,
  99900, 50000, 0,
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
  return BALANCES.map((balance) => ({
    address: `0x${hex()}${hex()}${hex()}${hex()}${hex()}`,
    balance: Number((BigInt(balance) * BigInt(supply)) / 1_000_000_000n),
    ...emptyInventory(),
    autoCombine: true,
    claimed: false,
  }));
}
export function freshState(
  now = Date.now(),
  config = DEFAULT_CONFIG,
  seed = 27,
) {
  return {
    version: 2,
    epoch: `${now}-${seed}`,
    config: { ...config },
    holders: generateHolders(config.totalSupply, seed),
    selected: null,
    nextAt: now + config.intervalMinutes * 60000,
    updatedAt: now,
    round: 0,
    operations: 0,
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
  if (config.unitTokens !== UNIT_TOKENS)
    throw new Error("当前修炼单位固定为 100,000 LINGSHI。");
  if (
    !Array.isArray(config.excludedAddresses) ||
    config.excludedAddresses.some((a) => !/^0x[0-9a-fA-F]{40}$/.test(a))
  )
    throw new Error("排除地址无效。");
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
const upgradeEvents = (upgrades, address, id, time, round) =>
  upgrades.map((u) => ({
    id: `${id}:${address}:${u.tier}`,
    type: u.tier === "cores" ? "core" : "upgrade",
    address,
    ...u,
    time,
    round,
  }));
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
    const earned = excluded.has(h.address.toLowerCase()) ? 0 : units(h.balance);
    if (!earned) return h;
    participants++;
    totalPills += earned;
    const inventory = { ...h, pills: h.pills + earned };
    const result =
      h.autoCombine !== false
        ? combineInventory(inventory)
        : { holder: inventory, upgrades: [] };
    const upgraded =
      result.upgrades.find((u) => u.tier === "cores")?.amount || 0;
    totalCores += upgraded;
    events.push(
      {
        id: `${roundId}:${h.address}:pill`,
        type: "pill",
        address: h.address,
        amount: earned,
        time: now,
        round: state.round + 1,
      },
      ...upgradeEvents(
        result.upgrades,
        h.address,
        roundId,
        now,
        state.round + 1,
      ),
    );
    rewards[h.address] = { earned, upgraded, upgrades: result.upgrades };
    return result.holder;
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
export function combineWallet(state, address, index, now = Date.now()) {
  if (!Number.isInteger(index) || index < 0 || index >= TIERS.length - 1)
    throw new Error("进阶等级无效。");
  const h = state.holders.find((h) => h.address === address),
    from = TIERS[index],
    to = TIERS[index + 1];
  if (!h || h[from.field] < 10)
    throw new Error(`需要 10 个${from.name}，材料不足。`);
  const next = {
    ...h,
    [from.field]: h[from.field] - 10,
    [to.field]: h[to.field] + 1,
  };
  const operations = (state.operations || 0) + 1,
    id = `${state.epoch}:combine:${operations}`;
  return {
    ...state,
    operations,
    holders: state.holders.map((x) => (x.address === address ? next : x)),
    updatedAt: now,
    events: [
      ...upgradeEvents(
        [{ tier: to.field, amount: 1 }],
        address,
        id,
        now,
        state.round,
      ),
      ...state.events,
    ].slice(0, 200),
  };
}
export function setAutoCombine(state, address, enabled, now = Date.now()) {
  const h = state.holders.find((h) => h.address === address);
  if (!h) throw new Error("钱包不存在。");
  const result = enabled
    ? combineInventory({ ...h, autoCombine: true })
    : { holder: { ...h, autoCombine: false }, upgrades: [] };
  const operations = (state.operations || 0) + 1,
    id = `${state.epoch}:auto:${operations}`;
  return {
    ...state,
    operations,
    holders: state.holders.map((x) =>
      x.address === address ? result.holder : x,
    ),
    updatedAt: now,
    events: [
      ...upgradeEvents(result.upgrades, address, id, now, state.round),
      ...state.events,
    ].slice(0, 200),
  };
}
export function saveConfiguration(state, config, drafts, now = Date.now()) {
  validateConfig(config);
  validateHolders(drafts, config.totalSupply);
  if (state.config.ca !== config.ca)
    return freshState(now, config, Math.floor(now % 100000));
  const prior = new Map(state.holders.map((h) => [h.address.toLowerCase(), h]));
  const holders = drafts.map((h) => ({
    ...emptyInventory(),
    autoCombine: true,
    claimed: false,
    ...prior.get(h.address.toLowerCase()),
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
export function parseState(raw, now = Date.now()) {
  let s = JSON.parse(raw);
  if (
    !s ||
    ![1, 2].includes(s.version) ||
    !Array.isArray(s.holders) ||
    !Array.isArray(s.events) ||
    !Array.isArray(s.completedRoundIds) ||
    !Number.isFinite(s.nextAt) ||
    !Number.isSafeInteger(s.round)
  )
    throw new Error("保存数据无效。");
  if (s.version === 1)
    s = {
      ...s,
      version: 2,
      operations: 0,
      config: {
        ...DEFAULT_CONFIG,
        ...s.config,
        intervalMinutes: 5,
        unitTokens: UNIT_TOKENS,
        thresholdPermille: 0.1,
      },
      holders: s.holders.map((h) => ({
        ...emptyInventory(),
        autoCombine: true,
        ...h,
      })),
      nextAt: Math.min(s.nextAt, now + 300000),
    };
  validateConfig(s.config);
  validateHolders(s.holders, s.config.totalSupply);
  for (const h of s.holders) {
    if (
      TIERS.some((t) => !Number.isSafeInteger(h[t.field]) || h[t.field] < 0) ||
      !Number.isSafeInteger(weight(h)) ||
      typeof h.autoCombine !== "boolean"
    )
      throw new Error("丹药数据无效。");
  }
  return s;
}
