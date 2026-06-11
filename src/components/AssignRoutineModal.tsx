import { useState } from 'react';
import { X, CalendarPlus } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AssignRoutineModalProps {
  user: any;
  date: Date;
  plantillas: any[];
  onClose: () => void;
  onAssigned: () => void;
}

export default function AssignRoutineModal({ user, date, plantillas, onClose, onAssigned }: AssignRoutineModalProps) {
  const [selectedPlantilla, setSelectedPlantilla] = useState(plantillas.length > 0 ? plantillas[0].id : '');
  const [saving, setSaving] = useState(false);

  const handleAssign = async () => {
    if (!selectedPlantilla) return;
    setSaving(true);
    try {
      const templateRecord = plantillas.find(p => p.id === selectedPlantilla);
      if (!templateRecord) return;

      const dateString = format(date, 'yyyy-MM-dd') + ' 12:00:00.000Z';
      const startOfDay = format(date, 'yyyy-MM-dd') + ' 00:00:00.000Z';
      const endOfDay = format(date, 'yyyy-MM-dd') + ' 23:59:59.999Z';
      
      const records = await pb.collection('entrenamientos_diarios').getFullList({
        filter: `usuario = "${user.id}" && fecha >= "${startOfDay}" && fecha <= "${endOfDay}"`,
      });

      let entrenamientoId;

      if (records.length > 0) {
        entrenamientoId = records[0].id;
        // Actualizamos
        await pb.collection('entrenamientos_diarios').update(entrenamientoId, {
          plantilla_origen: selectedPlantilla,
          nombre: templateRecord.nombre
        });

        // Borramos los ejercicios_diarios anteriores
        const oldExercises = await pb.collection('ejercicios_diarios').getFullList({
          filter: `entrenamiento = "${entrenamientoId}"`
        });
        for (const ex of oldExercises) {
          await pb.collection('ejercicios_diarios').delete(ex.id);
        }
      } else {
        // Creamos nuevo
        const newDaily = await pb.collection('entrenamientos_diarios').create({
          usuario: user.id,
          fecha: dateString,
          nombre: templateRecord.nombre,
          plantilla_origen: selectedPlantilla
        });
        entrenamientoId = newDaily.id;
      }

      // Copiamos los ejercicios de la plantilla a ejercicios_diarios
      const ejerciciosPlantilla = await pb.collection('ejercicios_plantilla').getFullList({
        filter: `plantilla = "${selectedPlantilla}"`
      });

      for (const ep of ejerciciosPlantilla) {
        await pb.collection('ejercicios_diarios').create({
          entrenamiento: entrenamientoId,
          nombre: ep.nombre,
          series_objetivo: ep.series_objetivo,
          repeticiones_objetivo: ep.repeticiones_objetivo,
          es_tiempo: ep.es_tiempo,
          descripcion: ep.descripcion,
          tiempo_reposo: ep.tiempo_reposo,
          plantilla_origen_ejercicio: ep.id,
          imagen_url: ep.imagen_url
        });
      }

      onAssigned();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error al asignar la rutina.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f1115] w-full sm:w-[450px] rounded-t-3xl sm:rounded-3xl border-t sm:border border-border/60 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 duration-300 pb-safe">
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-surface/50">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <CalendarPlus className="text-primary" size={20} /> Asignar Entrenamiento
          </h2>
          <button onClick={onClose} disabled={saving} className="p-2 rounded-full hover:bg-surface-hover text-text-muted transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-text-muted">
            Asignando rutina para el día <strong>{format(date, "d 'de' MMMM, yyyy", { locale: es })}</strong>
          </p>

          <div>
            <label className="text-xs text-text-muted font-bold block mb-1">Plantilla de Entrenamiento</label>
            <select
              value={selectedPlantilla}
              onChange={e => setSelectedPlantilla(e.target.value)}
              className="w-full bg-surface border border-border/50 rounded-xl px-3 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              {plantillas.map(r => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 p-5 pt-2 border-t border-border/50">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 bg-surface hover:bg-surface-hover border border-border/60 rounded-xl font-bold text-sm text-text-muted hover:text-text-main transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            disabled={saving || !selectedPlantilla}
            className="flex-1 py-3 bg-primary text-white hover:bg-primary-hover rounded-xl font-bold text-sm shadow-lg shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {saving ? "Asignando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
