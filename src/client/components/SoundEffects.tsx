import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Snapshot } from '../../shared/types';
import { onSoundChange, play, setSoundEnabled, soundEnabled } from '../sound';
import { soundFor } from '../soundRules';

/** Botón para prender o apagar los sonidos en este dispositivo. */
export function SoundToggle({ className = 'theme-toggle' }: { className?: string }) {
  const [on, setOn] = useState(soundEnabled);
  useEffect(() => onSoundChange(setOn), []);
  return (
    <button type="button" className={className} aria-pressed={on} aria-label={on ? 'Silenciar sonidos' : 'Activar sonidos'} title={on ? 'Silenciar sonidos' : 'Activar sonidos'} onClick={() => setSoundEnabled(!on)} data-testid="sound-toggle">
      {on ? <Volume2 aria-hidden className="size-5 shrink-0" /> : <VolumeX aria-hidden className="size-5 shrink-0" />}
    </button>
  );
}

/** Escucha los cambios de la partida y hace sonar el efecto que corresponde. No dibuja nada. */
export function SoundEffects({ snap, myId }: { snap: Snapshot | null; myId: string | null }) {
  const prev = useRef<Snapshot | null>(null);
  useEffect(() => {
    if (!snap) return;
    const before = prev.current;
    prev.current = snap;
    if (!before || before.version >= snap.version) return;
    const sound = soundFor(before, snap, myId);
    if (sound) play(sound);
  }, [snap, myId]);
  return null;
}
