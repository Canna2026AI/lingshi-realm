export const clamp = (n, min = 0, max = 1) =>
  Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
export const HOLD_MS = 1400;
export const scenes = [
  {
    id: "planet",
    chapter: 0,
    span: 1.8,
    title: "太初灵星",
    lines: ["一点灵光，万象始生。", "触碰灵星，开启你的仙途。"],
  },
  {
    id: "gate",
    chapter: 1,
    span: 1.7,
    title: "持灵石，入仙门",
    lines: ["钱包是洞府，持有是闭关。", "穿过山门，寻一线仙缘。"],
    image: "gate",
  },
  {
    id: "gallery",
    chapter: 2,
    span: 2,
    title: "灵物有灵",
    lines: ["持灵石，凝丹进阶。", "点选灵物，读懂仙途。"],
    image: "mountain",
    light: true,
  },
  {
    id: "furnace",
    chapter: 3,
    span: 2,
    title: "灵气入炉",
    lines: ["灵石为引，灵气凝丹。", "按住灵石，点燃这一炉。"],
    image: "cave",
    flow: true,
  },
  {
    id: "combine",
    chapter: 4,
    span: 2,
    title: "十丹结金",
    lines: ["十颗筑基丹，合成一枚金丹。", "旧丹消耗，新阶诞生。"],
    image: "cave",
    flow: true,
  },
  {
    id: "leaderboard",
    chapter: 5,
    span: 2,
    title: "宗门天骄榜",
    lines: [],
    image: "gate",
  },
];
export const chapters = ["启灵", "山门", "灵物", "炼丹", "结金", "天骄"];
export const realmNames = ["赤霞境", "青岚境", "玄霜境"];
export const realmImages = ["redrealm", "jaderealm", "bluerealm"];
export const totalSpan = scenes.reduce((n, s) => n + s.span, 0);
export function sceneOffset(index) {
  return scenes.slice(0, index).reduce((n, s) => n + s.span, 0);
}
export function positionAt(units) {
  const u = clamp(units, 0, totalSpan);
  let offset = 0;
  for (let i = 0; i < scenes.length; i++) {
    if (u < offset + scenes[i].span || i === scenes.length - 1)
      return {
        index: i,
        progress: clamp((u - offset) / scenes[i].span),
        overall: u / totalSpan,
      };
    offset += scenes[i].span;
  }
}
export function holdProgress(elapsed) {
  return clamp(elapsed / HOLD_MS);
}
export function nextRealm(realm) {
  return ((realm % 3) + 4) % 3;
}
export const easeJourney = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
