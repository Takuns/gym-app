import { useState, useEffect } from 'react';
import { cn } from './FloatingRestTimer';
import { pb } from '../lib/pocketbase';

interface SetRowProps {
  ejercicioId: string;
  numeroSerie: number;
  pesoObjetivo: number;
  repsObjetivo: string;
  tiempoReposo?: number;
  onComplete: (time?: number) => void;
}

export default function SetRow({ ejercicioId, numeroSerie, pesoObjetivo, repsObjetivo, tiempoReposo, onComplete }: SetRowProps) {
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  // Intentar extraer un valor numérico por defecto para las repeticiones (ej. "8-12" -> 10, o "10" -> 10)
  const defaultReps = parseInt(repsObjetivo) || 10;
  
  const [pesoReal, setPesoReal] = useState<string>(pesoObjetivo.toString());
  const [repsReal, setRepsReal] = useState<string>(defaultReps.toString());

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const records = await pb.collection('historial_series').getFullList({
          filter: `ejercicio_diario = "${ejercicioId}" && numero_serie = ${numeroSerie}`,
          sort: '-created',
        });
        if (records.length > 0) {
          setCompleted(true);
          setRecordId(records[0].id);
          setPesoReal(records[0].peso_real.toString());
          setRepsReal(records[0].repeticiones_reales.toString());
        }
      } catch (err) {
        console.error('Error fetching set record', err);
      }
    };
    fetchRecord();
  }, [ejercicioId, numeroSerie]);

  const handleCheck = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    
    if (isChecked) {
      setSaving(true);
      setCompleted(true);
      try {
        // Calculate calories
        let calorias_quemadas = 0;
        try {
          const userRecords = await pb.collection('usuarios').getFullList();
          const user = userRecords[0];
          const ejDiario = await pb.collection('ejercicios_diarios').getOne(ejercicioId);
          
          if (user && ejDiario && ejDiario.met_value > 0) {
            const pesoUsuario = user.peso_actual || 70;
            const reps = parseInt(repsReal) || 10;
            const tiempoActivoHoras = (reps * 3) / 3600; 
            calorias_quemadas = parseFloat((ejDiario.met_value * pesoUsuario * tiempoActivoHoras).toFixed(2));
          }
        } catch (calErr) {
          console.error("Error calculating calories", calErr);
        }

        const record = await pb.collection('historial_series').create({
          ejercicio_diario: ejercicioId,
          numero_serie: numeroSerie,
          peso_real: parseFloat(pesoReal) || 0,
          repeticiones_reales: parseInt(repsReal) || 10,
          completado: true,
          calorias_quemadas
        });
        setRecordId(record.id);
        onComplete(tiempoReposo);
      } catch (err) {
        console.error('Error saving set', err);
        // revertir UI en caso de fallo
        setCompleted(false);
      } finally {
        setSaving(false);
      }
    } else {
      // El usuario desmarcó la serie
      if (recordId) {
        setSaving(true);
        try {
          await pb.collection('historial_series').delete(recordId);
          setRecordId(null);
          setCompleted(false);
        } catch (err) {
          console.error('Error deleting set record', err);
          // Si falla, mantenemos completado
        } finally {
          setSaving(false);
        }
      } else {
        setCompleted(false);
      }
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-4 mb-2 rounded-2xl border transition-all duration-300",
      completed ? "bg-success/5 border-success/30" : "bg-surface border-border/50"
    )}>
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-hover text-sm font-bold text-text-muted shrink-0">
          {numeroSerie}
        </div>
        
        {/* Controles de edición de peso y repeticiones */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <input 
              type="number"
              step="0.5"
              value={pesoReal}
              onChange={(e) => setPesoReal(e.target.value)}
              disabled={completed || saving}
              className="w-16 bg-surface-hover border border-border/50 rounded-xl py-1.5 text-center font-bold text-text-main focus:outline-none focus:border-primary disabled:opacity-60 text-sm"
              placeholder="0"
            />
            <span className="text-xs font-bold text-text-muted">kg</span>
          </div>

          <div className="flex items-center gap-1.5">
            <input 
              type="number"
              value={repsReal}
              onChange={(e) => setRepsReal(e.target.value)}
              disabled={completed || saving}
              className="w-14 bg-surface-hover border border-border/50 rounded-xl py-1.5 text-center font-bold text-text-main focus:outline-none focus:border-primary disabled:opacity-60 text-sm"
              placeholder="10"
            />
            <span className="text-xs font-bold text-text-muted">reps</span>
          </div>

          {!completed && (
            <span className="text-[10px] text-text-muted font-semibold bg-surface-hover px-2 py-1 rounded-md">
              Objetivo: {repsObjetivo}
            </span>
          )}
        </div>
      </div>

      <div className="relative flex items-center justify-center shrink-0">
        {saving && (
          <div className="absolute inset-0 rounded-xl border-2 border-primary border-t-transparent animate-spin opacity-50" />
        )}
        <input 
          type="checkbox" 
          checked={completed}
          onChange={handleCheck}
          disabled={saving}
          className="glass-checkbox w-12 h-12"
        />
      </div>
    </div>
  );
}
