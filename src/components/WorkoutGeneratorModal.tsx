import { useState, useEffect } from 'react';
import { X, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import { generateWorkoutWithGemini } from '../lib/geminiService';
import { pb } from '../lib/pocketbase';

interface WorkoutGeneratorModalProps {
  user: any;
  onClose: () => void;
  onRoutineGenerated: (newRoutineId: string) => void;
}

export default function WorkoutGeneratorModal({ user, onClose, onRoutineGenerated }: WorkoutGeneratorModalProps) {
  const [intention, setIntention] = useState('');
  const [generating, setGenerating] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');

  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key') || '';
    setGeminiApiKey(key);
  }, []);

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiApiKey) {
      alert("Por favor, configura tu API Key de Gemini en tu Perfil de Nutrición antes de continuar.");
      return;
    }

    if (!intention.trim()) {
      alert("Introduce una descripción para tu rutina.");
      return;
    }

    setGenerating(true);
    try {
      // 1. Generar la rutina por IA
      const result = await generateWorkoutWithGemini(geminiApiKey, intention, {
        objetivo: user.objetivo,
        peso_actual: user.peso_actual,
        altura: user.altura,
        edad: user.edad,
      });

      console.log("Rutina generada por IA:", result);

      for (const plantilla of result.plantillas) {
        const newTemplate = await pb.collection('plantillas_rutinas').create({
          nombre: plantilla.nombre_plantilla,
          usuario: user.id
        });

        for (const ex of plantilla.ejercicios) {
          await pb.collection('ejercicios_plantilla').create({
            nombre: ex.nombre,
            plantilla: newTemplate.id,
            series_objetivo: ex.series_objetivo,
            repeticiones_objetivo: ex.repeticiones_objetivo,
            es_tiempo: ex.es_tiempo,
            descripcion: ex.descripcion,
            tiempo_reposo: ex.tiempo_reposo || 90
          });
        }
      }

      onRoutineGenerated(''); // Recarga la lista global
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(`Error al generar la rutina:\n\n${err.message || 'Verifica tu clave de API y conexión.'}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f1115] w-full sm:w-[500px] rounded-t-3xl sm:rounded-3xl border-t sm:border border-border/60 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-surface/50">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sparkles className="text-primary" size={22} /> Generador de Rutinas IA
          </h2>
          <button onClick={onClose} disabled={generating} className="p-2 rounded-full hover:bg-surface-hover text-text-muted transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleGenerate} className="p-5 space-y-4">
          
          {!geminiApiKey && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3 text-xs text-amber-400">
              <AlertTriangle className="shrink-0" size={18} />
              <div>
                <p className="font-bold mb-0.5">Falta API Key de Gemini</p>
                <p className="leading-tight opacity-90">Debes guardar tu API Key de Google en tu Perfil (sección de Nutrición) para poder usar el generador inteligente.</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs text-text-muted font-bold block">
              ¿Cómo quieres entrenar? (Intención)
            </label>
            <textarea
              required
              rows={4}
              value={intention}
              onChange={e => setIntention(e.target.value)}
              disabled={generating}
              placeholder="Ej: Quiero una rutina de hipertrofia de 3 días (Lunes, Miércoles, Viernes). Enfocada en piernas y hombros, con ejercicios de peso corporal e isométricos como planchas."
              className="w-full bg-surface border border-border/50 rounded-2xl px-4 py-3 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary transition-colors resize-none leading-relaxed"
            />
          </div>

          <div className="text-[10px] text-text-muted leading-relaxed">
            💡 <strong>Tip:</strong> Sé específico con el número de días que quieres entrenar y en qué músculos o ejercicios quieres centrarte. La IA creará una planificación completa adaptando los macros y calorías de tus datos de usuario si los has rellenado.
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={generating}
              className="flex-1 py-3 bg-surface hover:bg-surface-hover border border-border/60 rounded-xl font-bold text-sm text-text-muted hover:text-text-main transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={generating || !geminiApiKey}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-sm shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {generating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generar Rutina
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
