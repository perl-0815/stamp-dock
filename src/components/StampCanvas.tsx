'use client';

import { useEffect, useEffectEvent, useRef, type CanvasHTMLAttributes } from 'react';
import type { StampConfig } from '@/lib/types';
import { renderStamp } from '../../public/assets/render.js';

export interface StampCanvasProps extends CanvasHTMLAttributes<HTMLCanvasElement> {
  config: StampConfig;
  size?: number;
  onRenderError?: (error: unknown) => void;
}

export default function StampCanvas({
  config,
  size = 512,
  onRenderError,
  ...canvasProps
}: StampCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reportRenderError = useEffectEvent((error: unknown) => onRenderError?.(error));
  const { text, subtext, style, color, rotation, font, background, backgroundColor, textScale } = config;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let current = true;
    void renderStamp(canvas, {
      text, subtext, style, color, rotation, font, background, backgroundColor, textScale,
    }, size).catch((error: unknown) => {
      if (current) reportRenderError(error);
    });
    return () => { current = false; };
  }, [text, subtext, style, color, rotation, font, background, backgroundColor, textScale, size]);

  return <canvas {...canvasProps} ref={canvasRef} width={size} height={size} />;
}
