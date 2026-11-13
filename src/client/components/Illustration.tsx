import { useEffect, useState } from 'react';
import type { IllustrationKey } from '../../shared/phases';
import { ASSETS, type SourceRef } from '../assets/manifest';

let availablePromise: Promise<Set<string>> | null = null;
function loadAvailable(): Promise<Set<string>> {
  availablePromise ??= fetch('/cards/available.json')
    .then((r) => (r.ok ? r.json() : { files: [] }))
    .then((j: { files?: string[] }) => new Set(j.files ?? []))
    .catch(() => new Set<string>());
  return availablePromise;
}

function useAvailable(): Set<string> | null {
  const [av, setAv] = useState<Set<string> | null>(null);
  useEffect(() => {
    let alive = true;
    void loadAvailable().then((s) => alive && setAv(s));
    return () => {
      alive = false;
    };
  }, []);
  return av;
}

function usable(src: SourceRef | undefined, av: Set<string> | null): src is SourceRef {
  return Boolean(src && av?.has(src.file) && (!src.sheet || src.crop));
}

function SourceImage({ src, label, onError }: { src: SourceRef; label: string; onError: () => void }) {
  if (src.crop) {
    const { x, y, w, h } = src.crop;
    return (
      <div
        role="img"
        aria-label={label}
        className="h-full w-full rounded-lg"
        style={{
          backgroundImage: `url(/cards/${src.file})`,
          backgroundSize: `${(100 / w) * 100}% ${(100 / h) * 100}%`,
          backgroundPosition: `${w >= 100 ? 0 : (x / (100 - w)) * 100}% ${h >= 100 ? 0 : (y / (100 - h)) * 100}%`,
        }}
      />
    );
  }
  return <img src={`/cards/${src.file}`} alt={label} onError={onError} className="h-full w-full rounded-lg object-contain" />;
}

const Arrow = () => (
  <svg viewBox="0 0 80 50" aria-hidden className="absolute bottom-[12%] right-[2%] w-[45%] drop-shadow">
    <path d="M4 17 H46 V4 L76 25 L46 46 V33 H4 Z" fill="#2f6b3a" stroke="#2b1d12" strokeWidth="4" strokeLinejoin="round" />
  </svg>
);

/** Ilustración de una fase o acción. Si no hay imagen local válida, usa la provisoria original. */
export function Illustration({ name, className = '' }: { name: IllustrationKey; className?: string }) {
  const av = useAvailable();
  const [broken, setBroken] = useState(false);
  const entry = ASSETS[name];
  const fallback = <img src={entry.fallback} alt={`${entry.label} (ilustración provisoria)`} className="h-full w-full object-contain" />;

  let content = fallback;
  if (!broken && entry.compose) {
    const parts = entry.compose.keys.map((k) => ASSETS[k].source).filter((s) => usable(s, av)) as SourceRef[];
    if (parts.length) {
      content = (
        <div className="relative h-full w-full" role="img" aria-label={entry.label}>
          {parts.map((s, i) => (
            <div
              key={s.file}
              className="absolute h-[78%] w-[62%]"
              style={{ left: `${4 + i * 18}%`, top: `${4 + i * 8}%`, transform: `rotate(${i ? 6 : -6}deg)` }}
            >
              <SourceImage src={s} label="" onError={() => setBroken(true)} />
            </div>
          ))}
          {entry.compose.arrow && <Arrow />}
        </div>
      );
    }
  } else if (!broken && usable(entry.source, av)) {
    content = <SourceImage src={entry.source} label={entry.label} onError={() => setBroken(true)} />;
  }

  return (
    <figure className={`aspect-[5/7] select-none ${className}`} title={entry.label}>
      {content}
    </figure>
  );
}
