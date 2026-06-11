import { useState, useMemo, useEffect } from 'react';
import { generateWeeklyDiet } from '../lib/dietAlgorithm';
import type { DietIdea } from '../lib/dietAlgorithm';
import { generateDietWithGemini, regenerateSingleMeal } from '../lib/geminiService';
import { ChevronDown, ChevronUp, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from './FloatingRestTimer';

interface DietIdeasProps {
  user: any;
}

export default function DietIdeas({ user }: DietIdeasProps) {
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [customDiet, setCustomDiet] = useState<DietIdea[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [regeneratingMeals, setRegeneratingMeals] = useState<Record<string, boolean>>({});
  const [expandedRecipes, setExpandedRecipes] = useState<Record<string, boolean>>({});


  // Cargar clave API y dieta guardada en localStorage
  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key') || '';
    setGeminiApiKey(key);

    const savedDiet = localStorage.getItem('gemini_diet_plan');
    if (savedDiet) {
      try {
        setCustomDiet(JSON.parse(savedDiet));
      } catch (e) {
        console.error("Error al cargar dieta desde localStorage", e);
      }
    }
  }, []);

  const dietPlan = useMemo<DietIdea[]>(() => {
    if (customDiet) return customDiet;
    return generateWeeklyDiet(user.objetivo, user.calorias_objetivo || 2500);
  }, [user.objetivo, user.calorias_objetivo, customDiet]);

  // Calcular totales de calorías y macros por día para la vista resumen
  const dayTotals = useMemo(() => {
    return dietPlan.map(day => {
      return day.comidas.reduce((acc, meal) => {
        return {
          kcal: acc.kcal + (meal.calorias || 0),
          prot: acc.prot + (meal.proteinas || 0),
          carb: acc.carb + (meal.carbohidratos || 0),
          fat: acc.fat + (meal.grasas || 0),
        };
      }, { kcal: 0, prot: 0, carb: 0, fat: 0 });
    });
  }, [dietPlan]);

  const handleGenerateAiDiet = async () => {
    if (!geminiApiKey) return;
    setGenerating(true);
    try {
      const generated = await generateDietWithGemini(geminiApiKey, {
        nombre: user.nombre || 'Usuario',
        peso_actual: user.peso_actual || 70,
        altura: user.altura || 170,
        edad: user.edad || 25,
        objetivo: user.objetivo || 'Mantenimiento',
        calorias_objetivo: user.calorias_objetivo || 2500
      });
      setCustomDiet(generated);
      localStorage.setItem('gemini_diet_plan', JSON.stringify(generated));
    } catch (err: any) {
      console.error(err);
      alert(`Error al generar la dieta con Gemini:\n\n${err.message || 'Verifica tu API Key o conexión.'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateSingle = async (dayIdx: number, mealIdx: number, mealName: string, previousMealDetails: string) => {
    if (!geminiApiKey) {
      alert("Por favor, guarda tu API Key de Gemini en tu Perfil antes de continuar.");
      return;
    }
    const id = `${dayIdx}-${mealIdx}`;
    setRegeneratingMeals(prev => ({ ...prev, [id]: true }));

    try {
      const newMeal = await regenerateSingleMeal(geminiApiKey, {
        objetivo: user.objetivo || 'Mantenimiento',
        calorias_objetivo: user.calorias_objetivo || 2500
      }, mealName, previousMealDetails);

      setCustomDiet(prevDiet => {
        let currentDiet = prevDiet;
        if (!currentDiet) {
          currentDiet = JSON.parse(JSON.stringify(dietPlan));
        }

        const updated = [...currentDiet!];
        updated[dayIdx] = {
          ...updated[dayIdx],
          comidas: [...updated[dayIdx].comidas]
        };
        updated[dayIdx].comidas[mealIdx] = newMeal;

        localStorage.setItem('gemini_diet_plan', JSON.stringify(updated));
        return updated;
      });

    } catch (err: any) {
      console.error(err);
      alert(`Error al regenerar la comida:\n\n${err.message || 'Verifica tu API Key o conexión.'}`);
    } finally {
      setRegeneratingMeals(prev => ({ ...prev, [id]: false }));
    }
  };



  const toggleRecipe = (recipeId: string) => {
    setExpandedRecipes(prev => ({
      ...prev,
      [recipeId]: !prev[recipeId]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Info Plan */}
      <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl">
        <p className="text-xs text-primary font-medium">
          Menú para <strong>{user.objetivo || 'Mantenimiento'}</strong> de <strong>{user.calorias_objetivo || 2500} kcal</strong> diarias. 
          {customDiet ? " (Generado por Gemini IA 🚀)" : " (Plan Estándar Local)"}
        </p>
      </div>

      {/* Listado de Días Completo (Desplegado) */}
      <div className="space-y-4">
        {dietPlan.map((day, dIdx) => (
          <div key={day.dia} className="glass-panel overflow-hidden">
            <div className="p-4 bg-black/30 border-b border-border/50 flex flex-wrap gap-2 items-center justify-between">
              <h3 className="font-extrabold text-text-main text-base">{day.dia}</h3>
              <div className="flex gap-2 text-[10px] font-bold tabular-nums">
                <span className="bg-surface border border-border/50 px-2 py-0.5 rounded text-text-muted">{dayTotals[dIdx].kcal} kcal</span>
                <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">P:{dayTotals[dIdx].prot}g</span>
                <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">C:{dayTotals[dIdx].carb}g</span>
                <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">G:{dayTotals[dIdx].fat}g</span>
              </div>
            </div>
            
            <div className="p-4 bg-black/10 space-y-4">
              {day.comidas.map((meal, mIdx) => {
                const id = `${dIdx}-${mIdx}`;
                const isRecipeExpanded = expandedRecipes[id];

                return (
                  <div key={mIdx} className="bg-surface border border-border/50 rounded-xl p-3">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex flex-col">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border",
                            meal.nombre === 'Desayuno' && "bg-blue-500/15 text-blue-400 border-blue-500/25",
                            meal.nombre === 'Almuerzo' && "bg-amber-500/15 text-amber-400 border-amber-500/25",
                            meal.nombre === 'Cena' && "bg-purple-500/15 text-purple-400 border-purple-500/25",
                            meal.nombre === 'Snack' && "bg-rose-500/15 text-rose-400 border-rose-500/25"
                          )}>
                            {meal.nombre}
                          </span>
                          <div className="flex gap-2 text-[10px] font-bold tabular-nums">
                            <span className="text-white bg-surface-hover px-2 py-0.5 rounded-md font-bold">{meal.calorias} kcal</span>
                            <span className="text-blue-400">P:{meal.proteinas}g</span>
                            <span className="text-amber-400">C:{meal.carbohidratos}g</span>
                            <span className="text-rose-400">G:{meal.grasas}g</span>
                          </div>
                        </div>
                        <h4 className="font-bold text-text-main text-sm mt-2">{meal.detalles}</h4>
                      </div>
                      
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleRegenerateSingle(dIdx, mIdx, meal.nombre, meal.detalles)}
                          disabled={regeneratingMeals[id] || generating}
                          className="flex items-center justify-center p-1.5 rounded-lg bg-surface border border-border hover:bg-surface-hover hover:text-primary disabled:opacity-50 transition-colors cursor-pointer text-text-muted"
                          title="Alternar esta comida con IA"
                        >
                          {regeneratingMeals[id] ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Sparkles size={12} className="text-primary" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Expandible de Receta */}
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => toggleRecipe(id)}
                        className="text-[10px] font-bold text-primary hover:text-primary-hover flex items-center gap-1 focus:outline-none"
                      >
                        {isRecipeExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {isRecipeExpanded ? "Ocultar" : "Ver detalles y receta"}
                      </button>
                      
                      {isRecipeExpanded && (
                        <div className="mt-2 p-3 bg-black/35 border border-border/30 rounded-xl space-y-2 text-xs text-text-muted leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                          <p className="font-extrabold text-text-main text-[10px] uppercase tracking-wider text-primary">Instrucciones:</p>
                          <p>{meal.preparacion || "No hay instrucciones disponibles."}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Botones de Acción (Gemini & Restablecer) colocados al final para coherencia de estilo */}
      {geminiApiKey ? (
        <div className="space-y-2 pt-2">
          <button
            onClick={handleGenerateAiDiet}
            disabled={generating}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-[0.99] transition-all text-sm cursor-pointer"
          >
            {generating ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Generando menú con Gemini IA...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generar Dieta Personalizada con Gemini
              </>
            )}
          </button>

          {customDiet && (
            <button
              onClick={() => {
                if (confirm("¿Seguro que deseas restablecer a la dieta estándar local?")) {
                  setCustomDiet(null);
                  localStorage.removeItem('gemini_diet_plan');
                }
              }}
              className="w-full py-2 bg-surface hover:bg-surface-hover border border-border/50 text-[10px] text-text-muted font-bold rounded-xl active:scale-[0.98] transition-all cursor-pointer"
            >
              Restablecer a Dieta Estándar
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border/50 p-4 rounded-2xl text-[11px] text-text-muted leading-relaxed">
          💡 <strong>¿Quieres una dieta 100% personalizada con Inteligencia Artificial?</strong> Añade tu API Key de Google Gemini en tu Perfil para desbloquear la generación con IA.
        </div>
      )}
    </div>
  );
}
