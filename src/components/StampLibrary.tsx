'use client';

import type { Resolution, Stamp, View } from '@/lib/types';
import { CATEGORIES, TEMPLATES } from '../../public/assets/templates.js';
import Icon from './Icon';
import ResolutionSelect from './ResolutionSelect';
import StampCanvas from './StampCanvas';

export interface StampLibraryProps {
  view: View;
  category: string;
  query: string;
  onQuery: (query: string) => void;
  sort: string;
  onSort: (sort: string) => void;
  stamps: Stamp[];
  total: number;
  pageSize: number;
  favoriteIds: string[];
  onFavorite: (stamp: Stamp) => void;
  onDetail: (stamp: Stamp) => void;
  onDownload: (stamp: Stamp) => void;
  downloadIds: string[];
  onCreate: () => void;
  onClearFilters: () => void;
  onLoadMore: () => void;
  resolution: Resolution;
  onResolutionChange: (size: Resolution) => void;
  onRenderError?: (error: unknown) => void;
  ready: boolean;
}

const heroStamps = [
  { ...TEMPLATES[0], text: 'LGTM!', rotation: 0 },
  { ...TEMPLATES[1], rotation: 0 },
  { ...TEMPLATES[2], rotation: 0 },
];

function categoryName(id: string) {
  return id === 'custom' ? 'マイスタンプ' : CATEGORIES.find(item => item.id === id)?.label || '';
}

export default function StampLibrary({
  view, category, query, onQuery, sort, onSort, stamps, total, pageSize,
  favoriteIds, onFavorite, onDetail, onDownload, downloadIds, onCreate,
  onClearFilters, onLoadMore, resolution, onResolutionChange, onRenderError, ready,
}: StampLibraryProps) {
  const personal = view === 'favorites' || view === 'mine';
  const emptyPersonal = personal && !query;
  const shown = stamps.slice(0, pageSize);
  const title = view === 'favorites' ? 'お気に入り' : view === 'mine' ? 'マイスタンプ' : 'スタンプを見つける';
  const emptyTitle = emptyPersonal
    ? view === 'mine' ? 'まだマイスタンプがありません' : 'まだお気に入りがありません'
    : 'スタンプが見つかりません';
  const emptyDescription = emptyPersonal
    ? view === 'mine'
      ? 'つくったスタンプを保存すると、ここからいつでも使えます。'
      : '気に入ったスタンプのハートを押すと、ここに集まります。'
    : '別のことばやカテゴリーで探してみてください。';
  const emptyAction = emptyPersonal
    ? view === 'mine' ? 'スタンプをつくる' : 'テンプレートを見る'
    : '絞り込みを解除';

  return <section id="library-view" hidden={view === 'editor' || view === 'packs'}>
    <div className="hero" hidden={personal}>
      <div className="hero-copy">
        <div className="eyebrow"><span /> A LITTLE STAMP, A BETTER DAY.</div>
        <h1>ことばを、<br />ちょうどいいスタンプに<span className="orange-period">。</span></h1>
        <p>レビューにも、ひとことのお礼にも。<br />エンジニアの毎日に、小さな表現を。</p>
        <button type="button" className="button button-dark" id="hero-create" onClick={onCreate}>
          <Icon name="plus" />自分のスタンプをつくる<Icon name="arrow-right" />
        </button>
        <div className="hero-footnote">登録不要 <span>・</span> すべて無料 <span>・</span> 商用利用OK</div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <span className="art-code">{'{ nice work }'}</span>
        <span className="art-star star-one">✦</span>
        <div className="hero-stamp hero-lgtm"><StampCanvas id="hero-lgtm" config={heroStamps[0]} size={640} onRenderError={onRenderError} /></div>
        <div className="hero-stamp hero-done"><StampCanvas id="hero-done" config={heroStamps[1]} size={512} onRenderError={onRenderError} /></div>
        <div className="hero-stamp hero-thanks"><StampCanvas id="hero-thanks" config={heroStamps[2]} size={512} onRenderError={onRenderError} /></div>
        <span className="art-star star-two">✧</span>
        <span className="art-caption">made for your daily commits.</span>
        <svg className="art-arrow" viewBox="0 0 100 65"><path d="M4 7c46-2 68 11 65 40M57 37l12 13 13-11" /></svg>
      </div>
    </div>
    <section className="library-section" aria-labelledby="library-title">
      <div className="section-title-row">
        <div className="section-title"><h2 id="library-title">{title}</h2><span id="total-count" className="count-badge">{total}</span></div>
        <div className="collection-note"><span className="small-dot" />ひとこと、よりどり。</div>
      </div>
      <div className="toolbar">
        <div className="search-field">
          <Icon name="search" />
          <input id="search" type="search" aria-label="スタンプを検索" placeholder="LGTM、解決済み、ありがとう…" autoComplete="off" value={query} onChange={event => onQuery(event.target.value)} />
          <kbd>/</kbd>
        </div>
        <label className="resolution-label" htmlFor="library-resolution">
          <Icon name="download" /><span>出力サイズ</span>
          <ResolutionSelect id="library-resolution" value={resolution} onChange={onResolutionChange} label="テンプレートの出力サイズ" />
        </label>
      </div>
      <div className="results-row">
        <p id="results-description" aria-live="polite">
          {query && <>「{query}」 · </>}
          {view === 'library' && <>{category === 'all' ? 'すべてのスタンプ' : categoryName(category)} · </>}
          <strong>{stamps.length}</strong> 件
        </p>
        <label className="sort-label" htmlFor="sort"><Icon name="sort" />
          <select id="sort" aria-label="並び順" value={sort} onChange={event => onSort(event.target.value)}>
            <option value="recommended">おすすめ順</option><option value="name">名前順</option>
          </select>
        </label>
      </div>
      <div id="stamp-grid" className="stamp-grid">
        {shown.map(stamp => {
          const favorite = favoriteIds.includes(stamp.id);
          const downloading = downloadIds.includes(stamp.id);
          return <article className="stamp-card" key={stamp.id}>
            <button type="button" className={`card-favorite${favorite ? ' is-favorite' : ''}`} data-favorite={stamp.id} aria-label={`${stamp.name}をお気に入り${favorite ? 'から削除' : 'に追加'}`} aria-pressed={favorite} disabled={!ready} onClick={() => onFavorite(stamp)}>
              <Icon name="heart" />
            </button>
            <button type="button" className="card-preview" data-detail={stamp.id} aria-label={`${stamp.name}をプレビュー`} onClick={() => onDetail(stamp)}>
              <StampCanvas config={stamp} size={400} aria-hidden="true" onRenderError={onRenderError} />
            </button>
            <div className="card-info">
              <div><h3 className="card-name">{stamp.name}</h3><span className="card-category">{categoryName(stamp.category)}</span></div>
              <button type="button" className="card-download" data-download={stamp.id} aria-label={`${stamp.name}を${resolution}pxのPNGでダウンロード`} aria-busy={downloading} disabled={downloading} onClick={() => onDownload(stamp)}><Icon name="download" /></button>
            </div>
          </article>;
        })}
      </div>
      <div id="empty-state" className="empty-state" hidden={stamps.length > 0}>
        <Icon name="search" /><h3 id="empty-title">{emptyTitle}</h3><p id="empty-description">{emptyDescription}</p>
        <button type="button" className="button button-light" id="empty-action" onClick={onClearFilters}>{emptyAction}</button>
      </div>
      <button type="button" id="load-more" className="button button-light load-more" hidden={stamps.length <= pageSize} onClick={onLoadMore}>もっと見る<Icon name="chevron-down" /></button>
    </section>
  </section>;
}
