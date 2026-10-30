'use client';

import { useState, type CSSProperties } from 'react';
import type { FontId, Resolution, StampConfig } from '@/lib/types';
import { PALETTE, STYLES } from '../../public/assets/templates.js';
import Icon from './Icon';
import ResolutionSelect from './ResolutionSelect';
import StampCanvas from './StampCanvas';

export interface StampEditorProps {
  config: StampConfig;
  onChange: (next: StampConfig) => void;
  resolution: Resolution;
  onResolutionChange: (size: Resolution) => void;
  onDownload: () => void;
  onSave: () => void;
  onReset: () => void;
  editing: boolean;
  downloading: boolean;
  onRenderError?: (error: unknown) => void;
}

const STYLE_SAMPLES: Record<string, string> = {
  outline: 'OK', solid: 'Hi!', badge: 'GOOD', terminal: '>_',
  pixel: '8BIT', hand: 'Thanks', circle: '済', impact: 'YES!',
};
const COLOR_NAMES = [
  'フォレストグリーン', 'オレンジ', 'ブルー', 'ローズ',
  'パープル', 'マスタード', 'ティール', 'チャコール',
];
const BACKGROUND_NAMES = { transparent: '透明', white: '白', color: 'カスタム' };

export default function StampEditor({
  config, onChange, resolution, onResolutionChange, onDownload, onSave, onReset,
  editing, downloading, onRenderError,
}: StampEditorProps) {
  const [surface, setSurface] = useState<'light' | 'dark'>('light');
  const empty = !config.text.trim();
  const background = config.background || 'transparent';
  const backgroundColor = /^#[0-9a-f]{6}$/i.test(config.backgroundColor || '')
    ? config.backgroundColor : '#f5eee3';
  const scale = Math.round((config.textScale ?? 1) * 100);
  const rotation = config.rotation ?? 0;
  const update = (patch: Partial<StampConfig>) => onChange({ ...config, ...patch });

  return <section id="editor-view" aria-labelledby="editor-title">
    <div className="editor-heading">
      <div>
        <div className="eyebrow">MAKE IT YOURS.</div>
        <h1 id="editor-title">ひとことを、カタチに。</h1>
        <p>好きなことばと色で、自分だけのスタンプ。</p>
      </div>
      <button type="button" className="button button-light" id="reset-editor" onClick={onReset}>
        <Icon name="rotate" />リセット
      </button>
    </div>
    <div className="editor-layout">
      <form id="editor-form" className="editor-controls" onSubmit={event => event.preventDefault()}>
        <section className="control-section">
          <h2><span className="step-number">01</span>ことばを入れる</h2>
          <label className="field-label" htmlFor="stamp-text">メインテキスト <span id="text-count">{config.text.length} / 40</span></label>
          <textarea id="stamp-text" rows={2} maxLength={40} placeholder="LGTM!" value={config.text}
            onChange={event => update({ text: event.currentTarget.value })} />
          <label className="field-label" htmlFor="stamp-subtext">サブテキスト <span>任意</span></label>
          <input id="stamp-subtext" type="text" maxLength={40} placeholder="LOOKS GOOD TO ME" value={config.subtext}
            onChange={event => update({ subtext: event.currentTarget.value })} />
        </section>
        <section className="control-section">
          <h2><span className="step-number">02</span>スタイルを選ぶ</h2>
          <div id="style-options" className="style-options">
            {STYLES.map(item => <button key={item.id} type="button" data-style={item.id}
              className={`style-option${config.style === item.id ? ' selected' : ''}`}
              aria-pressed={config.style === item.id} onClick={() => update({ style: item.id })}>
              <span className="style-sample" aria-hidden="true">{STYLE_SAMPLES[item.id]}</span>{item.label}
            </button>)}
          </div>
        </section>
        <section className="control-section">
          <h2><span className="step-number">03</span>色と仕上がり</h2>
          <div className="field-label" id="stamp-color-label">スタンプの色</div>
          <div className="color-options" id="color-options" role="group" aria-labelledby="stamp-color-label">
            {PALETTE.map((color, index) => <button key={color} type="button" data-color={color}
              className={`color-swatch${config.color === color ? ' selected' : ''}`}
              style={{ '--swatch': color } as CSSProperties} aria-label={COLOR_NAMES[index]}
              aria-pressed={config.color === color} onClick={() => update({ color })} />)}
            <label className="custom-color-label" title="好きな色を選ぶ">
              <input type="color" id="custom-color" value={config.color} aria-label="好きなスタンプの色"
                onChange={event => update({ color: event.currentTarget.value })} />
              <span aria-hidden="true">+</span>
            </label>
          </div>
          <div className="field-pair">
            <label className="field-label" htmlFor="font-select">書体
              <select id="font-select" value={config.font || 'rounded'}
                onChange={event => update({ font: event.currentTarget.value as FontId })}>
                <option value="rounded">丸ゴシック</option><option value="sans">太ゴシック</option>
                <option value="mono">等幅</option><option value="serif">明朝体</option>
              </select>
            </label>
            <label className="field-label" htmlFor="background-select">背景
              <select id="background-select" value={background}
                onChange={event => update({ background: event.currentTarget.value as StampConfig['background'] })}>
                <option value="transparent">透明</option><option value="white">白</option><option value="color">好きな色</option>
              </select>
            </label>
          </div>
          <label id="background-color-label" className="field-label background-color-label" hidden={background !== 'color'}>
            背景の色<input id="background-color" type="color" value={backgroundColor}
              onChange={event => update({ backgroundColor: event.currentTarget.value })} />
          </label>
          <div className="range-field">
            <label htmlFor="text-scale">文字の大きさ</label>
            <input id="text-scale" type="range" min="70" max="130" value={scale}
              onChange={event => update({ textScale: Number(event.currentTarget.value) / 100 })} />
            <output id="text-scale-value" htmlFor="text-scale">{scale}%</output>
          </div>
          <div className="range-field">
            <label htmlFor="rotation">傾き</label>
            <input id="rotation" type="range" min="-12" max="12" value={rotation}
              onChange={event => update({ rotation: Number(event.currentTarget.value) })} />
            <output id="rotation-value" htmlFor="rotation">{rotation}°</output>
          </div>
        </section>
      </form>
      <div className="editor-preview-column">
        <div className="preview-panel">
          <div className="preview-top">
            <span><span className="small-dot" /> LIVE PREVIEW</span>
            <div className="preview-surface-options" role="group" aria-label="プレビューの表示色">
              <button type="button" className={`surface-button${surface === 'light' ? ' selected' : ''}`} data-surface="light"
                aria-label="明るいプレビュー" aria-pressed={surface === 'light'} onClick={() => setSurface('light')} />
              <button type="button" className={`surface-button dark-surface${surface === 'dark' ? ' selected' : ''}`} data-surface="dark"
                aria-label="暗いプレビュー" aria-pressed={surface === 'dark'} onClick={() => setSurface('dark')} />
            </div>
          </div>
          <div className={`editor-canvas-wrap checkerboard${surface === 'dark' ? ' dark' : ''}`} id="editor-canvas-wrap">
            <StampCanvas id="editor-canvas" config={config} size={640} hidden={empty}
              aria-label="作成中のスタンプのプレビュー" onRenderError={onRenderError} />
            <div id="preview-empty" hidden={!empty}>ことばを入力すると、ここに表示されます。</div>
          </div>
          <div className="preview-bottom"><span id="preview-background-note">背景：{BACKGROUND_NAMES[background]}</span>
            <span id="preview-dimensions">{resolution} × {resolution} px</span></div>
        </div>
        <div className="download-panel">
          <label htmlFor="editor-resolution">画像の解像度</label>
          <ResolutionSelect id="editor-resolution" value={resolution} onChange={onResolutionChange}
            label="作成するスタンプの出力サイズ" dimensions />
          <button type="button" className="button button-dark download-primary" id="editor-download"
            disabled={empty || downloading} aria-busy={downloading} onClick={onDownload}>
            <Icon name="download" />PNGをダウンロード<Icon name="arrow-down-right" />
          </button>
          <button type="button" className="button button-light" id="save-custom" disabled={empty} onClick={onSave}>
            <Icon name="bookmark" />{editing ? 'マイスタンプを更新' : 'マイスタンプに保存'}
          </button>
          <p className="download-note"><Icon name="shield" />作成内容はこのブラウザ内だけに保存されます。</p>
        </div>
      </div>
    </div>
  </section>;
}
