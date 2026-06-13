import { useState, useEffect, useMemo, useCallback } from 'react';
import { pb } from '../lib/pocketbase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dumbbell, Flame, Utensils, Zap, Coffee, Plus, Sparkles, RefreshCw, ChevronDown, ChevronUp, Beef, Wheat, Droplet, Activity } from 'lucide-react';

import CalendarWidget from './CalendarWidget';
import DailyLog from './DailyLog';
import ExerciseCard from './ExerciseCard';
import FloatingRestTimer, { cn } from './FloatingRestTimer';
import AddSportModal from './AddSportModal';
import AddManualCaloriesModal from './AddManualCaloriesModal';
import AddWorkoutModal from './AddWorkoutModal';
import { generateWeeklyDiet } from '../lib/dietAlgorithm';
import { regenerateSingleMeal } from '../lib/geminiService';

interface HoyScreenProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

export default function HoyScreen({ selectedDate, setSelectedDate }: HoyScreenProps) {
  const [user, setUser] = useState<any>(null);
  
  // Dashboard states
  const [sports, setSports] = useState<any[]>([]);
  const [workoutDates, setWorkoutDates] = useState<string[]>([]);
  const [calendarData, setCalendarData] = useState<Record<string, { status: 'met' | 'short' | 'over' | 'none' }>>({});
  
  // Gym states
  const [dailyWorkout, setDailyWorkout] = useState<any>(null);
  const [ejercicios, setEjercicios] = useState<any[]>([]);
  const [gymCalories, setGymCalories] = useState<number>(0);
  const [showAddWorkout, setShowAddWorkout] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [currentRestTime, setCurrentRestTime] = useState(90);

  // UI states
  const [showAddSport, setShowAddSport] = useState(false);
  const [openMealFormTrigger, setOpenMealFormTrigger] = useState(0);
  const [showAddManualCalories, setShowAddManualCalories] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);
  const [dailyLogExpanded, setDailyLogExpanded] = useState(false);
  const [consumedMacros, setConsumedMacros] = useState({ kcal: 0, prot: 0, carb: 0, fat: 0 });
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [customDiet, setCustomDiet] = useState<any[] | null>(null);
  const [regeneratingMeals, setRegeneratingMeals] = useState<Record<string, boolean>>({});
  const [expandedRecipes, setExpandedRecipes] = useState<Record<string, boolean>>({});

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
  }, [refreshTrigger]);

  const triggerRefresh = useCallback(() => setRefreshTrigger(prev => prev + 1), []);

  // Scroll to top when selected date changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLoading(true);
  }, [selectedDate]);

  // 1. Fetch user once on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!pb.authStore.model) return;
        const u = await pb.collection('usuarios').getOne(pb.authStore.model.id);
        setUser(u);
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchUser();
  }, []);

  // 2. Fetch all daily and calendar data safely (preventing race conditions)
  useEffect(() => {
    if (!user) return;
    let active = true;

    const fetchAllData = async () => {
      try {
        const startOfDay = format(selectedDate, 'yyyy-MM-dd') + ' 00:00:00.000Z';
        const endOfDay = format(selectedDate, 'yyyy-MM-dd') + ' 23:59:59.999Z';

        // Fetch meals for calendar
        let mealsForCalendar: any[] = [];
        try {
          mealsForCalendar = await pb.collection('comidas_diarias').getFullList({
             filter: `usuario = "${user.id}"`
          });
        } catch (e) {
          console.error("Error fetching mealsForCalendar:", e);
        }

        // Fetch completed series for workout dates
        let recordsSeries: any[] = [];
        try {
          recordsSeries = await pb.collection('historial_series').getFullList({
            filter: `completado = true`,
            sort: '-created'
          });
        } catch (e) {
          console.error("Error fetching recordsSeries:", e);
        }

        // Fetch ALL sports for calendar
        let allDeportes: any[] = [];
        try {
          allDeportes = await pb.collection('deportes_diarios').getFullList({
            filter: `usuario = "${user.id}"`
          });
        } catch (e) {}

        // Fetch today's Sports
        let deportes: any[] = [];
        try {
          deportes = await pb.collection('deportes_diarios').getFullList({
            filter: `usuario = "${user.id}" && fecha >= "${startOfDay}" && fecha <= "${endOfDay}"`
          });
        } catch (e) {
          console.error("Error fetching deportes:", e);
        }

        // Fetch today's Comida
        let comidas: any[] = [];
        try {
          comidas = await pb.collection('comidas_diarias').getFullList({
            filter: `usuario = "${user.id}" && fecha >= "${startOfDay}" && fecha <= "${endOfDay}"`
          });
        } catch (e) {
          console.error("Error fetching comidas:", e);
        }

        // Fetch today's Workout
        let recordsWorkout: any[] = [];
        try {
          recordsWorkout = await pb.collection('entrenamientos_diarios').getFullList({
            filter: `usuario = "${user.id}" && fecha >= "${startOfDay}" && fecha <= "${endOfDay}"`,
          });
        } catch (e) {
          console.error("Error fetching recordsWorkout:", e);
        }

        let todayWorkout = null;
        let todayEjercicios: any[] = [];

        if (recordsWorkout.length > 0) {
          todayWorkout = recordsWorkout[0];
          try {
            const exRecords = await pb.collection('ejercicios_diarios').getFullList({
              filter: `entrenamiento = "${todayWorkout.id}"`,
              sort: 'created'
            });
            todayEjercicios = exRecords;
          } catch (e) {
            console.error("Error fetching ejercicios_diarios:", e);
          }
        }

        if (active) {
          // Calculate calendar data
          const calByDate: Record<string, number> = {};
          mealsForCalendar.forEach(m => {
            if (m.fecha) {
              const d = m.fecha.slice(0, 10); // Safe YYYY-MM-DD extraction
              calByDate[d] = (calByDate[d] || 0) + (m.calorias || 0);
            }
          });
          
          const calStatus: Record<string, {status: 'met' | 'short' | 'over' | 'none'}> = {};
          const goal = user.calorias_objetivo || 2000;
          Object.entries(calByDate).forEach(([d, c]) => {
             if (c === 0) calStatus[d] = { status: 'none' };
             else if (c > goal + 100) calStatus[d] = { status: 'over' };
             else if (c < 1000) calStatus[d] = { status: 'short' }; // Likely incomplete log
             else calStatus[d] = { status: 'met' };
          });
          
          const dates = recordsSeries.map(r => r.created.split(' ')[0]);
          allDeportes.forEach(d => {
            if (d.fecha) dates.push(d.fecha.slice(0, 10));
          });

          // Calculate gym calories for today
          const todayPrefix = format(selectedDate, 'yyyy-MM-dd');
          const todaySeries = recordsSeries.filter(r => r.created.startsWith(todayPrefix));
          const totalGymCal = todaySeries.reduce((acc, curr) => acc + (curr.calorias_quemadas || 0), 0);
          setGymCalories(Math.round(totalGymCal));

          setCalendarData(calStatus);
          setWorkoutDates(Array.from(new Set(dates)));
          setSports(deportes);
          const sumComidas = comidas.reduce((acc, curr) => ({
            kcal: acc.kcal + (curr.calorias || 0),
            prot: acc.prot + (curr.proteinas || 0),
            carb: acc.carb + (curr.carbohidratos || 0),
            fat: acc.fat + (curr.grasas || 0),
          }), { kcal: 0, prot: 0, carb: 0, fat: 0 });
          setConsumedMacros(sumComidas);
          setDailyWorkout(todayWorkout);
          setEjercicios(todayEjercicios);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchAllData();
    return () => {
      active = false;
    };
  }, [user, selectedDate, refreshTrigger]);

  const handleSetCompleted = (time?: number) => {
    const finalTime = time || user?.tiempo_reposo_general || 90;
    setCurrentRestTime(finalTime);
    setTimerActive(false);
    setTimeout(() => setTimerActive(true), 50);
    triggerRefresh(); // to update gym calories
  };

  // Cálculos de Dashboard
  const bmr = useMemo(() => {
    if (!user || !user.peso_actual || !user.altura || !user.edad) return 0;
    let base = (10 * Number(user.peso_actual)) + (6.25 * Number(user.altura)) - (5 * Number(user.edad));
    return user.genero === 'Hombre' ? Math.round(base + 5) : Math.round(base - 161);
  }, [user]);

  const sportsCalories = sports.reduce((acc, s) => acc + (s.calorias_quemadas || 0), 0);
  
  // Estimation: Removed useMemo, using exact calories from DB
  // const [gymCalories, setGymCalories] = useState(0); // REMOVED duplicate

  // const totalBurned = bmr + sportsCalories + gymCalories;
  // const balance = foodCalories - totalBurned;

  const targetMacros = useMemo(() => {
    if (!user) return { kcal: 2000, prot: 150, carb: 200, fat: 65 };
    const cal = user.calorias_objetivo || 2500;
    let pPct = 0.30, cPct = 0.40, fPct = 0.30;

    if (user.objetivo?.toLowerCase() === 'volumen') {
      pPct = 0.30; cPct = 0.50; fPct = 0.20;
    } else if (user.objetivo?.toLowerCase() === 'definicion' || user.objetivo?.toLowerCase() === 'definición') {
      pPct = 0.40; cPct = 0.30; fPct = 0.30;
    }

    return {
      kcal: cal,
      prot: Math.round((cal * pPct) / 4),
      carb: Math.round((cal * cPct) / 4),
      fat: Math.round((cal * fPct) / 9),
    };
  }, [user]);



  const ProgressBar = ({ label, current, max, color, icon: Icon }: any) => {
    const percentage = Math.min(Math.round((current / max) * 100), 100) || 0;
    
    // Mapeo estático para asegurar que las clases de Tailwind sean detectadas y compiladas correctamente
    const bgClasses: Record<string, string> = {
      'text-blue-500': 'bg-blue-500',
      'text-amber-500': 'bg-amber-500',
      'text-rose-500': 'bg-rose-500'
    };
    const bgClass = bgClasses[color] || 'bg-primary';

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="flex items-center gap-1.5 font-bold text-text-muted">
            <Icon size={12} className={color} /> {label}
          </span>
          <span className="font-medium text-text-main tabular-nums text-[10px]">
            {Math.round(current)} <span className="text-text-muted">/ {max}g</span>
          </span>
        </div>
        <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-700 ease-out", bgClass)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  const dietPlan = useMemo(() => {
    if (!user) return [];
    if (customDiet) return customDiet;
    return generateWeeklyDiet(user.objetivo, user.calorias_objetivo || 2500);
  }, [user, customDiet]);

  const todayMenu = useMemo(() => {
    if (dietPlan.length === 0) return null;
    // getDay() is 0 (Sunday) to 6 (Saturday). Our dietPlan is Mon(0) to Sun(6)
    let jsDay = selectedDate.getDay();
    let index = jsDay === 0 ? 6 : jsDay - 1;
    return {
      dayMenu: dietPlan[index],
      dayIdx: index
    };
  }, [dietPlan, selectedDate]);

  const todayMenuTotals = useMemo(() => {
    if (!todayMenu || !todayMenu.dayMenu) return { kcal: 0, prot: 0, carb: 0, fat: 0 };
    return todayMenu.dayMenu.comidas.reduce((acc: any, meal: any) => {
      return {
        kcal: acc.kcal + (meal.calorias || 0),
        prot: acc.prot + (meal.proteinas || 0),
        carb: acc.carb + (meal.carbohidratos || 0),
        fat: acc.fat + (meal.grasas || 0),
      };
    }, { kcal: 0, prot: 0, carb: 0, fat: 0 });
  }, [todayMenu]);

  const displayMacros = consumedMacros;

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

      let currentDiet = customDiet;
      if (!currentDiet) {
        currentDiet = JSON.parse(JSON.stringify(dietPlan));
      }

      const updated = [...currentDiet!];
      updated[dayIdx] = {
        ...updated[dayIdx],
        comidas: [...updated[dayIdx].comidas]
      };
      updated[dayIdx].comidas[mealIdx] = newMeal;

      setCustomDiet(updated);
      localStorage.setItem('gemini_diet_plan', JSON.stringify(updated));

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

  const totalQuemadas = bmr + sportsCalories + gymCalories;
  const netBalance = displayMacros.kcal - totalQuemadas;
  const maxVal = Math.max(targetMacros.kcal, displayMacros.kcal, totalQuemadas, 1);

  return (
    <div className="min-h-screen bg-background pb-32">
      <main className="p-3 space-y-4">
        
        <CalendarWidget selectedDate={selectedDate} onChangeDate={setSelectedDate} workoutDates={workoutDates} calendarData={calendarData} />

        {/* --- DASHBOARD CENTRAL CON GRÁFICA DE BALANCE Y MACROS --- */}
        <section className="glass-panel p-4 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Zap className="text-yellow-500" size={16} /> Balance y Macronutrientes
            </h2>
            <span className="text-[10px] text-text-muted font-bold">
              Objetivo: {targetMacros.kcal} kcal
            </span>
          </div>

          {/* Balance Térmico Dual */}
          <div className="bg-surface/30 border border-border/30 rounded-xl p-4 space-y-6">
            
            {/* 1. Ingesta vs Objetivo */}
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Consumidas</span>
                    <span className="text-sm font-black text-white">{displayMacros.kcal} <span className="text-[9px] font-normal text-text-muted">/ {targetMacros.kcal} kcal</span></span>
                  </div>
                </div>
                
                <div className="relative h-2.5 w-full bg-surface-hover rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out", 
                      displayMacros.kcal > targetMacros.kcal ? "bg-danger" : "bg-blue-500"
                    )} 
                    style={{ width: `${(displayMacros.kcal / maxVal) * 100}%` }} 
                  />
                  {/* Tick indicador del Objetivo */}
                  <div 
                    className="absolute top-0 h-full w-0.5 bg-white/40 z-10"
                    style={{ left: `${(targetMacros.kcal / maxVal) * 100}%` }}
                    title={`Objetivo: ${targetMacros.kcal} kcal`}
                  />
                </div>
              </div>

              <div className="flex flex-col items-end min-w-[75px] border-l border-border/20 pl-4">
                <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Restante</span>
                <span className={cn(
                  "text-xl font-black tabular-nums leading-tight",
                  targetMacros.kcal - displayMacros.kcal < 0 ? "text-danger" : "text-white"
                )}>
                  {targetMacros.kcal - displayMacros.kcal}
                </span>
              </div>
            </div>

            {/* 2. Quemadas vs Ingerido */}
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Quemadas</span>
                    <span className="text-sm font-black text-white">{totalQuemadas} <span className="text-[9px] font-normal text-text-muted">kcal</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[9px] font-bold text-orange-400">
                      <div className="w-2 h-2 rounded-full bg-orange-500" /> Basal
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-primary">
                      <div className="w-2 h-2 rounded-full bg-primary" /> Ejercicio
                    </span>
                  </div>
                </div>
                
                <div className="relative h-2.5 w-full bg-surface-hover rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full flex transition-all duration-700 ease-out"
                    style={{ width: `${(totalQuemadas / maxVal) * 100}%` }}
                  >
                    <div 
                      className="bg-orange-500 h-full" 
                      style={{ width: `${(bmr / (totalQuemadas || 1)) * 100}%` }} 
                    />
                    <div 
                      className="bg-primary h-full border-l border-black/20" 
                      style={{ width: `${((sportsCalories + gymCalories) / (totalQuemadas || 1)) * 100}%` }} 
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end min-w-[75px] border-l border-border/20 pl-4">
                <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Neto</span>
                <span className={cn(
                  "text-xl font-black tabular-nums leading-tight",
                  netBalance > 0 ? "text-danger" : "text-green-400"
                )}>
                  {netBalance > 0 ? '+' : ''}{netBalance}
                </span>
              </div>
            </div>
            
          </div>

          {/* Progreso de Macros Minimalista */}
          <div className="bg-surface/50 border border-border/30 rounded-xl p-3 space-y-3">
            <ProgressBar label="Proteínas" current={displayMacros.prot} max={targetMacros.prot} color="text-blue-500" icon={Beef} />
            <ProgressBar label="Carbohidratos" current={displayMacros.carb} max={targetMacros.carb} color="text-amber-500" icon={Wheat} />
            <ProgressBar label="Grasas" current={displayMacros.fat} max={targetMacros.fat} color="text-rose-500" icon={Droplet} />
          </div>
        </section>

        {/* --- DIARIO DE COMIDAS Y SUGERENCIAS --- */}
        <section className="space-y-2">
          <div className="glass-panel p-3">
            <button
              onClick={() => setDailyLogExpanded(!dailyLogExpanded)}
              className="w-full flex items-center justify-between text-xs font-bold text-text-muted hover:text-text-main focus:outline-none transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5 text-primary uppercase font-black text-[10px] tracking-wider">
                <Utensils size={12} /> Diario de Comidas Manual
              </span>
              <span>{dailyLogExpanded ? 'Ocultar' : 'Ver diario'}</span>
            </button>
            
            {dailyLogExpanded && (
              <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                {user && <DailyLog user={user} selectedDate={selectedDate} forceOpenFormTrigger={openMealFormTrigger} onFoodAdded={triggerRefresh} />}
              </div>
            )}
          </div>
          {todayMenu && (
            <div className="glass-panel p-3">
              <button
                onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
                className="w-full flex items-center justify-between text-xs font-bold text-text-muted hover:text-text-main focus:outline-none transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 text-green-400 uppercase font-black text-[10px] tracking-wider">
                  ✨ Sugerencia de Menú ({todayMenu.dayMenu.dia})
                </span>
                <span>{suggestionsExpanded ? 'Ocultar' : 'Ver sugerencia'}</span>
              </button>
              
              {suggestionsExpanded && (
                <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Totales del día */}
                  <div className="flex flex-wrap gap-2 items-center justify-between p-2.5 bg-black/30 border border-border/50 rounded-xl">
                    <span className="text-[10px] font-extrabold uppercase text-text-muted">Total Sugerido:</span>
                    <div className="flex gap-2 text-[10px] font-bold tabular-nums">
                      <span className="bg-surface border border-border/50 px-2 py-0.5 rounded text-text-muted">{todayMenuTotals.kcal} kcal</span>
                      <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">P:{todayMenuTotals.prot}g</span>
                      <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">C:{todayMenuTotals.carb}g</span>
                      <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">G:{todayMenuTotals.fat}g</span>
                    </div>
                  </div>

                  {/* Listado de comidas */}
                  <div className="space-y-3">
                    {todayMenu.dayMenu.comidas.map((meal: any, mIdx: number) => {
                      const id = `${todayMenu.dayIdx}-${mIdx}`;
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
                            
                            {geminiApiKey && (
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => handleRegenerateSingle(todayMenu.dayIdx, mIdx, meal.nombre, meal.detalles)}
                                  disabled={regeneratingMeals[id]}
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
                            )}
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
              )}
            </div>
          )}
        </section>

        {/* --- DEPORTES / ACTIVIDAD --- */}
        {sports.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-text-main flex items-center gap-2">
                <Flame className="text-orange-500" size={16} /> Actividad Extra
              </h2>
            </div>
            
            <div className="space-y-1.5">
              {sports.map(s => (
                <div key={s.id} className="glass-panel p-2 px-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">{s.nombre_deporte}</p>
                    <p className="text-[9px] text-text-muted">{s.duracion_minutos} min</p>
                  </div>
                  <div className="text-orange-500 font-bold text-xs bg-orange-500/10 px-2 py-0.5 rounded-lg">
                    {s.calorias_quemadas} kcal
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- ENTRENAMIENTO DE HOY --- */}
        {loading ? (
           <div className="flex justify-center items-center py-4">
             <div className="w-5 h-5 rounded-full border-2 border-surface border-t-primary animate-spin" />
           </div>
        ) : dailyWorkout ? (
          <section className="space-y-2">
            <h2 className="text-base font-bold text-text-main flex items-center gap-2 px-1">
              <Dumbbell className="text-primary" size={16} /> Entrenamiento
            </h2>

            <div className="space-y-3">
              <div className="glass-panel border-primary/20 bg-primary/5 p-3 flex justify-between items-center">
                <div>
                  <span className="text-[9px] uppercase font-black text-primary bg-primary/15 px-2 py-0.5 rounded-md">Activo</span>
                  <h3 className="text-sm font-extrabold text-white mt-1">{dailyWorkout.nombre}</h3>
                </div>
              </div>
              
              {ejercicios.map(ej => (
                <ExerciseCard key={ej.id} ejercicio={ej} onSetCompleted={handleSetCompleted} />
              ))}
            </div>
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 opacity-60">
             {(() => {
               const dayName = format(selectedDate, 'EEEE', { locale: es });
               const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
               const isTrainingDay = Array.isArray(user?.dias_entrenamiento) && user.dias_entrenamiento.includes(capitalizedDay);
               
               return isTrainingDay ? (
                 <>
                   <Dumbbell size={28} className="text-primary mb-2" />
                   <p className="text-xs font-bold text-center text-white mb-1">Día de entrenamiento</p>
                   <p className="text-[10px] text-text-muted text-center px-4">Pulsa el botón "+" para añadir una rutina.</p>
                 </>
               ) : (
                 <>
                   <Coffee size={28} className="text-text-muted mb-2" />
                   <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Día de descanso</p>
                 </>
               );
             })()}
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3">
        {isFabOpen && (
          <>
            <button
              onClick={() => { setShowAddWorkout(true); setIsFabOpen(false); }}
              className="flex items-center gap-3 bg-surface border border-border/50 text-white font-bold text-xs py-2 px-4 rounded-full shadow-lg hover:bg-surface-hover animate-in slide-in-from-bottom-1 duration-200"
            >
              <span>Añadir Entrenamiento</span>
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500"><Dumbbell size={14} /></div>
            </button>
            <button
              onClick={() => { setShowAddSport(true); setIsFabOpen(false); }}
              className="flex items-center gap-3 bg-surface border border-border/50 text-white font-bold text-xs py-2 px-4 rounded-full shadow-lg hover:bg-surface-hover animate-in slide-in-from-bottom-2 duration-200"
            >
              <span>Actividad Extra</span>
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500"><Flame size={14} /></div>
            </button>
            <button
              onClick={() => { setShowAddManualCalories(true); setIsFabOpen(false); }}
              className="flex items-center gap-3 bg-surface border border-border/50 text-white font-bold text-xs py-2 px-4 rounded-full shadow-lg hover:bg-surface-hover animate-in slide-in-from-bottom-3 duration-200"
            >
              <span>Calorías Manuales</span>
              <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500"><Activity size={14} /></div>
            </button>
            <button
              onClick={() => { setOpenMealFormTrigger(prev => prev + 1); setIsFabOpen(false); }}
              className="flex items-center gap-3 bg-surface border border-border/50 text-white font-bold text-xs py-2 px-4 rounded-full shadow-lg hover:bg-surface-hover animate-in slide-in-from-bottom-4 duration-200"
            >
              <span>Añadir Comida</span>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary"><Utensils size={14} /></div>
            </button>
          </>
        )}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 ${isFabOpen ? 'bg-surface-hover border border-border/50 rotate-45' : 'bg-primary hover:bg-primary-hover shadow-primary/30 hover:scale-105'}`}
        >
          <Plus size={24} />
        </button>
      </div>

      <FloatingRestTimer isActive={timerActive} onClose={() => setTimerActive(false)} initialTime={currentRestTime} />

      {showAddSport && user && (
        <AddSportModal user={user} date={selectedDate} onClose={() => setShowAddSport(false)} onSportAdded={triggerRefresh} />
      )}
      {showAddManualCalories && user && (
        <AddManualCaloriesModal user={user} date={selectedDate} onClose={() => setShowAddManualCalories(false)} onAdded={triggerRefresh} />
      )}
      {showAddWorkout && user && (
        <AddWorkoutModal user={user} date={selectedDate} onClose={() => setShowAddWorkout(false)} onWorkoutAdded={triggerRefresh} />
      )}
    </div>
  );
}
