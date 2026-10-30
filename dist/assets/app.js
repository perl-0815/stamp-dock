import { CATEGORIES, STYLES, PALETTE, TEMPLATES } from './templates.js';
import { renderStamp, createStampBlob } from './render.js';
import { PACKS, packStamps } from './packs.js';
import { createPackArchive } from './archive.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  pen: '<path d="m15 4 5 5M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15l-1 5Z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  heart: '<path d="M20.5 4.7a5.3 5.3 0 0 0-7.5 0l-1 1-1-1a5.3 5.3 0 1 0-7.5 7.5L12 21l8.5-8.8a5.3 5.3 0 0 0 0-7.5Z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
  check: '<path d="m5 12 4 4L19 6"/><path d="M20 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8"/>',
  status: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1 3 4 3 4-3 4-3M8 8h.01M16 8h.01"/>',
  message: '<path d="M21 11a8.5 8.5 0 0 1-9 8H7l-5 3 2-6a8 8 0 0 1-1-4 9 9 0 0 1 18-1Z"/><path d="M8 11h8"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  coffee: '<path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm13 1h2a3 3 0 0 1 0 6h-2M3 23h16M7 2v2m4-2v2m4-2v2"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  'arrow-up-right': '<path d="M6 18 18 6M6 6h12v12"/>',
  'arrow-down-right': '<path d="m6 6 12 12M6 18h12V6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  sort: '<path d="M7 3v18m-4-4 4 4 4-4M13 5h8m-8 5h6m-6 5h4"/>',
  x: '<path d="m6 6 12 12M6 18 18 6"/>',
  rotate: '<path d="M3 10a9 9 0 1 1 2 8M3 3v7h7"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  package: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm-9 5 9 5 9-5M12 12v10M7 4.8l9 5"/>',
};
function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
}
function hydrateIcons(root = document) {
  $$('[data-icon]', root).forEach(el => { el.innerHTML = icon(el.dataset.icon); });
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

const DEFAULT = { text: 'LGTM!', subtext: 'LOOKS GOOD TO ME', style: 'outline', color: '#39775b', rotation: -5, font: 'rounded', background: 'transparent', backgroundColor: '#f5eee3', textScale: 1 };
let storageFailed = false;
function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { storageFailed = true; return fallback; }
}
function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { storageFailed = true; toast('ブラウザに保存できませんでした。空き容量やサイトデータの設定を確認してください。', true); return false; }
}
function validCustom(item) {
  return item && typeof item.id === 'string' && /^custom-[\w-]{1,80}$/.test(item.id) && typeof item.text === 'string' && item.text.trim() && item.text.length <= 40 && STYLES.some(s => s.id === item.style) && /^#[0-9a-f]{6}$/i.test(item.color);
}
const storedCustom = readStorage('stampdock-custom-v1', []);
let customStamps = Array.isArray(storedCustom) ? storedCustom.filter(validCustom).slice(0, 60).map(s => ({ ...DEFAULT, ...s, name: s.text.replace(/\n/g, ' '), subtext: String(s.subtext || '').slice(0, 40), category: 'custom', tags: [], rotation: Math.max(-12, Math.min(12, Number(s.rotation) || 0)), textScale: Math.max(.7, Math.min(1.3, Number(s.textScale) || 1)), font: ['sans', 'rounded', 'mono', 'serif'].includes(s.font) ? s.font : 'rounded', background: ['transparent', 'white', 'color'].includes(s.background) ? s.background : 'transparent' })) : [];
const storedFavorites = readStorage('stampdock-favorites-v1', []);
let favorites = new Set(Array.isArray(storedFavorites) ? storedFavorites.filter(id => [...TEMPLATES, ...customStamps].some(s => s.id === id)) : []);
let view = 'library';
let category = 'all';
let query = '';
let sort = 'recommended';
let pageSize = 24;
let resolution = 512;
let config = { ...DEFAULT };
let editingId = null;
let detailId = null;
let packJob = null;
let packsRendered = false;
let toastTimer;
let renderErrorShown = false;
const categoryIcons = { all: 'grid', review: 'check', status: 'status', reaction: 'smile', communication: 'message', dev: 'code', fun: 'coffee' };
const categoryName = id => id === 'custom' ? 'マイスタンプ' : CATEGORIES.find(c => c.id === id)?.label || '';
const allStamps = () => [...TEMPLATES, ...customStamps];
const findStamp = id => allStamps().find(s => s.id === id);
const normalized = value => String(value).normalize('NFKC').toLocaleLowerCase('ja').trim();

function toast(message, error = false) {
  clearTimeout(toastTimer);
  const el = $('#toast');
  el.textContent = message;
  el.classList.toggle('error', error);
  el.hidden = false;
  toastTimer = setTimeout(() => { el.hidden = true; }, error ? 6500 : 3500);
}
function sidebarButton(id, label, symbol, count, active) {
  return `<button class="sidebar-button${active ? ' active' : ''}" data-filter="${id}"${active ? ' aria-current="page"' : ''}><span data-icon="${symbol}"></span>${escapeHTML(label)}<span class="sidebar-count">${count}</span></button>`;
}
function renderNav() {
  const focusedFilter = document.activeElement?.dataset.filter;
  $('#main-filter').innerHTML = sidebarButton('all', 'すべてのスタンプ', 'grid', TEMPLATES.length, view === 'library' && category === 'all') + sidebarButton('packs', 'スタンプパック', 'package', PACKS.length, view === 'packs');
  $('#category-nav').innerHTML = CATEGORIES.filter(c => c.id !== 'all').map(c => sidebarButton(c.id, c.label, categoryIcons[c.id], TEMPLATES.filter(s => s.category === c.id).length, view === 'library' && category === c.id)).join('');
  $('#personal-nav').innerHTML = sidebarButton('favorites', 'お気に入り', 'heart', favorites.size, view === 'favorites') + sidebarButton('mine', 'マイスタンプ', 'bookmark', customStamps.length, view === 'mine');
  hydrateIcons($('.sidebar'));
  $$('[data-nav]').forEach(button => { const active = button.dataset.nav === 'editor' ? view === 'editor' : view !== 'editor'; button.classList.toggle('active', active); if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); });
  if (focusedFilter) $(`[data-filter="${CSS.escape(focusedFilter)}"]`)?.focus({ preventScroll: true });
}
function filteredStamps() {
  let stamps = view === 'mine' ? [...customStamps] : view === 'favorites' ? allStamps().filter(s => favorites.has(s.id)) : TEMPLATES.filter(s => category === 'all' || s.category === category);
  const terms = normalized(query).split(/\s+/).filter(Boolean);
  if (terms.length) stamps = stamps.filter(s => { const haystack = normalized([s.name, s.text, s.subtext, categoryName(s.category), ...(s.tags || [])].join(' ')); return terms.every(t => haystack.includes(t)); });
  if (sort === 'name') stamps.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  return stamps;
}
function draw(canvas, stamp, size = 512) {
  return renderStamp(canvas, stamp, size).catch(error => {
    console.error('Stamp rendering failed:', error);
    if (!renderErrorShown) { renderErrorShown = true; toast('スタンプを表示できませんでした。ページを再読み込みしてください。', true); }
  });
}
function renderGrid() {
  const stamps = filteredStamps();
  const personal = view === 'mine' || view === 'favorites';
  $('.hero').hidden = personal;
  $('#library-title').textContent = view === 'favorites' ? 'お気に入り' : view === 'mine' ? 'マイスタンプ' : 'スタンプを見つける';
  $('#total-count').textContent = view === 'favorites' ? favorites.size : view === 'mine' ? customStamps.length : TEMPLATES.length;
  $('#results-description').innerHTML = `${query ? `「${escapeHTML(query)}」 · ` : ''}${view === 'library' ? escapeHTML(category === 'all' ? 'すべてのスタンプ' : categoryName(category)) + ' · ' : ''}<strong>${stamps.length}</strong> 件`;
  const shown = stamps.slice(0, pageSize);
  $('#stamp-grid').innerHTML = shown.map(s => `<article class="stamp-card"><button class="card-favorite${favorites.has(s.id) ? ' is-favorite' : ''}" data-favorite="${escapeHTML(s.id)}" aria-label="${escapeHTML(s.name)}をお気に入り${favorites.has(s.id) ? 'から削除' : 'に追加'}" aria-pressed="${favorites.has(s.id)}">${icon('heart')}</button><button class="card-preview" data-detail="${escapeHTML(s.id)}" aria-label="${escapeHTML(s.name)}をプレビュー"><canvas width="320" height="320" aria-hidden="true"></canvas></button><div class="card-info"><div><h3 class="card-name">${escapeHTML(s.name)}</h3><span class="card-category">${escapeHTML(categoryName(s.category))}</span></div><button class="card-download" data-download="${escapeHTML(s.id)}" aria-label="${escapeHTML(s.name)}を${resolution}pxのPNGでダウンロード">${icon('download')}</button></div></article>`).join('');
  $$('.card-preview', $('#stamp-grid')).forEach((el, index) => draw($('canvas', el), shown[index], 400));
  $('#empty-state').hidden = stamps.length > 0;
  $('#load-more').hidden = stamps.length <= pageSize;
  const emptyPersonal = !query && personal;
  $('#empty-title').textContent = emptyPersonal ? view === 'mine' ? 'まだマイスタンプがありません' : 'まだお気に入りがありません' : 'スタンプが見つかりません';
  $('#empty-description').textContent = emptyPersonal ? view === 'mine' ? 'つくったスタンプを保存すると、ここからいつでも使えます。' : '気に入ったスタンプのハートを押すと、ここに集まります。' : '別のことばやカテゴリーで探してみてください。';
  $('#empty-action').textContent = emptyPersonal ? view === 'mine' ? 'スタンプをつくる' : 'テンプレートを見る' : '絞り込みを解除';
}
function switchView(next, scroll = true) {
  view = next;
  pageSize = 24;
  $('#library-view').hidden = view === 'editor' || view === 'packs';
  $('#editor-view').hidden = view !== 'editor';
  $('#packs-view').hidden = view !== 'packs';
  renderNav();
  if (view === 'editor') syncEditor(); else if (view === 'packs') renderPacks(); else renderGrid();
  if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
}
function clearFilters() {
  query = ''; category = 'all'; $('#search').value = ''; pageSize = 24;
}
function toggleFavorite(id, restoreFocus = false) {
  if (!findStamp(id)) return;
  if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
  writeStorage('stampdock-favorites-v1', [...favorites]);
  renderNav();
  if (view !== 'editor') renderGrid();
  if ($('#stamp-dialog').open) updateDetailFavorite();
  if (restoreFocus) ($(`[data-favorite="${CSS.escape(id)}"]`) || $('#search')).focus({ preventScroll: true });
}

function setResolution(value) {
  resolution = [128, 256, 512, 1024, 2048].includes(Number(value)) ? Number(value) : 512;
  $$('.resolution-select').forEach(el => { el.value = String(resolution); });
  $('#preview-dimensions').textContent = `${resolution} × ${resolution} px`;
  if (view !== 'editor') $$('.card-download').forEach(button => { const s = findStamp(button.dataset.download); button.setAttribute('aria-label', `${s?.name}を${resolution}pxのPNGでダウンロード`); });
  $$('.pack-download-size').forEach(el => { el.textContent = `${resolution} px / PNG`; });
}

function renderPacks() {
  if (packsRendered) return;
  packsRendered = true;
  $('#pack-grid').innerHTML = PACKS.map((pack, index) => `<article class="pack-card" style="--pack-color:${pack.color}"><button class="pack-art" data-pack-detail="${pack.id}" aria-label="${pack.name}パックの16個を見る"><span class="pack-number">PACK ${String(index + 1).padStart(2, '0')}</span><div class="pack-stamp-strip">${packStamps(pack).slice(0, 4).map(() => '<canvas width="240" height="240" aria-hidden="true"></canvas>').join('')}</div><span class="pack-art-caption">${pack.tagline}</span><span class="pack-seal">16<br><small>STAMPS</small></span></button><div class="pack-card-info"><div class="pack-card-title"><h3>${pack.name}</h3><span class="pack-download-size">${resolution} px / PNG</span></div><p>${pack.description}</p><div class="pack-card-actions"><button class="text-link" data-pack-detail="${pack.id}">中身を見る ${icon('arrow-right')}</button><button class="button button-dark" data-pack-download="${pack.id}">${icon('download')}ZIPで保存</button></div></div></article>`).join('');
  $$('.pack-card').forEach((card, index) => $$('canvas', card).forEach((canvas, stampIndex) => draw(canvas, packStamps(PACKS[index])[stampIndex], 240)));
  updatePackBusy();
}
function openPackDetail(id) {
  const pack = PACKS.find(p => p.id === id); if (!pack) return;
  $('#pack-dialog-title').textContent = `${pack.name}パック`;
  $('#pack-dialog-description').textContent = pack.description;
  const stamps = packStamps(pack);
  $('#pack-contents').innerHTML = stamps.map(stamp => `<div class="pack-content-item"><canvas width="240" height="240" aria-hidden="true"></canvas><span>${escapeHTML(stamp.name)}</span></div>`).join('');
  $$('#pack-contents canvas').forEach((canvas, index) => draw(canvas, stamps[index], 240));
  $('#pack-dialog-download').dataset.packDownload = pack.id;
  updatePackBusy();
  $('#pack-dialog').showModal();
}
function updatePackBusy() {
  $$('[data-pack-download]').forEach(button => { button.disabled = Boolean(packJob); button.setAttribute('aria-busy', String(Boolean(packJob) && button.dataset.packDownload === packJob.id)); });
}
function saveBlob(blob, filename) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
async function downloadPack(id) {
  if (packJob) return;
  const pack = PACKS.find(p => p.id === id); if (!pack) return;
  const size = resolution;
  const controller = new AbortController();
  packJob = { id, controller };
  if ($('#pack-dialog').open) $('#pack-dialog').close();
  switchView('packs', false);
  $('#pack-progress').hidden = false;
  $('#pack-progress-bar').value = 0;
  $('#pack-progress-message').textContent = `${pack.name}を${size}pxで作成中… 0 / ${pack.ids.length}`;
  $('#cancel-pack').disabled = false;
  $('#cancel-pack').textContent = 'キャンセル';
  $('#pack-progress').scrollIntoView({ block: 'nearest', behavior: 'instant' });
  $('#cancel-pack').focus({ preventScroll: true });
  updatePackBusy();
  try {
    const blob = await createPackArchive(pack, size, { signal: controller.signal, onProgress(done, total) { $('#pack-progress-bar').value = done; $('#pack-progress-message').textContent = `${pack.name}を${size}pxで作成中… ${done} / ${total}`; } });
    controller.signal.throwIfAborted();
    saveBlob(blob, `stampdock-${pack.id}-${size}px.zip`);
    toast(`${pack.name}の${pack.ids.length}個を${size}pxのZIPにまとめました。`);
  } catch (error) {
    if (error.name === 'AbortError') toast('パックの作成をキャンセルしました。');
    else { console.error(error); toast('パックを作成できませんでした。もう一度ダウンロードしてください。', true); }
  } finally {
    const restoreFocus = document.activeElement === $('#cancel-pack');
    packJob = null; $('#pack-progress').hidden = true; updatePackBusy();
    if (restoreFocus) $(`[data-pack-download="${id}"]`)?.focus();
  }
}
async function downloadStamp(stamp, button) {
  if (!stamp?.text.trim() || button?.disabled) return;
  const size = resolution;
  if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
  try {
    const blob = await createStampBlob({ ...stamp }, size);
    const filename = stamp.text.trim().replace(/[\s\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/-+/g, '-').slice(0, 50) || 'stamp';
    saveBlob(blob, `stampdock-${filename}-${size}px.png`);
    toast(`${size} × ${size} pxのPNGを書き出しました。`);
  } catch (error) { console.error(error); toast('画像を書き出せませんでした。もう一度お試しください。', true); }
  finally { if (button) { button.disabled = false; button.removeAttribute('aria-busy'); } updateEditorValidity(); }
}

function renderEditorOptions() {
  const samples = { outline: 'OK', solid: 'Hi!', badge: 'GOOD', terminal: '>_', pixel: '8BIT', hand: 'Thanks', circle: '済', impact: 'YES!' };
  $('#style-options').innerHTML = STYLES.map(s => `<button type="button" class="style-option" data-style="${s.id}" aria-pressed="false"><span class="style-sample" aria-hidden="true">${samples[s.id]}</span>${escapeHTML(s.label)}</button>`).join('');
  $('#color-options').innerHTML = PALETTE.map((color, index) => `<button type="button" class="color-swatch" data-color="${color}" style="--swatch:${color}" aria-label="${['フォレストグリーン', 'オレンジ', 'ブルー', 'ローズ', 'パープル', 'マスタード', 'ティール', 'チャコール'][index]}" aria-pressed="false"></button>`).join('') + '<label class="custom-color-label" title="好きな色を選ぶ"><input type="color" id="custom-color" value="#39775b" aria-label="好きなスタンプの色"/><span aria-hidden="true">+</span></label>';
}
function syncEditor() {
  $('#stamp-text').value = config.text;
  $('#stamp-subtext').value = config.subtext;
  $('#font-select').value = config.font || 'rounded';
  $('#background-select').value = config.background || 'transparent';
  $('#background-color').value = /^#[0-9a-f]{6}$/i.test(config.backgroundColor) ? config.backgroundColor : '#f5eee3';
  $('#text-scale').value = Math.round(config.textScale * 100);
  $('#rotation').value = config.rotation || 0;
  $('#custom-color').value = config.color;
  updateEditor();
}
function updateEditorValidity() {
  const empty = !config.text.trim();
  $('#editor-download').disabled = empty;
  $('#save-custom').disabled = empty;
  $('#preview-empty').hidden = !empty;
  $('#editor-canvas').hidden = empty;
}
function updateEditor() {
  $('#text-count').textContent = `${config.text.length} / 40`;
  $('#text-scale-value').value = `${Math.round(config.textScale * 100)}%`;
  $('#rotation-value').value = `${config.rotation}°`;
  $('#background-color-label').hidden = config.background !== 'color';
  $('#preview-background-note').textContent = `背景：${{ transparent: '透明', white: '白', color: 'カスタム' }[config.background]}`;
  $$('.style-option').forEach(el => { const selected = el.dataset.style === config.style; el.classList.toggle('selected', selected); el.setAttribute('aria-pressed', String(selected)); });
  $$('.color-swatch').forEach(el => { const selected = el.dataset.color === config.color; el.classList.toggle('selected', selected); el.setAttribute('aria-pressed', String(selected)); });
  $('#save-custom').innerHTML = `<span data-icon="bookmark"></span>${editingId ? 'マイスタンプを更新' : 'マイスタンプに保存'}`;
  hydrateIcons($('#save-custom'));
  updateEditorValidity();
  if (config.text.trim()) draw($('#editor-canvas'), { ...config }, 640);
}
function newStamp() { config = { ...DEFAULT }; editingId = null; switchView('editor'); }
function editStamp(stamp) {
  const defaultFont = { solid: 'rounded', hand: 'rounded', terminal: 'mono', pixel: 'mono' }[stamp.style] || 'sans';
  config = { ...DEFAULT, ...stamp, rotation: stamp.rotation || 0, font: stamp.font || defaultFont, textScale: stamp.textScale || 1 };
  editingId = stamp.category === 'custom' ? stamp.id : null;
  $('#stamp-dialog').close(); switchView('editor'); $('#stamp-text').focus({ preventScroll: true });
}
function saveCustom() {
  if (!config.text.trim()) return;
  if (!editingId && customStamps.length >= 60) { toast('保存できるのは60個までです。不要なマイスタンプを削除してください。', true); return; }
  const id = editingId || `custom-${crypto.randomUUID()}`;
  const stamp = { ...config, id, name: config.text.replace(/\n/g, ' '), category: 'custom', tags: [] };
  const next = editingId ? customStamps.map(s => s.id === id ? stamp : s) : [stamp, ...customStamps];
  if (writeStorage('stampdock-custom-v1', next)) {
    customStamps = next; editingId = id; renderNav(); updateEditor(); toast('マイスタンプに保存しました。');
  }
}

function updateDetailFavorite() {
  const selected = favorites.has(detailId);
  $('#detail-favorite').innerHTML = `<span data-icon="heart"></span>${selected ? '登録済み' : 'お気に入り'}`;
  $('#detail-favorite').classList.toggle('is-favorite', selected);
  $('#detail-favorite').setAttribute('aria-pressed', String(selected));
  $('#detail-favorite').setAttribute('aria-label', selected ? 'お気に入りから削除' : 'お気に入りに追加');
  hydrateIcons($('#detail-favorite'));
}
function openDetail(id) {
  const stamp = findStamp(id); if (!stamp) return;
  detailId = id;
  $('#dialog-title').textContent = stamp.name;
  $('#dialog-category').textContent = categoryName(stamp.category);
  $('#dialog-tags').textContent = stamp.tags?.length ? stamp.tags.map(t => `#${t}`).join('  ') : '自分だけのスタンプ';
  $('#delete-custom').hidden = stamp.category !== 'custom';
  updateDetailFavorite();
  // Clear the previous image while the new font subsets are loading.
  $('#detail-canvas').getContext('2d').clearRect(0, 0, $('#detail-canvas').width, $('#detail-canvas').height);
  draw($('#detail-canvas'), stamp, 640);
  $('#stamp-dialog').showModal();
}

hydrateIcons(); renderEditorOptions(); renderNav(); renderGrid(); syncEditor();
draw($('#hero-lgtm'), { ...TEMPLATES[0], text: 'LGTM!', rotation: 0 }, 640);
draw($('#hero-done'), { ...TEMPLATES[1], rotation: 0 }, 512);
draw($('#hero-thanks'), { ...TEMPLATES[2], rotation: 0 }, 512);
if (storageFailed) toast('ブラウザの保存データを読み込めませんでした。テンプレートと画像の作成は利用できます。', true);

$('.brand').addEventListener('click', event => { event.preventDefault(); clearFilters(); switchView('library'); });
$$('[data-nav]').forEach(el => el.addEventListener('click', () => { if (el.dataset.nav === 'library') clearFilters(); switchView(el.dataset.nav); }));
$('.sidebar').addEventListener('click', event => {
  const button = event.target.closest('[data-filter]'); if (!button) return;
  const filter = button.dataset.filter;
  if (['favorites', 'mine', 'packs'].includes(filter)) { query = ''; $('#search').value = ''; switchView(filter); }
  else { category = filter; switchView('library', view === 'editor'); }
});
$('#hero-create').addEventListener('click', newStamp);
$('#search').addEventListener('input', event => { query = event.target.value; pageSize = 24; renderGrid(); });
$('#sort').addEventListener('change', event => { sort = event.target.value; renderGrid(); });
$$('.resolution-select').forEach(el => el.addEventListener('change', event => setResolution(event.target.value)));
$('#load-more').addEventListener('click', () => { pageSize += 24; renderGrid(); const firstNew = $$('.card-preview')[pageSize - 24]; firstNew?.focus({ preventScroll: true }); });
document.addEventListener('click', event => { const detail = event.target.closest('[data-pack-detail]'); if (detail) openPackDetail(detail.dataset.packDetail); const download = event.target.closest('[data-pack-download]'); if (download) downloadPack(download.dataset.packDownload); });
$('#cancel-pack').addEventListener('click', () => { packJob?.controller.abort(); $('#cancel-pack').textContent = '中止しています…'; });
$('#empty-action').addEventListener('click', () => { if (view === 'mine' && !query) newStamp(); else { clearFilters(); switchView('library', false); $('#search').focus(); } });
$('#stamp-grid').addEventListener('click', event => {
  const favorite = event.target.closest('[data-favorite]'); if (favorite) { toggleFavorite(favorite.dataset.favorite, true); return; }
  const download = event.target.closest('[data-download]'); if (download) { downloadStamp(findStamp(download.dataset.download), download); return; }
  const detail = event.target.closest('[data-detail]'); if (detail) openDetail(detail.dataset.detail);
});
$('#editor-form').addEventListener('input', event => {
  const { id, value } = event.target;
  const mapping = { 'stamp-text': 'text', 'stamp-subtext': 'subtext', 'font-select': 'font', 'background-select': 'background', 'background-color': 'backgroundColor', 'custom-color': 'color' };
  if (mapping[id]) config[mapping[id]] = value;
  else if (id === 'text-scale') config.textScale = Number(value) / 100;
  else if (id === 'rotation') config.rotation = Number(value);
  else return;
  updateEditor();
});
$('#style-options').addEventListener('click', event => { const button = event.target.closest('[data-style]'); if (button) { config.style = button.dataset.style; updateEditor(); } });
$('#color-options').addEventListener('click', event => { const button = event.target.closest('[data-color]'); if (button) { config.color = button.dataset.color; $('#custom-color').value = config.color; updateEditor(); } });
$('#reset-editor').addEventListener('click', () => { config = { ...DEFAULT }; editingId = null; syncEditor(); });
$('#editor-download').addEventListener('click', event => downloadStamp(config, event.currentTarget));
$('#save-custom').addEventListener('click', saveCustom);
$$('[data-surface]').forEach(button => button.addEventListener('click', () => { $('#editor-canvas-wrap').classList.toggle('dark', button.dataset.surface === 'dark'); $$('[data-surface]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); }); }));
$('#detail-download').addEventListener('click', event => downloadStamp(findStamp(detailId), event.currentTarget));
$('#detail-edit').addEventListener('click', () => { const stamp = findStamp(detailId); if (stamp) editStamp(stamp); });
$('#detail-favorite').addEventListener('click', () => toggleFavorite(detailId));
$('#delete-custom').addEventListener('click', () => {
  const next = customStamps.filter(s => s.id !== detailId);
  if (!writeStorage('stampdock-custom-v1', next)) return;
  customStamps = next; favorites.delete(detailId); writeStorage('stampdock-favorites-v1', [...favorites]);
  if (editingId === detailId) editingId = null;
  $('#stamp-dialog').close(); renderNav(); renderGrid(); $('#search').focus(); toast('マイスタンプを削除しました。');
});
$('#about-button').addEventListener('click', () => $('#about-dialog').showModal());
$('#footer-about').addEventListener('click', () => $('#about-dialog').showModal());
$$('.close-dialog').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => { const rect = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close(); }));
document.addEventListener('keydown', event => { if (event.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) && !document.querySelector('dialog[open]') && !['editor', 'packs'].includes(view)) { event.preventDefault(); $('#search').focus(); } });
