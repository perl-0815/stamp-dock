'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CATEGORIES, TEMPLATES } from '../../public/assets/templates.js';
import { PACKS } from '../../public/assets/packs.js';
import { createStampBlob } from '../../public/assets/render.js';
import { createPackArchive } from '../../public/assets/archive.js';
import { DEFAULT, type Resolution, type Stamp, type StampConfig, type StampPack, type View } from '@/lib/types';
import { CUSTOM_KEY, FAVORITES_KEY, readPersonalStamps, writePersonalStamps } from '@/lib/personal-stamps';
import Icon from './Icon';
import StampEditor from './StampEditor';
import StampLibrary from './StampLibrary';
import StampPacks from './StampPacks';
import { AboutDialog, PackDetail, StampDetail } from './StampDialogs';

const categoryIcons: Record<string, string> = { all: 'grid', review: 'check', status: 'status', reaction: 'smile', communication: 'message', dev: 'code', fun: 'coffee' };
const categoryName = (id: string) => id === 'custom' ? 'マイスタンプ' : CATEGORIES.find(category => category.id === id)?.label || '';
const normalized = (value: string) => value.normalize('NFKC').toLocaleLowerCase('ja').trim();
const focus = (selector: string, preventScroll = false) => requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus({ preventScroll }));

interface PackJob { id: string; name: string; size: Resolution; done: number; total: number; cancelling: boolean }

function saveBlob(blob: Blob, filename: string) {
  const link = document.createElement('a'), url = URL.createObjectURL(blob);
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default function StampApp() {
  const [view, setView] = useState<View>('library');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recommended');
  const [pageSize, setPageSize] = useState(24);
  const [resolution, setResolution] = useState<Resolution>(512);
  const [config, setConfig] = useState<StampConfig>({ ...DEFAULT });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customStamps, setCustomStamps] = useState<Stamp[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [detail, setDetail] = useState<Stamp | null>(null);
  const [packDetail, setPackDetail] = useState<StampPack | null>(null);
  const [about, setAbout] = useState(false);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const [downloadIds, setDownloadIds] = useState<string[]>([]);
  const [packJob, setPackJob] = useState<PackJob | null>(null);
  const controller = useRef<AbortController | null>(null);
  const activeDownloads = useRef(new Set<string>());
  const mounted = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderErrorShown = useRef(false);
  const packJobId = packJob?.id;

  const notify = useCallback((message: string, error = false) => {
    if (!mounted.current) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, error });
    toastTimer.current = setTimeout(() => setToast(null), error ? 6500 : 3500);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const saved = readPersonalStamps();
    setCustomStamps(saved.customStamps); setFavoriteIds(saved.favorites); setReady(true);
    if (saved.failed) notify('ブラウザの保存データを読み込めませんでした。テンプレートと画像の作成は利用できます。', true);
    return () => { mounted.current = false; controller.current?.abort(); if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [notify]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '') && !document.querySelector('dialog[open]') && !['editor', 'packs'].includes(view)) {
        event.preventDefault(); document.querySelector<HTMLInputElement>('#search')?.focus();
      }
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [view]);

  useEffect(() => {
    if (!packJobId) return;
    document.querySelector('#pack-progress')?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    document.querySelector<HTMLElement>('#cancel-pack')?.focus({ preventScroll: true });
    // Start-of-job focus only; progress updates must not steal focus back.
  }, [packJobId]);

  function navigate(next: View, scroll = true) {
    setView(next); setPageSize(24);
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function clearFilters() { setQuery(''); setCategory('all'); setPageSize(24); }
  function selectFilter(id: string) {
    if (['favorites', 'mine', 'packs'].includes(id)) { setQuery(''); navigate(id as View); }
    else { setCategory(id); navigate('library', view === 'editor' || view === 'packs'); }
  }
  function persist(key: string, value: unknown) {
    if (writePersonalStamps(key, value)) return true;
    notify('ブラウザに保存できませんでした。空き容量やサイトデータの設定を確認してください。', true);
    return false;
  }
  function toggleFavorite(stamp: Stamp) {
    if (!ready) return;
    const next = favoriteIds.includes(stamp.id) ? favoriteIds.filter(id => id !== stamp.id) : [...favoriteIds, stamp.id];
    if (persist(FAVORITES_KEY, next)) {
      setFavoriteIds(next);
      if (view === 'favorites' && !next.includes(stamp.id) && !detail) focus('#search', true);
    }
  }
  function newStamp() { setConfig({ ...DEFAULT }); setEditingId(null); navigate('editor'); }
  function editStamp(stamp: Stamp) {
    const defaultFonts: Partial<Record<StampConfig['style'], StampConfig['font']>> = { solid: 'rounded', hand: 'rounded', terminal: 'mono', pixel: 'mono' };
    const defaultFont = defaultFonts[stamp.style] || 'sans';
    setConfig({ ...DEFAULT, ...stamp, rotation: stamp.rotation || 0, font: stamp.font || defaultFont as StampConfig['font'], textScale: stamp.textScale || 1 });
    setEditingId(stamp.category === 'custom' ? stamp.id : null); setDetail(null); navigate('editor'); focus('#stamp-text', true);
  }
  function saveCustom() {
    if (!ready || !config.text.trim()) return;
    if (!editingId && customStamps.length >= 60) { notify('保存できるのは60個までです。不要なマイスタンプを削除してください。', true); return; }
    const id = editingId || `custom-${crypto.randomUUID()}`;
    const stamp: Stamp = { ...config, id, name: config.text.replace(/\n/g, ' '), category: 'custom', tags: [] };
    const next = editingId ? customStamps.map(item => item.id === id ? stamp : item) : [stamp, ...customStamps];
    if (persist(CUSTOM_KEY, next)) { setCustomStamps(next); setEditingId(id); notify('マイスタンプに保存しました。'); }
  }
  function deleteCustom() {
    if (!detail || detail.category !== 'custom') return;
    const next = customStamps.filter(stamp => stamp.id !== detail.id);
    if (!persist(CUSTOM_KEY, next)) return;
    const nextFavorites = favoriteIds.filter(id => id !== detail.id);
    setCustomStamps(next); setFavoriteIds(nextFavorites); persist(FAVORITES_KEY, nextFavorites);
    if (editingId === detail.id) setEditingId(null);
    setDetail(null); focus('#search'); notify('マイスタンプを削除しました。');
  }
  const onRenderError = useCallback((error: unknown) => {
    console.error('Stamp rendering failed:', error);
    if (!renderErrorShown.current) { renderErrorShown.current = true; notify('スタンプを表示できませんでした。ページを再読み込みしてください。', true); }
  }, [notify]);

  async function downloadStamp(stamp: StampConfig, id: string) {
    if (!stamp.text.trim() || activeDownloads.current.has(id)) return;
    activeDownloads.current.add(id); setDownloadIds([...activeDownloads.current]);
    const size = resolution;
    try {
      const blob = await createStampBlob({ ...stamp }, size);
      if (!mounted.current) return;
      const filename = stamp.text.trim().replace(/[\s\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/-+/g, '-').slice(0, 50) || 'stamp';
      saveBlob(blob, `stampdock-${filename}-${size}px.png`); notify(`${size} × ${size} pxのPNGを書き出しました。`);
    } catch (error) { console.error(error); notify('画像を書き出せませんでした。もう一度お試しください。', true); }
    finally { activeDownloads.current.delete(id); if (mounted.current) setDownloadIds([...activeDownloads.current]); }
  }
  async function downloadPack(id: string) {
    if (controller.current) return;
    const pack = PACKS.find(item => item.id === id); if (!pack) return;
    const size = resolution, abort = new AbortController();
    controller.current = abort; setPackDetail(null); navigate('packs', false);
    setPackJob({ id, name: pack.name, size, done: 0, total: pack.ids.length, cancelling: false });
    try {
      const blob = await createPackArchive(pack, size, { signal: abort.signal, onProgress(done, total) {
        if (mounted.current) setPackJob(job => job ? { ...job, done, total } : job);
      } });
      abort.signal.throwIfAborted();
      if (!mounted.current) return;
      saveBlob(blob, `stampdock-${pack.id}-${size}px.zip`); notify(`${pack.name}の${pack.ids.length}個を${size}pxのZIPにまとめました。`);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') notify('パックの作成をキャンセルしました。');
      else { console.error(error); notify('パックを作成できませんでした。もう一度ダウンロードしてください。', true); }
    } finally {
      controller.current = null;
      if (mounted.current) {
        const restore = document.activeElement?.id === 'cancel-pack'; setPackJob(null);
        if (restore) focus(`#pack-grid [data-pack-download="${id}"]`);
      }
    }
  }
  function cancelPack() { controller.current?.abort(); setPackJob(job => job ? { ...job, cancelling: true } : job); }

  const allStamps = [...TEMPLATES, ...customStamps];
  let stamps = view === 'mine' ? [...customStamps] : view === 'favorites' ? allStamps.filter(stamp => favoriteIds.includes(stamp.id)) : TEMPLATES.filter(stamp => category === 'all' || stamp.category === category);
  const terms = normalized(query).split(/\s+/).filter(Boolean);
  if (terms.length) stamps = stamps.filter(stamp => { const haystack = normalized([stamp.name, stamp.text, stamp.subtext, categoryName(stamp.category), ...stamp.tags].join(' ')); return terms.every(term => haystack.includes(term)); });
  if (sort === 'name') stamps.sort((a, b) => a.name.localeCompare(b.name, 'ja'));

  function sidebarButton(id: string, label: string, symbol: string, count: number, active: boolean) {
    return <button key={id} className={`sidebar-button${active ? ' active' : ''}`} data-filter={id} aria-current={active ? 'page' : undefined} onClick={() => selectFilter(id)}><Icon name={symbol} />{label}<span className="sidebar-count">{count}</span></button>;
  }
  return <>
    <header className="topbar"><a href="#" className="brand" aria-label="STAMPDOCK ホーム" onClick={event => { event.preventDefault(); clearFilters(); navigate('library'); }}><span className="brand-symbol" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M11 18v-4c0-2 2-2 2-4V7a3 3 0 0 1 6 0v3c0 2 2 2 2 4v4M8 18h16l2 6H6l2-6Z" /><path d="M6 28h20" /></svg></span><span>STAMP<span className="brand-light">DOCK</span><span className="brand-dot">®</span></span></a>
      <nav className="topnav" aria-label="メイン"><button className={`nav-tab${view !== 'editor' ? ' active' : ''}`} data-nav="library" aria-current={view !== 'editor' ? 'page' : undefined} onClick={() => { clearFilters(); navigate('library'); }}><Icon name="grid" />テンプレート</button><button className={`nav-tab${view === 'editor' ? ' active' : ''}`} data-nav="editor" aria-current={view === 'editor' ? 'page' : undefined} onClick={() => navigate('editor')}><Icon name="pen" />つくる</button></nav><div className="topbar-note"><span className="online-dot" />ことばに、ひと手間。</div>
    </header>
    <div className="app-shell"><aside className="sidebar" aria-label="スタンプの絞り込み"><div className="sidebar-caption">LIBRARY</div><div id="main-filter">{sidebarButton('all', 'すべてのスタンプ', 'grid', TEMPLATES.length, view === 'library' && category === 'all')}{sidebarButton('packs', 'スタンプパック', 'package', PACKS.length, view === 'packs')}</div><div className="sidebar-caption category-caption">カテゴリー</div>
      <nav id="category-nav" className="category-nav" aria-label="カテゴリー">{CATEGORIES.filter(item => item.id !== 'all').map(item => sidebarButton(item.id, item.label, categoryIcons[item.id], TEMPLATES.filter(stamp => stamp.category === item.id).length, view === 'library' && category === item.id))}</nav><div className="sidebar-divider" /><div id="personal-nav">{sidebarButton('favorites', 'お気に入り', 'heart', favoriteIds.length, view === 'favorites')}{sidebarButton('mine', 'マイスタンプ', 'bookmark', customStamps.length, view === 'mine')}</div>
      <div className="sidebar-bottom"><div className="tiny-stamp" aria-hidden="true">{'</>'}</div><p>小さなスタンプで、<br />やりとりをちょっと楽しく。</p><span>透過PNG · ローカル保存</span><button id="about-button" className="text-link" onClick={() => setAbout(true)}>このサイトについて <Icon name="arrow-up-right" /></button></div>
    </aside><main id="main-content" data-ready={ready}>
      <StampLibrary view={view} category={category} query={query} onQuery={value => { setQuery(value); setPageSize(24); }} sort={sort} onSort={setSort} stamps={stamps} total={view === 'favorites' ? favoriteIds.length : view === 'mine' ? customStamps.length : TEMPLATES.length} pageSize={pageSize} favoriteIds={favoriteIds} onFavorite={toggleFavorite} onDetail={setDetail} onDownload={stamp => downloadStamp(stamp, stamp.id)} downloadIds={downloadIds} onCreate={newStamp} onClearFilters={() => { if (view === 'mine' && !query) newStamp(); else { clearFilters(); navigate('library', false); focus('#search'); } }} onLoadMore={() => { setPageSize(pageSize + 24); requestAnimationFrame(() => document.querySelectorAll<HTMLElement>('.card-preview')[pageSize]?.focus({ preventScroll: true })); }} resolution={resolution} onResolutionChange={setResolution} onRenderError={onRenderError} ready={ready} />
      <StampPacks visible={view === 'packs'} resolution={resolution} onResolutionChange={setResolution} job={packJob} onDownload={downloadPack} onPreview={id => setPackDetail(PACKS.find(pack => pack.id === id) || null)} onCancel={cancelPack} onRenderError={onRenderError} />
      <div hidden={view !== 'editor'}><StampEditor config={config} onChange={setConfig} resolution={resolution} onResolutionChange={setResolution} onDownload={() => downloadStamp(config, 'editor')} onSave={saveCustom} onReset={() => { setConfig({ ...DEFAULT }); setEditingId(null); }} editing={Boolean(editingId)} downloading={downloadIds.includes('editor')} onRenderError={onRenderError} /></div>
      <footer className="footer"><span className="footer-brand">STAMPDOCK<span> / </span>MADE FOR THE LITTLE REPLIES.</span><span><button id="footer-about" className="footer-about" onClick={() => setAbout(true)}>このサイトについて</button><span className="footer-flower">✳</span></span></footer>
    </main></div>
    <StampDetail stamp={detail} category={detail ? categoryName(detail.category) : ''} favorite={Boolean(detail && favoriteIds.includes(detail.id))} resolution={resolution} busy={Boolean(detail && downloadIds.includes(detail.id))} onClose={() => setDetail(null)} onResolutionChange={setResolution} onDownload={() => { if (detail) downloadStamp(detail, detail.id); }} onFavorite={() => { if (detail) toggleFavorite(detail); }} onEdit={() => { if (detail) editStamp(detail); }} onDelete={deleteCustom} onRenderError={onRenderError} />
    <PackDetail pack={packDetail} resolution={resolution} busy={Boolean(packJob)} onClose={() => setPackDetail(null)} onResolutionChange={setResolution} onDownload={() => { if (packDetail) downloadPack(packDetail.id); }} onRenderError={onRenderError} />
    <AboutDialog open={about} onClose={() => setAbout(false)} />
    <div id="toast" className={`toast${toast?.error ? ' error' : ''}`} role="status" aria-live="polite" hidden={!toast}>{toast?.message}</div>
  </>;
}
