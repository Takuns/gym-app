import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import { Trash2, Sparkles, RefreshCw, GripVertical } from 'lucide-react';
import { analyzeFoodText } from '../lib/geminiService';
import { format } from 'date-fns';
import { cn } from './FloatingRestTimer';

interface DailyLogProps {
  user: any;
  selectedDate: Date;
  forceOpenFormTrigger?: number;
  onFoodAdded?: () => void;
}

export default function DailyLog({ user, selectedDate, forceOpenFormTrigger, onFoodAdded }: DailyLogProps) {
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [aiDescription, setAiDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  // Auto-open form and scroll to daily log when the quick add button is clicked
  useEffect(() => {
    if (forceOpenFormTrigger !== undefined && forceOpenFormTrigger > 0) {
      const key = localStorage.getItem('gemini_api_key') || '';
      setGeminiApiKey(key);
      setShowForm(true);
      
      // Allow DOM to update, then scroll to section
      setTimeout(() => {
        const el = document.getElementById('daily-log-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [forceOpenFormTrigger]);
  
  const [formData, setFormData] = useState({
    nombre_comida: 'Desayuno',
    detalles: '',
    calorias: '',
    proteinas: '',
    carbohidratos: '',
    grasas: ''
  });

  const fetchTodayMeals = async () => {
    try {
      const startOfDay = format(selectedDate, 'yyyy-MM-dd') + ' 00:00:00.000Z';
      const endOfDay = format(selectedDate, 'yyyy-MM-dd') + ' 23:59:59.999Z';
      const records = await pb.collection('comidas_diarias').getFullList({
        filter: `usuario = "${user.id}" && fecha >= "${startOfDay}" && fecha <= "${endOfDay}"`,
        sort: 'orden,created'
      });
      setMeals(records);
    } catch (err) {
      console.error("Error fetching meals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayMeals();

    // Cargar API Key
    const key = localStorage.getItem('gemini_api_key') || '';
    setGeminiApiKey(key);

    pb.collection('comidas_diarias').subscribe('*', function (e) {
      if (e.record.usuario === user.id) {
        fetchTodayMeals();
        if (onFoodAdded) onFoodAdded();
      }
    });

    return () => {
      pb.collection('comidas_diarias').unsubscribe('*');
    };
  }, [user.id, selectedDate, onFoodAdded]);

  const handleAnalyzeFood = async () => {
    if (!geminiApiKey || !aiDescription.trim()) return;
    setAnalyzing(true);
    try {
      const result = await analyzeFoodText(geminiApiKey, aiDescription);
      setFormData({
        nombre_comida: result.nombre_comida,
        detalles: result.detalles,
        calorias: result.calorias.toString(),
        proteinas: result.proteinas.toString(),
        carbohidratos: result.carbohidratos.toString(),
        grasas: result.grasas.toString()
      });
      setAiDescription('');
    } catch (err: any) {
      console.error(err);
      alert(`Error al analizar comida con IA:\n\n${err.message || 'Verifica tu API Key o conexión.'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Get max order
      const maxOrder = meals.length > 0 ? Math.max(...meals.map(m => m.orden || 0)) : 0;
      await pb.collection('comidas_diarias').create({
        usuario: user.id,
        fecha: format(selectedDate, 'yyyy-MM-dd') + 'T12:00:00.000Z',
        nombre_comida: formData.nombre_comida,
        detalles: formData.detalles,
        calorias: parseInt(formData.calorias) || 0,
        proteinas: parseInt(formData.proteinas) || 0,
        carbohidratos: parseInt(formData.carbohidratos) || 0,
        grasas: parseInt(formData.grasas) || 0,
        orden: maxOrder + 1
      });
      setFormData({ nombre_comida: 'Desayuno', detalles: '', calorias: '', proteinas: '', carbohidratos: '', grasas: '' });
      setShowForm(false);
      await fetchTodayMeals();
      if (onFoodAdded) onFoodAdded();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMeal = async (id: string) => {
    try {
      await pb.collection('comidas_diarias').delete(id);
      await fetchTodayMeals();
      if (onFoodAdded) onFoodAdded();
    } catch (err) {
      console.error(err);
    }
  };

  const moveMeal = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= meals.length || fromIndex === toIndex) return;

    const updated = [...meals];
    const [draggedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, draggedItem);

    // optimistic state update
    setMeals(updated);

    try {
      // Update orden fields in pocketbase
      await Promise.all(
        updated.map((meal, idx) => pb.collection('comidas_diarias').update(meal.id, { orden: idx }))
      );
      if (onFoodAdded) onFoodAdded();
    } catch (err) {
      console.error(err);
      fetchTodayMeals();
    }
  };

  // Drag and drop states
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIdx(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx !== null) {
      moveMeal(draggedIdx, targetIndex);
      setDraggedIdx(null);
    }
  };

  return (
    <div id="daily-log-section">
      <div className="mb-2"></div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-panel p-5 mb-6 animate-in fade-in slide-in-from-top-4 duration-300 space-y-4">
          
          {/* Autocompletado IA */}
          {geminiApiKey ? (
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl space-y-2">
              <label className="text-xs text-primary font-bold flex items-center gap-1">
                <Sparkles size={14} /> Autocompletar con IA (Gemini)
              </label>
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={aiDescription}
                  onChange={e => setAiDescription(e.target.value)}
                  disabled={analyzing}
                  placeholder="Ej: Un batido de proteína con un plátano, 30g de avena y una cucharada de crema de cacahuete"
                  className="flex-1 bg-surface border border-border/50 rounded-xl px-3 py-2 text-xs text-text-main placeholder-text-muted focus:outline-none focus:border-primary resize-none leading-normal"
                />
                <button
                  type="button"
                  onClick={handleAnalyzeFood}
                  disabled={analyzing || !aiDescription.trim()}
                  className="bg-primary text-white font-bold px-4 rounded-xl text-xs flex flex-col items-center justify-center gap-1 active:scale-95 disabled:opacity-50 transition-all cursor-pointer select-none"
                >
                  {analyzing ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Analizar
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-surface border border-border/50 rounded-2xl text-[10px] text-text-muted leading-relaxed">
              💡 <strong>¿Quieres registrar rápido?</strong> Guarda tu Gemini API Key en tu Perfil para poder describir tu comida y autocompletar calorías y macros al instante con IA.
            </div>
          )}

          <div>
            <label className="text-xs text-text-muted font-bold block mb-1">Categoría</label>
            <select
              value={formData.nombre_comida}
              onChange={e => setFormData({...formData, nombre_comida: e.target.value})}
              className="w-full bg-surface border border-border/50 rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary transition-colors text-sm"
            >
              <option value="Desayuno">🍳 Desayuno</option>
              <option value="Almuerzo">🍗 Almuerzo</option>
              <option value="Cena">🐟 Cena</option>
              <option value="Snack">🍎 Snack</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-text-muted font-bold block mb-1">Descripción de la Comida</label>
            <input 
              required
              placeholder="Ej. Tortilla de espinacas y avena" 
              className="w-full bg-surface border border-border/50 rounded-xl px-4 py-3 text-text-main placeholder-text-muted focus:outline-none focus:border-primary transition-colors text-sm"
              value={formData.detalles}
              onChange={e => setFormData({...formData, detalles: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-text-muted font-bold block mb-1">Calorías (kcal)</label>
              <input 
                required type="number" placeholder="Kcal" 
                className="w-full bg-surface border border-border/50 rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary"
                value={formData.calorias} onChange={e => setFormData({...formData, calorias: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] text-text-muted font-bold block mb-1">Proteínas (g)</label>
              <input 
                required type="number" placeholder="Prot" 
                className="w-full bg-surface border border-border/50 rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-blue-500"
                value={formData.proteinas} onChange={e => setFormData({...formData, proteinas: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] text-text-muted font-bold block mb-1">Carbohidratos (g)</label>
              <input 
                required type="number" placeholder="Carbs" 
                className="w-full bg-surface border border-border/50 rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-amber-500"
                value={formData.carbohidratos} onChange={e => setFormData({...formData, carbohidratos: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] text-text-muted font-bold block mb-1">Grasas (g)</label>
              <input 
                required type="number" placeholder="Grasas" 
                className="w-full bg-surface border border-border/50 rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-rose-500"
                value={formData.grasas} onChange={e => setFormData({...formData, grasas: e.target.value})}
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all cursor-pointer">
            Guardar Comida
          </button>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10"><div className="w-6 h-6 mx-auto rounded-full border-2 border-surface border-t-primary animate-spin" /></div>
        ) : meals.length === 0 ? (
          <div className="text-center py-10 px-4 glass-panel border-dashed text-text-muted">
            <p>No has registrado comidas hoy.</p>
          </div>
        ) : (
          meals.map((meal, index) => (
            <div 
              key={meal.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className="glass-panel p-4 flex items-center justify-between group cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-text-muted hover:text-white shrink-0 cursor-grab">
                  <GripVertical size={18} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border",
                      meal.nombre_comida === 'Desayuno' && "bg-blue-500/15 text-blue-400 border-blue-500/25",
                      meal.nombre_comida === 'Almuerzo' && "bg-amber-500/15 text-amber-400 border-amber-500/25",
                      meal.nombre_comida === 'Cena' && "bg-purple-500/15 text-purple-400 border-purple-500/25",
                      meal.nombre_comida === 'Snack' && "bg-rose-500/15 text-rose-400 border-rose-500/25"
                    )}>
                      {meal.nombre_comida}
                    </span>
                    <p className="font-bold text-text-main text-sm">{meal.detalles}</p>
                  </div>
                  <div className="flex gap-3 mt-2 text-xs font-medium tabular-nums">
                    <span className="text-white bg-surface-hover px-2 py-0.5 rounded-md font-bold">{meal.calorias} kcal</span>
                    <span className="text-blue-400">P:{meal.proteinas}g</span>
                    <span className="text-amber-400">C:{meal.carbohidratos}g</span>
                    <span className="text-rose-400">G:{meal.grasas}g</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => deleteMeal(meal.id)}
                className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
