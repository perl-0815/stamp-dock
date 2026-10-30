'use client';

import type { CSSProperties } from 'react';
import type { Resolution } from '@/lib/types';
import { PACKS, packStamps } from '../../public/assets/packs.js';
import Icon from './Icon';
import ResolutionSelect from './ResolutionSelect';
import StampCanvas from './StampCanvas';

export interface StampPacksProps {
  visible: boolean;
  resolution: Resolution;
  onResolutionChange: (size: Resolution) => void;
  job: { id: string; name: string; size: Resolution; done: number; total: number; cancelling: boolean } | null;
  onDownload: (id: string) => void;
  onPreview: (id: string) => void;
  onCancel: () => void;
  onRenderError?: (error: unknown) => void;
}

const packs = PACKS.map(pack => ({ ...pack, preview: packStamps(pack).slice(0, 4) }));

export default function StampPacks({
  visible, resolution, onResolutionChange, job, onDownload, onPreview, onCancel, onRenderError,
}: StampPacksProps) {
  return <section id="packs-view" hidden={!visible} aria-labelledby="packs-title">
    <div className="packs-heading">
      <div>
        <div className="eyebrow">GOOD TO GO, TOGETHER.</div>
        <h1 id="packs-title">いつものひとことを、<br />ひとまとめに。</h1>
        <p>用途に合わせた6つのパック。すべて16個入りの透過PNG。</p>
      </div>
      <div className="pack-format"><Icon name="package" /><span>16 STAMPS<br /><strong>1 ZIP FILE</strong></span></div>
    </div>
    <div className="pack-toolbar">
      <div><h2>スタンプパック</h2><span>中身を確認して、まとめてダウンロード。</span></div>
      <label className="resolution-label" htmlFor="pack-resolution"><span>1枚あたりの解像度</span>
        <ResolutionSelect id="pack-resolution" value={resolution} onChange={onResolutionChange} label="パックの出力サイズ" />
      </label>
    </div>
    <div id="pack-progress" className="pack-progress" hidden={!job}>
      <div>
        <p id="pack-progress-message" role="status" aria-live="polite">{job ? `${job.name}を${job.size}pxで作成中… ${job.done} / ${job.total}` : ''}</p>
        <progress id="pack-progress-bar" max={job?.total || 16} value={job?.done || 0} aria-label="パックの画像生成" />
      </div>
      <button type="button" id="cancel-pack" className="button button-light" onClick={onCancel}>{job?.cancelling ? '中止しています…' : 'キャンセル'}</button>
    </div>
    <div id="pack-grid" className="pack-grid">
      {packs.map((pack, index) => <article className="pack-card" key={pack.id} style={{ '--pack-color': pack.color } as CSSProperties}>
        <button type="button" className="pack-art" data-pack-detail={pack.id} aria-label={`${pack.name}パックの16個を見る`} onClick={() => onPreview(pack.id)}>
          <span className="pack-number">PACK {String(index + 1).padStart(2, '0')}</span>
          <div className="pack-stamp-strip">{pack.preview.map(stamp => <StampCanvas key={stamp.id} config={stamp} size={240} aria-hidden="true" onRenderError={onRenderError} />)}</div>
          <span className="pack-art-caption">{pack.tagline}</span>
          <span className="pack-seal">16<br /><small>STAMPS</small></span>
        </button>
        <div className="pack-card-info">
          <div className="pack-card-title"><h3>{pack.name}</h3><span className="pack-download-size">{resolution} px / PNG</span></div>
          <p>{pack.description}</p>
          <div className="pack-card-actions">
            <button type="button" className="text-link" data-pack-detail={pack.id} onClick={() => onPreview(pack.id)}>中身を見る <Icon name="arrow-right" /></button>
            <button type="button" className="button button-dark" data-pack-download={pack.id} disabled={Boolean(job)} aria-busy={job?.id === pack.id} onClick={() => onDownload(pack.id)}><Icon name="download" />ZIPで保存</button>
          </div>
        </div>
      </article>)}
    </div>
    <p className="pack-footnote">ZIPにはPNG画像16枚と、ファイル名・スタンプ名の一覧が入ります。画像の背景は透明です。</p>
  </section>;
}
