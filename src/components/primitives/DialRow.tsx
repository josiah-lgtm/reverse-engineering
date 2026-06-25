import { useEffect, useRef, useState } from 'react';
import { cssVars } from '../../lib/css';

export interface DialRowProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  /** Called on every slider drag / number edit (store updates immediately — fully reactive). */
  onChange: (value: number) => void;
}

/**
 * Linked range slider + number input sharing one value. Replaces the original's
 * makeRow/wireRow + the cheap-text/full-rebuild split — in React both collapse
 * into one reactive update. The number input allows overshoot to max*5.
 */
export function DialRow({ label, hint, value, min, max, step, unit, onChange }: DialRowProps) {
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);

  const numberMax = max * 5;
  const sliderValue = Math.min(value, max);
  const pct = max > 0 ? (sliderValue / max) * 100 : 0;

  return (
    <div className="row">
      <div className="lbl">
        {label}
        {hint && <span className="hint">{hint}</span>}
      </div>
      <div className="slider-wrap">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          style={cssVars({ '--pct': pct.toFixed(1) + '%' })}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
      </div>
      <input
        type="number"
        min={min}
        max={numberMax}
        step={step}
        value={draft}
        onFocus={() => (focused.current = true)}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(parseFloat(e.target.value) || 0);
        }}
        onBlur={() => {
          focused.current = false;
          setDraft(String(value));
        }}
      />
      <span className="unit">{unit ?? ''}</span>
    </div>
  );
}
