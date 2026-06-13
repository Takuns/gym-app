import { useState, useEffect } from 'react';
import { X, Dumbbell, Play } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { format } from 'date-fns';

interface AddWorkoutModalProps {
  user: any;
  date: Date;
  onClose: () => void;
  onWorkoutAdded: () => void;
}

export default function AddWorkoutModal({ user, date, onClose, onWorkoutAdded }: AddWorkoutModalProps) {
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlantillas = async () => {
      try {
        const records = await pb.collection('plantillas_rutinas').getFullList({
          sort: '-created',
        });
        setPlantillas(records);
      } catch (err) {
        console.error("Error fetching plantillas", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlantillas();
  }, []);

  const handleGenerateWorkout = async (plantilla: any) => {
    if (!user) return;
    setGeneratingId(plantilla.id);
    try {
      // 1. Fetch template exercises
      const ejerciciosPlantilla = await pb.collection('ejercicios_plantilla').getFullList({
        filter: `plantilla = "${plantilla.id}"`,
        sort: 'orden,created'
      });

      // 2. Create the daily workout
      const workout = await pb.collection('entrenamientos_diarios').create({
        usuario: user.id,
        fecha: format(date, 'yyyy-MM-dd') + ' 12:00:00.000Z',
        nombre: plantilla.nombre
      });

      // 3. Create daily exercises
      for (const ej of ejerciciosPlantilla) {
        await pb.collection('ejercicios_diarios').create({
          entrenamiento: workout.id,
          nombre: ej.nombre,
          series_objetivo: ej.series_objetivo,
          repeticiones_objetivo: ej.repeticiones_objetivo,
          es_tiempo: ej.es_tiempo,
          descripcion: ej.descripcion || '',
          tiempo_reposo: ej.tiempo_reposo,
          plantilla_origen_ejercicio: ej.id,
          orden: ej.orden
        });
      }
      
      onWorkoutAdded();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error al generar el entrenamiento.");
      setGeneratingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-sm rounded-3xl border border-border/50 overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Dumbbell className="text-primary" size={20} />
            Añadir Entrenamiento
          </h2>
          <button onClick={onClose} className="p-2 bg-surface-hover rounded-full text-text-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-sm text-text-muted">
            Selecciona una de tus plantillas para añadirla a tu entrenamiento de hoy.
          </p>
          
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 rounded-full border-2 border-surface-hover border-t-primary animate-spin" />
            </div>
          ) : plantillas.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">
              No tienes plantillas creadas. Ve a la pestaña "Agenda" para crear una.
            </div>
          ) : (
            <div className="space-y-3">
              {plantillas.map(p => (
                <div key={p.id} className="bg-surface-hover border border-border/50 p-4 rounded-2xl flex flex-col gap-3">
                  <h3 className="font-bold text-white">{p.nombre}</h3>
                  <button
                    onClick={() => handleGenerateWorkout(p)}
                    disabled={generatingId !== null}
                    className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {generatingId === p.id ? (
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : (
                      <><Play size={16} /> Seleccionar</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
