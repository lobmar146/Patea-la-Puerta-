import { Download, Share } from 'lucide-react';
import { useEffect, useState } from 'react';
import { isIos, isStandalone } from '../pwa';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Botón "Instalar app" (Android/escritorio) o instrucciones para iPhone. No aparece si ya está instalada. */
export function InstallApp() {
  const [evt, setEvt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  if (installed) return null;
  if (evt) {
    return (
      <button
        type="button"
        className="btn-gold w-full"
        data-testid="install-app"
        onClick={async () => {
          await evt.prompt();
          const { outcome } = await evt.userChoice;
          if (outcome === 'accepted') setInstalled(true);
          setEvt(null);
        }}
      >
        <Download aria-hidden className="size-5" /> Instalar la app
      </button>
    );
  }
  if (isIos()) {
    return (
      <p className="rounded-2xl bg-white/[.06] px-4 py-3 text-sm text-parchment-100/85">
        Para instalarla en iPhone: tocá <Share aria-label="Compartir" className="inline size-4 align-text-bottom" /> en Safari y elegí <b>“Agregar a inicio”</b>.
      </p>
    );
  }
  return null;
}
