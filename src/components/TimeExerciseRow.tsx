import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Save } from 'lucide-react';
import { cn } from './FloatingRestTimer';
import { pb } from '../lib/pocketbase';

interface TimeExerciseRowProps {
  ejercicioId: string;
  numeroSerie: number;
}

export default function TimeExerciseRow({ ejercicioId, numeroSerie }: TimeExerciseRowProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let interval: number;
    if (isRunning) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now() - (timeElapsed * 1000);
      }
      interval = window.setInterval(() => {
        if (startTimeRef.current) {
          const newTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setTimeElapsed(newTime);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeElapsed]);

  const toggleTimer = () => {
    if (isRunning) {
      setIsRunning(false);
      startTimeRef.current = null;
    } else {
      setIsRunning(true);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeElapsed(0);
    startTimeRef.current = null;
  };

  const saveTime = async () => {
    if (timeElapsed === 0) return;
    setIsRunning(false);
    setSaving(true);
    try {
      // Calculate calories
      let calorias_quemadas = 0;
      try {
        const userRecords = await pb.collection('usuarios').getFullList();
        const user = userRecords[0];
        const ejDiario = await pb.collection('ejercicios_diarios').getOne(ejercicioId);
        
        if (user && ejDiario && ejDiario.met_value > 0) {
          const pesoUsuario = user.peso_actual || 70;
          const tiempoActivoHoras = timeElapsed / 3600; 
          calorias_quemadas = parseFloat((ejDiario.met_value * pesoUsuario * tiempoActivoHoras).toFixed(2));
        }
      } catch (calErr) {
        console.error("Error calculating calories", calErr);
      }

      await pb.collection('historial_series').create({
        ejercicio_diario: ejercicioId,
        numero_serie: numeroSerie,
        tiempo_logrado: timeElapsed,
        completado: true,
        calorias_quemadas
      });
      setCompleted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (completed) {
    return (
      <div className="flex items-center justify-between p-4 mb-2 rounded-2xl border bg-success/5 border-success/30">
        <p className="font-bold text-success">¡Completado!</p>
        <p className="text-xl tabular-nums font-bold">{formatTime(timeElapsed)}</p>
      </div>
    );
  }

  return (
    <div className="p-4 mb-2 rounded-2xl border bg-surface border-border/50">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-muted uppercase tracking-wider font-semibold">Cronómetro</p>
        <p className={cn(
          "text-4xl font-bold tabular-nums tracking-tighter transition-colors",
          isRunning ? "text-primary" : "text-text-main"
        )}>
          {formatTime(timeElapsed)}
        </p>
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={toggleTimer}
          className={cn(
            "flex-1 glass-button py-4 text-lg",
            isRunning ? "bg-primary/20 text-primary border-primary/30" : "text-text-main"
          )}
        >
          {isRunning ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button onClick={resetTimer} className="glass-button px-6 text-text-muted hover:text-text-main">
          <RotateCcw size={24} />
        </button>
        <button 
          onClick={saveTime}
          disabled={timeElapsed === 0 || saving}
          className="glass-button px-6 bg-success/10 text-success hover:bg-success/20 border-success/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <div className="w-6 h-6 rounded-full border-2 border-success border-t-transparent animate-spin" /> : <Save size={24} />}
        </button>
      </div>
    </div>
  );
}
