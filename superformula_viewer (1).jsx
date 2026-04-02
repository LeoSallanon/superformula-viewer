import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";

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

function Slider({
  label,
  value,
  min,
  max,
  step = 0.1,
  onChange,
  subdued = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  subdued?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div
        className={`mb-1.5 flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.2em] ${
          subdued ? "text-stone-500" : "text-stone-400"
        }`}
      >
        <span className="truncate">{label}</span>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number.isInteger(value) ? value : Number(value.toFixed(1))}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isNaN(next)) return;
            onChange(clamp(next, min, max));
          }}
          className={`w-14 rounded-md border px-2 py-1 text-right font-mono text-[10px] outline-none transition ${
            subdued
              ? "border-white/5 bg-white/[0.02] text-stone-300 focus:border-white/10"
              : "border-white/8 bg-white/[0.03] text-stone-100 focus:border-white/15"
          }`}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="super-slider h-5 w-full cursor-pointer appearance-none bg-transparent"
      />
      <div className="mt-0.5 flex justify-between text-[8px] tracking-[0.14em] text-stone-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function SuperformulaViewer() {
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

  const getBoundaryPoint = (phi: number) => {
    const r = superRadius(m, n1, n2, n3, phi);
    return {
      x: cx + scale * r * Math.cos(phi),
      y: cy + scale * r * Math.sin(phi),
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
    for (let i = 0; i <= samples; i++) {
      const phi = (Math.PI * 2 * i) / samples - Math.PI;
      const r = superRadius(m, n1, n2, n3, phi);
      const x = cx + scale * r * Math.cos(phi);
      const y = cy + scale * r * Math.sin(phi);
      points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return `${points.join(" ")} Z`;
  }, [m, n1, n2, n3]);

  const radialGuides = useMemo(() => {
    const guides = [];
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      const x = cx + Math.cos(a) * 245;
      const y = cy + Math.sin(a) * 245;
      guides.push(
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke="rgba(231,225,214,0.08)"
          strokeWidth="1"
        />,
      );
    }
    return guides;
  }, []);

  const vectorSegments = useMemo(() => {
    if (!showVectorField)
      return [] as Array<{ x1: number; y1: number; x2: number; y2: number; opacity: number }>;

    const segments: Array<{ x1: number; y1: number; x2: number; y2: number; opacity: number }> = [];
    const spacing = 28;
    const influenceRadius = 265;
    const angleRad = (fieldAngle * Math.PI) / 180;

    for (let y = cy - influenceRadius; y <= cy + influenceRadius; y += spacing) {
      for (let x = cx - influenceRadius; x <= cx + influenceRadius; x += spacing) {
        const dx = x - cx;
        const dy = y - cy;
        const pointRadius = Math.hypot(dx, dy);
        if (pointRadius > influenceRadius) continue;

        const phi = Math.atan2(dy, dx);
        const boundaryRadius = scale * superRadius(m, n1, n2, n3, phi);
        const distanceToBoundary = boundaryRadius - pointRadius;
        const falloff = Math.exp(-Math.pow(Math.abs(distanceToBoundary) / 44, 2));
        const insideBoost = pointRadius <= boundaryRadius ? 1 : 0.35;
        const strength = falloff * (0.45 + insideBoost * 0.55);
        if (strength < 0.12) continue;

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
          opacity: 0.06 + 0.34 * strength,
        });
      }
    }

    return segments;
  }, [showVectorField, fieldAngle, m, n1, n2, n3]);

  const ringGuides = [90, 140, 190, 240];

  return (
    <div className="h-screen overflow-hidden bg-black text-stone-100 selection:bg-stone-200/20">
      <style>{`
        .super-slider::-webkit-slider-runnable-track {
          height: 1px;
          background: rgba(231,225,214,0.24);
        }
        .super-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          background: #e7e1d6;
          border: 1px solid rgba(0,0,0,0.8);
          margin-top: -5px;
          box-shadow: 0 0 0 3px rgba(231,225,214,0.06);
        }
        .super-slider::-moz-range-track {
          height: 1px;
          background: rgba(231,225,214,0.24);
        }
        .super-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          background: #e7e1d6;
          border: 1px solid rgba(0,0,0,0.8);
          box-shadow: 0 0 0 3px rgba(231,225,214,0.06);
        }
      `}</style>

      <div className="mx-auto grid h-screen max-w-[1600px] grid-rows-[minmax(0,1fr)_auto] gap-3 px-4 py-4 lg:px-6 lg:py-5">
        <div className="grid min-h-0 grid-cols-[1.12fr_0.88fr] gap-4 lg:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-[30px] border border-white/5 bg-gradient-to-b from-white/[0.02] to-white/[0.01]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_52%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:38px_38px]" />

            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-full max-h-full w-full max-w-full p-6"
              role="img"
              aria-label="Aperçu 2D de la superformule"
            >
              {ringGuides.map((r) => (
                <circle
                  key={r}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke="rgba(231,225,214,0.08)"
                  strokeWidth="1"
                />
              ))}
              {radialGuides}
              {vectorSegments.map((segment, index) => (
                <line
                  key={index}
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
              <motion.path
                key={`${m}-${n1}-${n2}-${n3}-${showVectorField}-${fieldAngle}`}
                d={pathData}
                fill="rgba(231,225,214,0.035)"
                stroke="#e7e1d6"
                strokeWidth="2.2"
                strokeLinejoin="round"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0.45 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              />
            </svg>

            <div className="absolute left-6 top-5 text-[10px] uppercase tracking-[0.32em] text-stone-400">
              2D Shape Preview
            </div>
            <div className="absolute bottom-5 left-6 font-mono text-[11px] tracking-[0.18em] text-stone-500">
              ({formatNumber(m)}, {formatNumber(n1)}, {formatNumber(n2)}, {formatNumber(n3)})
            </div>
            {showVectorField && (
              <div className="absolute bottom-5 right-6 text-[9px] uppercase tracking-[0.22em] text-stone-500">
                Vector field · {Math.round(fieldAngle)}°
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="flex min-h-0 flex-col overflow-hidden px-1"
          >
            <div className="mb-2 text-[10px] uppercase tracking-[0.34em] text-stone-500">
              Géométrie générative
            </div>
            <h1
              className="max-w-[8ch] text-[clamp(2.7rem,5.4vw,5.8rem)] uppercase leading-[0.84] text-stone-100"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Superformula Viewer
            </h1>

            <p className="mt-5 max-w-[34ch] text-[15px] leading-[1.68] text-stone-300 lg:text-[16px]">
              La superformule est une équation polaire capable de produire, avec seulement quelques
              paramètres, une immense famille de contours : cercle, polygone adouci, étoile,
              pétale, forme organique ou silhouette presque cristalline. Ici, la fréquence règle le
              nombre de répétitions radiales, tandis que les trois facteurs de courbure sculptent la
              tension des creux, la douceur des arrondis et l’acuité des pointes.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                <div className="text-[9px] uppercase tracking-[0.24em] text-stone-500">Frequency</div>
                <div className="mt-1.5 font-mono text-[1.75rem] leading-none text-stone-100">{formatNumber(m)}</div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                <div className="text-[9px] uppercase tracking-[0.24em] text-stone-500">Curvature</div>
                <div className="mt-1.5 font-mono text-[1.75rem] leading-none text-stone-100">{formatNumber(n1)}</div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                <div className="text-[9px] uppercase tracking-[0.24em] text-stone-500">Sin factor</div>
                <div className="mt-1.5 font-mono text-[1.75rem] leading-none text-stone-100">{formatNumber(n2)}</div>
              </div>
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                <div className="text-[9px] uppercase tracking-[0.24em] text-stone-500">Cos factor</div>
                <div className="mt-1.5 font-mono text-[1.75rem] leading-none text-stone-100">{formatNumber(n3)}</div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.14 }}
          className="rounded-[24px] border border-white/5 bg-white/[0.02] px-4 py-3 backdrop-blur-sm lg:px-5"
        >
          <div className="flex items-start gap-4">
            <div className="grid min-w-0 flex-1 grid-cols-4 gap-3">
              <Slider label="Frequency" value={m} min={0} max={20} step={0.1} onChange={setM} />
              <Slider label="Curvature" value={n1} min={0} max={80} step={0.1} onChange={setN1} />
              <Slider label="Sin factor" value={n2} min={0} max={80} step={0.1} onChange={setN2} />
              <Slider label="Cos factor" value={n3} min={0} max={80} step={0.1} onChange={setN3} />
            </div>

            <div className="w-[270px] shrink-0 rounded-[18px] border border-white/5 bg-white/[0.015] p-3">
              <div className="mb-2.5 text-[8px] uppercase tracking-[0.22em] text-stone-600">
                Utility overlay
              </div>

              <label className="mb-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-stone-400">Vector field</div>
                  <div className="mt-0.5 text-[11px] text-stone-500">Afficher l’influence</div>
                </div>
                <input
                  type="checkbox"
                  checked={showVectorField}
                  onChange={(e) => setShowVectorField(e.target.checked)}
                  className="h-3.5 w-3.5 accent-stone-200"
                />
              </label>

              <Slider
                label="Start angle"
                value={fieldAngle}
                min={0}
                max={90}
                step={1}
                onChange={setFieldAngle}
                subdued
              />

              <div className="mt-1 flex justify-between text-[8px] uppercase tracking-[0.14em] text-stone-600">
                <span>Tangent</span>
                <span>Perpendicular</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
