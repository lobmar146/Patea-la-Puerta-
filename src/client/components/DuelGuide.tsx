import { BookOpen, Hand, Handshake, ShieldCheck, Store, Trash2, Zap, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { DUEL_GUIDE, type GuideSection } from '../../shared/modes';
import { Modal } from './Modal';

const ICONS: Record<GuideSection['icon'], LucideIcon> = {
  fast: Zap,
  greed: Trash2,
  treaty: ShieldCheck,
  deal: Handshake,
  merchant: Store,
  fist: Hand,
};

/** Contenido de la guía del modo 2 jugadores. */
export function DuelGuideContent() {
  return (
    <div className="space-y-4" data-testid="duel-guide">
      <p className="text-sm text-ui-muted">{DUEL_GUIDE.intro}</p>
      <section className="rounded-2xl bg-accent-brand/10 p-3">
        <h3 className="font-extrabold">Antes de empezar</h3>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
          {DUEL_GUIDE.setup.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </section>
      {DUEL_GUIDE.sections.map((sec) => {
        const Icon = ICONS[sec.icon];
        return (
          <section key={sec.title}>
            <h3 className="flex items-center gap-2 font-extrabold">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface-muted"><Icon aria-hidden className="size-4 shrink-0" /></span>
              {sec.title}
            </h3>
            <ul className="mt-1 list-disc space-y-1 pl-10 text-sm">
              {sec.items.map((it) => <li key={it}>{it}</li>)}
            </ul>
          </section>
        );
      })}
      <p className="text-xs text-ui-muted">Variante creada por un jugador y compartida en r/Munchkin. No es una regla oficial: si algo no cierra, decide la mesa.</p>
    </div>
  );
}

/** Botón que abre la guía en un modal. */
export function DuelGuideButton({ className = 'btn-secondary btn-small', label = 'Ver guía de 2 jugadores' }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} data-testid="duel-guide-open">
        <BookOpen aria-hidden className="size-4 shrink-0" /> {label}
      </button>
      <Modal open={open} title="Guía: modo 2 jugadores" onClose={() => setOpen(false)} tall testId="duel-guide-modal">
        <DuelGuideContent />
        <button type="button" className="btn-primary mt-4 w-full" onClick={() => setOpen(false)}>Entendido</button>
      </Modal>
    </>
  );
}
