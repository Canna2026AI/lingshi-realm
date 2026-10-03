/** Future BSC holder adapter contract:
 * load({ca, chainId, excludedAddresses}) -> {totalSupply, holders:[{address,balance}], updatedAt}
 * Balances normalized to whole LINGSHI tokens; replace with decimal-safe base units for production.
 * Fetch the full paginated holder index and consistent block before ranking or snapshotting.
 * Exclude configured pools/burn/project addresses here. No RPC keys are needed by this demo.
 */
export class MockHolderProvider {
  async load({ state }) {
    const excluded = new Set(
      state.config.excludedAddresses.map((a) => a.toLowerCase()),
    );
    return {
      totalSupply: state.config.totalSupply,
      holders: state.holders.filter(
        (h) => !excluded.has(h.address.toLowerCase()),
      ),
      updatedAt: Date.now(),
      source: "mock",
    };
  }
}
export class BscHolderProvider {
  async load({ ca, chainId = 56, excludedAddresses = [] }) {
    void ca;
    void chainId;
    void excludedAddresses;
    throw new Error("真实 Holder 数据接口待接入。");
  }
}
export const holderProvider = new MockHolderProvider();
