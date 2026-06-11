import { useState } from 'react';
import { X, Flame, Bot, Loader2 } from 'lucide-react';
import { pb } from '../lib/pocketbase';
import { format } from 'date-fns';
import { analyzeSportText } from '../lib/geminiService';

interface AddSportModalProps {
  user: any;
  date: Date;
  onClose: () => void;
  onSportAdded: () => void;
}

export default function AddSportModal({ user, date, onClose, onSportAdded }: AddSportModalProps) {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      setError("Necesitas configurar tu clave API de Gemini en tu perfil.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Analyze with AI
      const result = await analyzeSportText(apiKey, text, user.peso_actual || 75);

      // Save to database
      await pb.collection('deportes_diarios').create({
        usuario: user.id,
        fecha: format(date, 'yyyy-MM-dd') + 'T12:00:00.000Z',
        nombre_deporte: result.nombre_deporte,
        duracion_minutos: result.duracion_minutos,
        calorias_quemadas: result.calorias_quemadas
      });

      onSportAdded();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "No se pudo analizar la actividad.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-surface-hover w-full sm:w-[400px] rounded-t-3xl sm:rounded-3xl border border-border/50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 duration-300">
        
        <div className="p-5 flex items-center justify-between border-b border-border/50">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Flame className="text-orange-500" /> Añadir Actividad
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface text-text-muted transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-text-muted">
            Describe qué deporte o actividad física has hecho hoy y nuestra IA estimará las calorías quemadas.
          </p>

          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ej: He jugado un partido de pádel intenso de 1 hora..."
              className="w-full bg-surface border border-border/50 rounded-xl p-4 text-sm text-text-main focus:outline-none focus:border-primary transition-colors min-h-[120px] resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-xs font-semibold">
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !text.trim()}
            className="w-full py-3.5 bg-primary hover:bg-primary-hover disabled:bg-surface disabled:text-text-muted text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Analizando...
              </>
            ) : (
              <>
                <Bot size={18} /> Procesar con IA
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
