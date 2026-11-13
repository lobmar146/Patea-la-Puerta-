import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({ open, title, onClose, children, testId, tall = false }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
  /** Alto fijo en móvil: el panel no salta cuando cambia el contenido (buscadores, listados). */
  tall?: boolean;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      data-testid={testId ?? 'modal-backdrop'}
    >
      <div ref={dialog} className={`modal-panel${tall ? ' modal-tall' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}>
        <div className="modal-handle" aria-hidden="true" />
        <header className="modal-header">
          <h2 id="modal-title" className="text-xl font-black sm:text-2xl">{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar ventana"><X aria-hidden className="size-5 shrink-0" /></button>
        </header>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
}
