import { RESOLUTIONS, type Resolution } from '@/lib/types';

export default function ResolutionSelect({ id, value, onChange, label, dimensions = false }: {
  id: string; value: Resolution; onChange: (value: Resolution) => void; label?: string; dimensions?: boolean;
}) {
  return <select id={id} className="resolution-select" value={value} aria-label={label} onChange={event => onChange(Number(event.target.value) as Resolution)}>
    {RESOLUTIONS.map(size => <option key={size} value={size}>{dimensions ? `${size} × ${size} px` : `${size} px`}</option>)}
  </select>;
}
