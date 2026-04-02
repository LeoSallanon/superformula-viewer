import { useEffect, useMemo, useState } from 'react';

type VectorSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function superRadius(m: number, n1: number, n2: number, n3: number, phi: number) {
  const safeM = clamp(m, 0, 20);
  const safeN1 = Math.max(n1, 0.0001);
  const safeN2 = Math.max(n2, 0.0001);
  const safeN3 = Math.max(n3, 0.0001);

  const t1 = Math.pow(Math.abs(Math.cos((safeM * phi) / 4)), safeN2);
  const t2 = Math.pow(Math.abs(Math.sin((safeM * phi) / 4)), safeN3);
  const denom = Math.pow(t1 + t2, 1 / safeN1);

  return denom === 0 ? 0 : 1 / denom;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatEditableNumber(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, '');
}

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  subdued?: boolean;
};

function Slider({ label, value, min, max, step = 0.1, onChange, subdued = false }: SliderProps) {
  const className = subdued ? 'slider shell subdued' : 'slider shell';
  const [draftValue, setDraftValue] = useState(formatEditableNumber(value));

  useEffect(() => {
    setDraftValue(formatEditableNumber(value));
  }, [value]);

  const commitDraft = () => {
    const normalized = draftValue.replace(',', '.').trim();
    const next = Number(normalized);
    if (Number.isNaN(next)) {
      setDraftValue(formatEditableNumber(value));
      return;
    }
    const clamped = clamp(next, min, max);
    onChange(clamped);
    setDraftValue(formatEditableNumber(clamped));
  };

  return (
    <div className={className}>
      <label className="slider-head" htmlFor={label}>
        <span>{label}</span>
        <div className="numeric-control">
          <button
            type="button"
            aria-label={`Diminuer ${label}`}
            onClick={() => {
              const next = clamp(value - step, min, max);
              onChange(next);
              setDraftValue(formatEditableNumber(next));
            }}
          >
            −
          </button>
          <input
            id={label}
            type="text"
            inputMode="decimal"
            value={draftValue}
            aria-label={`Valeur de ${label}`}
            onChange={(event) => setDraftValue(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                commitDraft();
              }
            }}
          />
          <button
            type="button"
            aria-label={`Augmenter ${label}`}
            onClick={() => {
              const next = clamp(value + step, min, max);
              onChange(next);
              setDraftValue(formatEditableNumber(next));
            }}
          >
            +
          </button>
        </div>
      </label>
      <div className="slider-track-wrap">
        <input
          className="slider-range-input"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(next);
            setDraftValue(formatEditableNumber(next));
          }}
        />
      </div>
      <div className="slider-range">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [m, setM] = useState(6);
  const [n1, setN1] = useState(12);
  const [n2, setN2] = useState(15);
  const [n3, setN3] = useState(15);
  const [showVectorField, setShowVectorField] = useState(false);
  const [fieldAngle, setFieldAngle] = useState(0);

  const width = 760;
  const height = 760;
  const cx = width / 2;
  const cy = height / 2;
  const scale = 165;
  const samples = 1000;
  const ringGuides = [90, 140, 190, 240];

  const getBoundaryPoint = (phi: number) => {
    const r = superRadius(m, n1, n2, n3, phi);
    return {
      x: cx + scale * r * Math.cos(phi),
      y: cy + scale * r * Math.sin(phi)
    };
  };

  const getTangent = (phi: number) => {
    const delta = 0.008;
    const p1 = getBoundaryPoint(phi - delta);
    const p2 = getBoundaryPoint(phi + delta);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;

    return { x: dx / len, y: dy / len };
  };

  const pathData = useMemo(() => {
    const points: string[] = [];
    for (let i = 0; i <= samples; i += 1) {
      const phi = (Math.PI * 2 * i) / samples - Math.PI;
      const r = superRadius(m, n1, n2, n3, phi);
      const x = cx + scale * r * Math.cos(phi);
      const y = cy + scale * r * Math.sin(phi);
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return `${points.join(' ')} Z`;
  }, [cx, cy, m, n1, n2, n3, samples, scale]);

  const radialGuides = useMemo(() => {
    const guides: Array<{ x: number; y: number; key: string }> = [];
    for (let i = 0; i < 12; i += 1) {
      const a = (Math.PI * 2 * i) / 12;
      guides.push({
        key: `guide-${i}`,
        x: cx + Math.cos(a) * 245,
        y: cy + Math.sin(a) * 245
      });
    }
    return guides;
  }, [cx, cy]);

  const vectorSegments = useMemo(() => {
    if (!showVectorField) {
      return [] as VectorSegment[];
    }

    const segments: VectorSegment[] = [];
    const spacing = 28;
    const influenceRadius = 265;
    const angleRad = (fieldAngle * Math.PI) / 180;

    for (let y = cy - influenceRadius; y <= cy + influenceRadius; y += spacing) {
      for (let x = cx - influenceRadius; x <= cx + influenceRadius; x += spacing) {
        const dx = x - cx;
        const dy = y - cy;
        const pointRadius = Math.hypot(dx, dy);
        if (pointRadius > influenceRadius) {
          continue;
        }

        const phi = Math.atan2(dy, dx);
        const boundaryRadius = scale * superRadius(m, n1, n2, n3, phi);
        const distanceToBoundary = boundaryRadius - pointRadius;
        const falloff = Math.exp(-Math.pow(Math.abs(distanceToBoundary) / 44, 2));
        const insideBoost = pointRadius <= boundaryRadius ? 1 : 0.35;
        const strength = falloff * (0.45 + insideBoost * 0.55);

        if (strength < 0.12) {
          continue;
        }

        const tangent = getTangent(phi);
        const normal = { x: -tangent.y, y: tangent.x };
        const vx = tangent.x * Math.cos(angleRad) + normal.x * Math.sin(angleRad);
        const vy = tangent.y * Math.cos(angleRad) + normal.y * Math.sin(angleRad);
        const len = 5 + 12 * strength;

        segments.push({
          x1: x - vx * len,
          y1: y - vy * len,
          x2: x + vx * len,
          y2: y + vy * len,
          opacity: 0.06 + 0.34 * strength
        });
      }
    }

    return segments;
  }, [cx, cy, fieldAngle, m, n1, n2, n3, scale, showVectorField]);

  return (
    <main className="app-shell">
      <section className="top-grid">
        <article className="preview-card">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Aperçu de la superformule">
            {ringGuides.map((r) => (
              <circle key={`ring-${r}`} cx={cx} cy={cy} r={r} fill="none" stroke="rgba(231,225,214,0.08)" strokeWidth="1" />
            ))}

            {radialGuides.map((guide) => (
              <line key={guide.key} x1={cx} y1={cy} x2={guide.x} y2={guide.y} stroke="rgba(231,225,214,0.08)" strokeWidth="1" />
            ))}

            {vectorSegments.map((segment, index) => (
              <line
                key={`vector-${index}-${segment.opacity.toFixed(3)}`}
                x1={segment.x1}
                y1={segment.y1}
                x2={segment.x2}
                y2={segment.y2}
                stroke={`rgba(231,225,214,${segment.opacity})`}
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            ))}

            <circle cx={cx} cy={cy} r="2.5" fill="rgba(231,225,214,0.55)" />
            <path d={pathData} fill="rgba(231,225,214,0.035)" stroke="#e7e1d6" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          </svg>

          <span className="overlay-label">Aperçu 2D</span>
          <span className="overlay-values">
            ({formatNumber(m)}, {formatNumber(n1)}, {formatNumber(n2)}, {formatNumber(n3)})
          </span>
          {showVectorField ? <span className="overlay-state">Champ vectoriel · {Math.round(fieldAngle)}°</span> : null}
        </article>

        <article className="copy-card">
          <p className="eyebrow">Géométrie générative</p>
          <h1>Visualiseur de superformule</h1>
          <div className="description">
            <p>
              La superformule est une équation paramétrique capable de générer, à partir d’un petit nombre de
              variables, une très grande diversité de contours : cercles, polygones adoucis, étoiles, pétales, formes
              organiques ou silhouettes plus tendues. En jouant sur la fréquence, la courbure et les facteurs
              sinus/cosinus, on fait apparaître des familles de formes qui évoluent de manière continue d’un motif à
              l’autre.
            </p>
            <p>
              J’ai conçu ce viewer pour explorer librement ces variations et repérer plus facilement les motifs de
              superformule qui me semblent les plus intéressants. Mon objectif est ensuite d’utiliser ces formes pour
              influencer des champs vectoriels, tester des comportements graphiques, et développer de nouveaux systèmes
              génératifs. Plus d’informations sur la superformule :{' '}
              <a href="https://en.wikipedia.org/wiki/Superformula" target="_blank" rel="noreferrer">
                Wikipédia
              </a>
              .
            </p>
          </div>
          <div className="stats-grid">
            <div>
              <span>Fréquence</span>
              <strong>{formatNumber(m)}</strong>
            </div>
            <div>
              <span>Courbure</span>
              <strong>{formatNumber(n1)}</strong>
            </div>
            <div>
              <span>Facteur sinus</span>
              <strong>{formatNumber(n2)}</strong>
            </div>
            <div>
              <span>Facteur cosinus</span>
              <strong>{formatNumber(n3)}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="controls-card">
        <div className="main-controls">
          <Slider label="Fréquence" value={m} min={0} max={20} step={0.1} onChange={setM} />
          <Slider label="Courbure" value={n1} min={0} max={80} step={0.1} onChange={setN1} />
          <Slider label="Facteur sinus" value={n2} min={0} max={80} step={0.1} onChange={setN2} />
          <Slider label="Facteur cosinus" value={n3} min={0} max={80} step={0.1} onChange={setN3} />
        </div>

        <aside className="utility-panel">
          <p>Surcouche utilitaire</p>
          <label className="checkbox-row" htmlFor="vectorField">
            <span>
              Champ vectoriel
              <small>Afficher l’influence locale du flux</small>
            </span>
            <input
              id="vectorField"
              type="checkbox"
              checked={showVectorField}
              onChange={(event) => setShowVectorField(event.target.checked)}
            />
          </label>
          <Slider label="Angle initial" value={fieldAngle} min={0} max={90} step={1} onChange={setFieldAngle} subdued />
          <div className="utility-scale">
            <span>Tangent</span>
            <span>Perpendiculaire</span>
          </div>
        </aside>
      </section>
    </main>
  );
}
