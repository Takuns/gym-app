import { useState, useEffect } from 'react';
import { X, Plus, Save, Search } from 'lucide-react';
import { pb } from '../lib/pocketbase';

interface AddExerciseModalProps {
  entrenamientoDiarioId?: string;
  plantillaId?: string;
  onClose: () => void;
  onExerciseAdded: () => void;
}

export default function AddExerciseModal({ entrenamientoDiarioId, plantillaId, onClose, onExerciseAdded }: AddExerciseModalProps) {
  const [nombre, setNombre] = useState('');
  const [series, setSeries] = useState(3);
  const [reps, setReps] = useState('');
  const [esTiempo, setEsTiempo] = useState(false);
  const [desc, setDesc] = useState('');
  const [tiempoReposo, setTiempoReposo] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [metValue, setMetValue] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // Global Exercises State
  const [globalExercises, setGlobalExercises] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  useEffect(() => {
    const fetchGlobal = async () => {
      try {
        const res = await pb.collection('ejercicios_globales').getFullList();
        setGlobalExercises(res);
      } catch (e) {
        console.error(e);
      }
    };
    fetchGlobal();
  }, []);

  const filteredExercises = globalExercises.filter(e => e.nombre.toLowerCase().includes(nombre.toLowerCase()) && nombre.length > 0);

  const handleSelectSuggestion = (ej: any) => {
    setNombre(ej.nombre);
    setEsTiempo(ej.es_tiempo || false);
    if (ej.imagen_url) setImagenUrl(ej.imagen_url);
    if (ej.met_value) setMetValue(ej.met_value);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (entrenamientoDiarioId) {
        await pb.collection('ejercicios_diarios').create({
          entrenamiento: entrenamientoDiarioId,
          nombre,
          series_objetivo: series,
          repeticiones_objetivo: reps,
          es_tiempo: esTiempo,
          descripcion: desc,
          tiempo_reposo: tiempoReposo ? parseInt(tiempoReposo) : null,
          imagen_url: imagenUrl.trim() || null,
          met_value: metValue
        });
      } else if (plantillaId) {
        await pb.collection('ejercicios_plantilla').create({
          plantilla: plantillaId,
          nombre,
          series_objetivo: series,
          repeticiones_objetivo: reps,
          es_tiempo: esTiempo,
          descripcion: desc,
          tiempo_reposo: tiempoReposo ? parseInt(tiempoReposo) : null,
          imagen_url: imagenUrl.trim() || null,
          met_value: metValue
        });
      }

      onExerciseAdded();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error al añadir el ejercicio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f1115] w-full sm:w-[450px] rounded-t-3xl sm:rounded-3xl border-t sm:border border-border/60 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 duration-300">
        
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-surface/50">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Plus className="text-primary" size={20} /> Añadir Ejercicio
          </h2>
          <button onClick={onClose} disabled={saving} className="p-2 rounded-full hover:bg-surface-hover text-text-muted transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          <div className="relative">
            <label className="text-xs text-text-muted font-bold block mb-1">Nombre del Ejercicio *</label>
            <div className="relative">
              <input 
                required 
                type="text" 
                value={nombre} 
                onChange={e => {
                  setNombre(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full bg-surface border border-border/50 rounded-xl pl-3 pr-10 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary transition-colors"
                placeholder="Busca en la base de datos o escribe uno nuevo"
              />
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && filteredExercises.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-surface border border-border/50 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                {filteredExercises.map(ej => (
                  <div 
                    key={ej.id} 
                    onClick={() => handleSelectSuggestion(ej)}
                    className="px-3 py-2 hover:bg-primary/20 cursor-pointer flex flex-col border-b border-border/20 last:border-0"
                  >
                    <span className="text-sm font-bold text-white">{ej.nombre}</span>
                    <span className="text-[10px] text-text-muted">
                      {ej.categoria} {ej.met_value ? `• ${ej.met_value} MET` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-muted font-bold block mb-1">Series *</label>
              <input 
                required 
                type="number" 
                min="1" 
                value={series} 
                onChange={e => setSeries(parseInt(e.target.value))}
                className="w-full bg-surface border border-border/50 rounded-xl px-3 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted font-bold block mb-1">Reps/Tiempo *</label>
              <input 
                required 
                type="text" 
                value={reps} 
                onChange={e => setReps(e.target.value)}
                className="w-full bg-surface border border-border/50 rounded-xl px-3 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary transition-colors"
                placeholder="Ej: 10-12 o 60s"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 bg-surface border border-border/50 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
            <input 
              type="checkbox" 
              checked={esTiempo}
              onChange={e => setEsTiempo(e.target.checked)}
              className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary focus:ring-offset-background bg-background"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-text-main">Es un ejercicio por tiempo</span>
              <span className="text-[10px] text-text-muted">En vez de repeticiones, registrarás tiempo logrado.</span>
            </div>
          </label>

          <div>
            <label className="text-xs text-text-muted font-bold block mb-1">Tiempo de Reposo Específico (segundos)</label>
            <input 
              type="number" 
              min="0"
              value={tiempoReposo} 
              onChange={e => setTiempoReposo(e.target.value)}
              className="w-full bg-surface border border-border/50 rounded-xl px-3 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary transition-colors placeholder-text-muted/40"
              placeholder="Opcional. Si lo dejas vacío, usa el general."
            />
          </div>

          <div>
            <label className="text-xs text-text-muted font-bold block mb-1">Descripción / Notas (Opcional)</label>
            <textarea 
              rows={2} 
              value={desc} 
              onChange={e => setDesc(e.target.value)}
              className="w-full bg-surface border border-border/50 rounded-xl px-3 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary transition-colors resize-none"
              placeholder="Instrucciones sobre técnica, cadencia..."
            />
          </div>

          <div>
            <label className="text-xs text-text-muted font-bold block mb-1">URL de Imagen del Ejercicio (Opcional)</label>
            <input 
              type="url" 
              value={imagenUrl} 
              onChange={e => setImagenUrl(e.target.value)}
              className="w-full bg-surface border border-border/50 rounded-xl px-3 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary transition-colors placeholder-text-muted/40"
              placeholder="Ej: https://images.unsplash.com/... o enlace de internet"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 bg-surface hover:bg-surface-hover border border-border/60 rounded-xl font-bold text-sm text-text-muted hover:text-text-main transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-primary text-white hover:bg-primary-hover rounded-xl font-bold text-sm shadow-lg shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save size={16} /> {saving ? "Guardando..." : "Guardar Ejercicio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
