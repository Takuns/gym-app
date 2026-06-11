import { useEffect, useState } from 'react';
import { Timer, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FloatingRestTimerProps {
  isActive: boolean;
  initialTime?: number;
  onClose: () => void;
}

export default function FloatingRestTimer({ isActive, initialTime = 90, onClose }: FloatingRestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    if (isActive) {
      setTimeLeft(initialTime);
    }
  }, [isActive, initialTime]);

  useEffect(() => {
    let interval: number | undefined;

    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      // Timer finished!
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      // Optional: Audio
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play();
      } catch(e) {}
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  if (!isActive) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isFinished = timeLeft === 0;

  return (
    <div className={cn(
      "fixed bottom-28 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300",
      "glass-panel px-6 py-4 flex items-center gap-4 min-w-[280px]",
      isFinished && "bg-success/20 border-success/50"
    )}>
      <div className={cn("p-3 rounded-full bg-surface", isFinished && "text-success bg-success/20 animate-pulse")}>
        <Timer size={24} />
      </div>
      
      <div className="flex-1">
        <p className="text-sm text-text-muted font-medium mb-1">
          {isFinished ? "¡Tiempo terminado!" : "Descanso sugerido"}
        </p>
        <p className={cn("text-3xl font-bold tabular-nums tracking-tight", isFinished && "text-success")}>
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </p>
      </div>

      <button 
        onClick={onClose}
        className="p-2 hover:bg-surface-hover rounded-xl transition-colors text-text-muted hover:text-text-main"
      >
        <X size={24} />
      </button>
    </div>
  );
}
