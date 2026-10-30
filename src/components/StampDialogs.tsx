'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { packStamps } from '../../public/assets/packs.js';
import type { Resolution, Stamp, StampPack } from '@/lib/types';
import Icon from './Icon';
import ResolutionSelect from './ResolutionSelect';
import StampCanvas from './StampCanvas';

function Dialog({ open, onClose, id, className, labelledBy, children }: {
  open: boolean; onClose: () => void; id: string; className: string; labelledBy: string; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} id={id} className={className} aria-labelledby={labelledBy} onClose={onClose} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }}>{children}</dialog>;
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return <button className="icon-button close-dialog" aria-label="閉じる" onClick={onClose}><Icon name="x" /></button>;
}

export function StampDetail({ stamp, category, favorite, resolution, busy, onClose, onResolutionChange, onDownload, onFavorite, onEdit, onDelete, onRenderError }: {
  stamp: Stamp | null; category: string; favorite: boolean; resolution: Resolution; busy: boolean;
  onClose: () => void; onResolutionChange: (value: Resolution) => void; onDownload: () => void;
  onFavorite: () => void; onEdit: () => void; onDelete: () => void; onRenderError: (error: unknown) => void;
}) {
  return <Dialog open={Boolean(stamp)} onClose={onClose} id="stamp-dialog" className="stamp-dialog" labelledBy="dialog-title">
    <div className="dialog-top"><span id="dialog-category" className="dialog-category">{category}</span><CloseButton onClose={onClose} /></div>
    {stamp && <><div className="dialog-preview checkerboard"><StampCanvas key={stamp.id} config={stamp} size={640} id="detail-canvas" aria-label="選んだスタンプのプレビュー" onRenderError={onRenderError} /></div>
      <div className="dialog-info"><h2 id="dialog-title">{stamp.name}</h2><p id="dialog-tags">{stamp.tags.length ? stamp.tags.map(tag => `#${tag}`).join('  ') : '自分だけのスタンプ'}</p>
        <label className="field-label" htmlFor="detail-resolution">画像の解像度<ResolutionSelect id="detail-resolution" value={resolution} onChange={onResolutionChange} dimensions /></label>
        <button id="detail-download" className="button button-dark" onClick={onDownload} disabled={busy} aria-busy={busy}><Icon name="download" />PNGをダウンロード</button>
        <div className="dialog-secondary"><button id="detail-edit" className="button button-light" onClick={onEdit}><Icon name="pen" />このスタンプを編集</button><button id="detail-favorite" className={`button button-light${favorite ? ' is-favorite' : ''}`} onClick={onFavorite} aria-pressed={favorite} aria-label={favorite ? 'お気に入りから削除' : 'お気に入りに追加'}><Icon name="heart" />{favorite ? '登録済み' : 'お気に入り'}</button></div>
        <button id="delete-custom" className="text-link delete-custom" onClick={onDelete} hidden={stamp.category !== 'custom'}>マイスタンプから削除</button>
      </div></>}
  </Dialog>;
}

export function PackDetail({ pack, resolution, busy, onClose, onResolutionChange, onDownload, onRenderError }: {
  pack: StampPack | null; resolution: Resolution; busy: boolean; onClose: () => void;
  onResolutionChange: (value: Resolution) => void; onDownload: () => void; onRenderError: (error: unknown) => void;
}) {
  return <Dialog open={Boolean(pack)} onClose={onClose} id="pack-dialog" className="stamp-dialog pack-dialog" labelledBy="pack-dialog-title">
    <div className="dialog-top"><span className="dialog-category">STAMP PACK / 16 STAMPS</span><CloseButton onClose={onClose} /></div>
    {pack && <div className="pack-dialog-body"><h2 id="pack-dialog-title">{pack.name}パック</h2><p id="pack-dialog-description">{pack.description}</p>
      <div id="pack-contents" className="pack-contents">{packStamps(pack).map(stamp => <div className="pack-content-item" key={stamp.id}><StampCanvas config={stamp} size={240} aria-hidden="true" onRenderError={onRenderError} /><span>{stamp.name}</span></div>)}</div>
      <div className="pack-dialog-actions"><label className="field-label" htmlFor="pack-detail-resolution">1枚あたりの解像度<ResolutionSelect id="pack-detail-resolution" value={resolution} onChange={onResolutionChange} dimensions /></label><button id="pack-dialog-download" className="button button-dark" data-pack-download={pack.id} disabled={busy} onClick={onDownload}><Icon name="download" />16個をZIPでダウンロード</button></div>
    </div>}
  </Dialog>;
}

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <Dialog open={open} onClose={onClose} id="about-dialog" className="about-dialog" labelledBy="about-title">
    <CloseButton onClose={onClose} /><div className="eyebrow">ABOUT STAMPDOCK</div><h2 id="about-title">日々のやりとりに、<br />ちょうどいいひと押し。</h2>
    <p>エンジニアのための、小さなスタンプ工房です。すべてのテンプレートは無料で、個人・商用を問わず利用できます。</p>
    <p>PNGの透明な部分に見えるチェック模様は、ダウンロードした画像には含まれません。出力サイズは正方形の画像全体のピクセル数です。</p>
    <p>お気に入りとマイスタンプは、このブラウザに保存されます。端末間の同期はなく、ブラウザのサイトデータを消すと削除されます。</p>
    <p className="about-fonts">書体：M PLUS Rounded 1c / Dela Gothic One<br /><a href="/assets/licenses/m-plus-rounded-1c.txt" target="_blank" rel="noopener">フォントライセンス：M PLUS</a> · <a href="/assets/licenses/dela-gothic-one.txt" target="_blank" rel="noopener">Dela Gothic One</a></p>
  </Dialog>;
}
