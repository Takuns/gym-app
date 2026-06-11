import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import SetRow from './SetRow';
import TimeExerciseRow from './TimeExerciseRow';
import ExerciseDetailsModal from './ExerciseDetailsModal';
import { cn } from './FloatingRestTimer';

interface ExerciseCardProps {
  ejercicio: {
    id: string;
    nombre: string;
    series_objetivo: number;
    repeticiones_objetivo: string;
    peso_objetivo?: number; 
    es_tiempo: boolean;
    tiempo_reposo?: number;
    imagen_url?: string;
  };
  onSetCompleted: (time?: number) => void;
}

export default function ExerciseCard({ ejercicio, onSetCompleted }: ExerciseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="glass-panel overflow-hidden mb-6">
        <div className="p-5 flex items-center justify-between">
          {/* Título clickeable para abrir el modal */}
          <div 
            className="flex-1 cursor-pointer group active:opacity-70 transition-opacity flex items-center gap-4" 
            onClick={() => setShowModal(true)}
          >
            {ejercicio.imagen_url && (
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-border/50 bg-surface/50 hidden sm:block">
                <img src={ejercicio.imagen_url} alt={ejercicio.nombre} className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-text-main mb-1 group-hover:text-primary transition-colors flex items-center gap-2">
                {ejercicio.nombre}
                <Info size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-sm text-text-muted flex items-center gap-2">
                {!ejercicio.es_tiempo && (
                  <span>{ejercicio.series_objetivo} series • {ejercicio.repeticiones_objetivo} reps</span>
                )}
                {ejercicio.es_tiempo && (
                  <span>Ejercicio por tiempo</span>
                )}
              </p>
            </div>
          </div>
          
          {/* Botón de expandir */}
          <div 
            className="p-3 -mr-2 bg-transparent hover:bg-surface rounded-full text-text-muted cursor-pointer transition-colors active:bg-surface-active"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </div>
        </div>

        <div className={cn(
          "transition-all duration-300 ease-in-out",
          expanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="p-5 pt-0 border-t border-border/50 bg-black/20">
            <div className="mt-4">
              {Array.from({ length: Math.max(Number(ejercicio.series_objetivo) || 1, 1) }).map((_, i) => (
                ejercicio.es_tiempo ? (
                  <TimeExerciseRow 
                    key={i}
                    ejercicioId={ejercicio.id} 
                    numeroSerie={i + 1}
                  />
                ) : (
                  <SetRow 
                    key={i}
                    ejercicioId={ejercicio.id}
                    numeroSerie={i + 1}
                    pesoObjetivo={ejercicio.peso_objetivo || 0} 
                    repsObjetivo={ejercicio.repeticiones_objetivo || "10"}
                    tiempoReposo={ejercicio.tiempo_reposo}
                    onComplete={onSetCompleted}
                  />
                )
              ))}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <ExerciseDetailsModal 
          ejercicio={ejercicio} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  );
}
