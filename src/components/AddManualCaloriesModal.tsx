import { useState } from 'react';
import { X, Activity, Loader2 } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { format } from 'date-fns';

interface AddManualCaloriesModalProps {
  user: any;
  date: Date;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddManualCaloriesModal({ user, date, onClose, onAdded }: AddManualCaloriesModalProps) {
  const [nombre, setNombre] = useState('Apple Watch');
  const [calorias, setCalorias] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!nombre.trim() || !calorias || isNaN(Number(calorias))) {
      setError("Por favor, introduce un nombre y unas calorías válidas.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await pb.collection('deportes_diarios').create({
        usuario: user.id,
        fecha: format(date, 'yyyy-MM-dd') + 'T12:00:00.000Z',
        nombre_deporte: nombre,
        duracion_minutos: 0,
        calorias_quemadas: Number(calorias)
      });

      onAdded();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al guardar las calorías.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-surface-hover w-full sm:w-[400px] rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 duration-300">
        
        <div className="p-5 flex items-center justify-between border-b border-border/50">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Activity className="text-rose-500" /> Calorías Manuales
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface text-text-muted transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-text-muted">
            Introduce las calorías activas quemadas según tu Apple Watch u otro dispositivo.
          </p>

          <div>
            <label className="text-xs text-text-muted font-bold block mb-1">Concepto / Dispositivo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Apple Watch, Cinta de correr..."
              className="w-full bg-surface border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted font-bold block mb-1">Calorías Quemadas (kcal)</label>
            <input
              type="number"
              value={calorias}
              onChange={(e) => setCalorias(e.target.value)}
              placeholder="Ej: 500"
              className="w-full bg-surface border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-xs font-semibold">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || !nombre.trim() || !calorias}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 disabled:bg-surface disabled:text-text-muted text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-rose-600/20"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Guardando...
              </>
            ) : (
              "Guardar Calorías"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
