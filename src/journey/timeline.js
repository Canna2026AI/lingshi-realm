export const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
export const HOLD_MS = 1400;
export const scenes = [
  { id: 'gate', chapter: 0, span: 1.7, title: '持灵石，踏仙途', lines: ['一点灵光，万象始生。', '向下滚动，踏入仙途。'], image: 'gate' },
  { id: 'cosmos', chapter: 0, span: 2, title: '天地未开，灵气先行', lines: ['星河流转，万物有灵。', '仙途，始于一念。'], image: 'cosmos' },
  { id: 'mountain', chapter: 1, span: 2.2, title: '入山，寻一线仙缘', lines: ['穿过云海，越过千山。', '一块灵石，唤醒沉寂的灵根。'], image: 'mountain', light: true },
  { id: 'meditation', chapter: 2, span: 2, title: '观自在，照见本心', lines: ['收万念于一息。', '灵火初燃，守护之灵随心而生。'], image: 'meditation', light: true },
  { id: 'talismans', chapter: 2, span: 2, title: '以灵为墨，以心为符', lines: ['道法由心，万象入卷。', '每一次触碰，都是新的领悟。'], image: 'meditation', light: true },
  { id: 'descent', chapter: 3, span: 2, title: '纵身入境，问道于心', lines: ['越过眼前的山。', '坠入心中的万重天地。'], image: 'gate' },
  { id: 'realms', chapter: 4, span: 3, title: '一念起，万境生', lines: ['以灵石为引，凝聚天地灵气。', '按住灵石，踏入下一重秘境。'] },
  { id: 'panorama', chapter: 5, span: 3, title: '行过万境，道在心中', lines: ['赤霞、青岚、玄霜。', '每一重天地，都留下修行的回响。'] },
  { id: 'ending', chapter: 5, span: 1.7, title: '一触灵石，万境新生', lines: ['灵石仙宗 · Lingshi Realm', '你的仙途，由此开启。'], light: true },
  { id: 'credits', chapter: 5, span: 1.3, title: '仙途未尽', lines: ['感谢每一位踏入仙宗的修行者。', '愿你心中有光，脚下有路。'], image: 'cosmos' },
];
export const chapters = ['启灵', '入山', '悟道', '问心', '破境', '归一'];
export const realmNames = ['赤霞境', '青岚境', '玄霜境'];
export const realmImages = ['redrealm', 'jaderealm', 'bluerealm'];
export const totalSpan = scenes.reduce((n, scene) => n + scene.span, 0);
export function sceneOffset(index) { return scenes.slice(0, index).reduce((n, scene) => n + scene.span, 0); }
export function positionAt(units) {
  const u = clamp(units, 0, totalSpan); let offset = 0;
  for (let i = 0; i < scenes.length; i++) {
    if (u < offset + scenes[i].span || i === scenes.length - 1)
      return { index: i, progress: clamp((u - offset) / scenes[i].span), overall: u / totalSpan };
    offset += scenes[i].span;
  }
}
export function holdProgress(elapsed) { return clamp(elapsed / HOLD_MS); }
export function nextRealm(realm) { return ((realm % realmNames.length) + realmNames.length + 1) % realmNames.length; }
