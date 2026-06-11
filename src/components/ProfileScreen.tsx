import { useState, useEffect } from 'react';
import { User, Calculator, Plus, Eye, EyeOff, Check, Sparkles, Bot, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { pb } from '../lib/pocketbase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { analyzeUserPrompt, generateWorkoutWithGemini, generateDietWithGemini } from '../lib/geminiService';

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [nombre, setNombre] = useState('');
  const [genero, setGenero] = useState('Hombre');
  const [edad, setEdad] = useState<number | ''>('');
  const [altura, setAltura] = useState<number | ''>('');
  const [pesoActual, setPesoActual] = useState<number | ''>('');
  const [objetivo, setObjetivo] = useState('Mantenimiento');
  const [caloriasObjetivo, setCaloriasObjetivo] = useState<number | ''>('');
  const [tiempoReposo, setTiempoReposo] = useState<number>(90);
  
  const [geminiKey, setGeminiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [loadingWeight, setLoadingWeight] = useState(true);
  const [saving, setSaving] = useState(false);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStatus, setAiStatus] = useState<'idle' | 'analyzing' | 'routines' | 'diet' | 'done' | 'error'>('idle');
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!pb.authStore.model) return;
        const u = await pb.collection('usuarios').getOne(pb.authStore.model.id);
        setUser(u);
        setNombre(u.nombre || '');
        setGenero(u.genero || 'Hombre');
        setEdad(u.edad || '');
        setAltura(u.altura || '');
        setPesoActual(u.peso_actual || '');
        setObjetivo(u.objetivo || 'Mantenimiento');
        setCaloriasObjetivo(u.calorias_objetivo || '');
        setTiempoReposo(u.tiempo_reposo_general || 90);
      } catch (err) {
        console.error("Error fetching user:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    const savedKey = localStorage.getItem('gemini_api_key') || '';
    setGeminiKey(savedKey);

    const fetchWeightHistory = async () => {
      try {
        const records = await pb.collection('historial_peso').getFullList({
          filter: `usuario = "${user.id}"`,
          sort: '+fecha',
        });

        const data = records.map(r => {
          const dateObj = parseISO(r.fecha);
          return {
            rawDate: r.fecha,
            displayDate: format(dateObj, 'd MMM', { locale: es }),
            peso: r.peso
          };
        });
        setWeightHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingWeight(false);
      }
    };

    fetchWeightHistory();
  }, [user]);

  const handleAddWeight = async () => {
    if (!newWeight || isNaN(Number(newWeight)) || !user) return;
    try {
      const now = new Date().toISOString();
      await pb.collection('historial_peso').create({
        usuario: user.id,
        peso: Number(newWeight),
        fecha: now
      });
      
      await pb.collection('usuarios').update(user.id, {
        peso_actual: Number(newWeight)
      });
      setPesoActual(Number(newWeight));
      setNewWeight('');

      const dateObj = new Date(now);
      setWeightHistory(prev => [...prev, {
        rawDate: now,
        displayDate: format(dateObj, 'd MMM', { locale: es }),
        peso: Number(newWeight)
      }]);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateGoal = () => {
    if (!pesoActual || !altura || !edad) return alert("Completa tu peso, altura y edad primero");
    
    let bmr = (10 * Number(pesoActual)) + (6.25 * Number(altura)) - (5 * Number(edad));
    bmr = genero === 'Hombre' ? bmr + 5 : bmr - 161;
    
    const tdee = bmr * 1.375;
    
    let goal = tdee;
    if (objetivo === 'Perder Peso') goal -= 500;
    else if (objetivo === 'Ganar Masa') goal += 300;
    
    setCaloriasObjetivo(Math.round(goal));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await pb.collection('usuarios').update(user.id, {
        nombre,
        genero,
        edad: Number(edad) || null,
        altura: Number(altura) || null,
        peso_actual: Number(pesoActual) || null,
        objetivo,
        calorias_objetivo: Number(caloriasObjetivo) || null,
        tiempo_reposo_general: Number(tiempoReposo) || 90
      });
      localStorage.setItem('gemini_api_key', geminiKey);
      alert("Perfil guardado con éxito.");
    } catch (err) {
      console.error(err);
      alert("Error al guardar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
  };

  const handleAutoConfig = async () => {
    if (!geminiKey || !aiPrompt.trim() || !user) {
      alert("Por favor, introduce tu API Key y describe lo que quieres.");
      return;
    }
    setAiStatus('analyzing');
    setAiError('');

    try {
      // Step 1: Analyze Profile
      const profileAnalysis = await analyzeUserPrompt(geminiKey, aiPrompt, {
        edad: Number(edad) || null,
        peso_actual: Number(pesoActual) || null,
        altura: Number(altura) || null,
        objetivo: objetivo
      });

      const newEdad = profileAnalysis.edad || Number(edad) || null;
      const newPeso = profileAnalysis.peso || Number(pesoActual) || null;
      const newAltura = profileAnalysis.altura || Number(altura) || null;
      const newObjetivo = profileAnalysis.objetivo || objetivo;
      const newCalorias = profileAnalysis.calorias_objetivo || Number(caloriasObjetivo) || 2500;

      await pb.collection('usuarios').update(user.id, {
        edad: newEdad,
        peso_actual: newPeso,
        altura: newAltura,
        objetivo: newObjetivo,
        calorias_objetivo: newCalorias
      });

      setEdad(newEdad || '');
      setPesoActual(newPeso || '');
      setAltura(newAltura || '');
      setObjetivo(newObjetivo);
      setCaloriasObjetivo(newCalorias);

      // Step 2: Generate Workouts
      setAiStatus('routines');
      const workoutData = await generateWorkoutWithGemini(geminiKey, profileAnalysis.workout_intention, {
        objetivo: newObjetivo,
        peso_actual: newPeso || undefined,
        altura: newAltura || undefined,
        edad: newEdad || undefined
      });

      // Save workouts to PB
      for (const plantilla of workoutData.plantillas) {
        const pRecord = await pb.collection('plantillas_rutinas').create({
          usuario: user.id,
          nombre: plantilla.nombre_plantilla,
          descripcion: "Generada por IA Asesor"
        });

        for (let i = 0; i < plantilla.ejercicios.length; i++) {
          const ej = plantilla.ejercicios[i];
          await pb.collection('ejercicios_plantilla').create({
            plantilla: pRecord.id,
            nombre_ejercicio: ej.nombre,
            series_objetivo: ej.series_objetivo,
            repeticiones_objetivo: ej.repeticiones_objetivo,
            es_tiempo: ej.es_tiempo || false,
            descripcion: ej.descripcion,
            orden: i,
            tiempo_reposo: ej.tiempo_reposo || 90
          });
        }
      }

      // Step 3: Generate Diet
      setAiStatus('diet');
      const dietData = await generateDietWithGemini(geminiKey, {
        nombre: nombre || 'Usuario',
        peso_actual: newPeso || 70,
        altura: newAltura || 170,
        edad: newEdad || 30,
        objetivo: newObjetivo,
        calorias_objetivo: newCalorias
      });

      localStorage.setItem('gemini_diet_plan', JSON.stringify(dietData));

      setAiStatus('done');
      setAiPrompt('');
      setTimeout(() => setAiStatus('idle'), 5000);

    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Error en el asistente IA');
      setAiStatus('error');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-surface border-t-primary animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <main className="p-4 space-y-6">
        
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <User className="text-primary" size={22} /> Perfil & Ajustes
          </h2>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Datos Personales y Físicos</h3>
            <div className="glass-panel p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted font-bold block mb-1">Nombre</label>
                  <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs text-text-muted font-bold block mb-1">Género</label>
                  <select value={genero} onChange={e => setGenero(e.target.value)} className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:border-primary">
                    <option value="Hombre">Hombre</option>
                    <option value="Mujer">Mujer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-text-muted font-bold block mb-1">Edad (años)</label>
                  <input type="number" value={edad} onChange={e => setEdad(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs text-text-muted font-bold block mb-1">Altura (cm)</label>
                  <input type="number" value={altura} onChange={e => setAltura(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:border-primary" />
                </div>
                <div>
                  <label className="text-xs text-text-muted font-bold block mb-1">Peso (kg)</label>
                  <input type="number" value={pesoActual} onChange={e => setPesoActual(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:border-primary" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Objetivos</h3>
            <div className="glass-panel p-4 space-y-4">
              <div>
                <label className="text-xs text-text-muted font-bold block mb-1">Meta Principal</label>
                <select value={objetivo} onChange={e => setObjetivo(e.target.value)} className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:border-primary">
                  <option value="Perder Peso">Perder Peso</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="Ganar Masa">Ganar Masa Muscular</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-text-muted font-bold">Calorías Diarias Objetivo (kcal)</label>
                  <button type="button" onClick={calculateGoal} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                    <Calculator size={12} /> Autocalcular
                  </button>
                </div>
                <input type="number" value={caloriasObjetivo} onChange={e => setCaloriasObjetivo(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm font-bold text-primary focus:border-primary" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Configuración de Entrenamientos</h3>
            <div className="glass-panel p-4">
              <label className="text-xs text-text-muted font-bold block mb-1">Tiempo de Reposo por Defecto (segundos)</label>
              <input type="number" value={tiempoReposo} onChange={e => setTiempoReposo(Number(e.target.value))} className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:border-primary" />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Inteligencia Artificial</h3>
            <div className="glass-panel p-4 space-y-3">
              <div>
                <label className="text-xs text-text-muted font-bold block mb-1">Google Gemini API Key</label>
                <div className="relative">
                  <input type={showKey ? "text" : "password"} value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIzaSy..." className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm pr-10 focus:border-primary" />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white">
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted text-primary">Asesor IA / Configuración Automática</h3>
            <div className="glass-panel p-4 space-y-4 border border-primary/30 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              
              <div className="flex gap-3 items-start">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Bot size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-text-muted leading-relaxed">
                    <strong>Cuéntame tu situación</strong> (edad, peso, material en casa, días de gimnasio, objetivos) y configuraré tus rutinas y tu dieta automáticamente en un solo paso.
                  </p>
                </div>
              </div>
              
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Ej: Tengo 42 años, peso 71kg, trabajo en oficina y quiero ponerme en forma. Puedo ir al gimnasio 2 días y tengo un TRX y pesas en casa..."
                className="w-full bg-black/30 border border-border/50 rounded-xl px-4 py-3 text-sm focus:border-primary min-h-[120px] resize-y"
                disabled={aiStatus !== 'idle' && aiStatus !== 'error' && aiStatus !== 'done'}
              />

              {aiStatus === 'idle' || aiStatus === 'error' || aiStatus === 'done' ? (
                <button
                  onClick={handleAutoConfig}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-[0.99] transition-all text-sm"
                >
                  <Sparkles size={18} /> Analizar y Configurar App
                </button>
              ) : (
                <div className="w-full py-4 bg-surface border border-border/50 rounded-xl flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-primary" size={24} />
                  <p className="text-xs font-bold text-text-muted">
                    {aiStatus === 'analyzing' && "Paso 1/3: Analizando perfil y objetivos..."}
                    {aiStatus === 'routines' && "Paso 2/3: Creando rutinas personalizadas..."}
                    {aiStatus === 'diet' && "Paso 3/3: Generando dieta semanal..."}
                  </p>
                </div>
              )}

              {aiStatus === 'error' && (
                <p className="text-xs text-rose-400 font-bold text-center mt-2 bg-rose-500/10 p-2 rounded-lg">{aiError}</p>
              )}
              
              {aiStatus === 'done' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex flex-col items-center gap-1 mt-2 animate-in fade-in zoom-in duration-300">
                  <Check className="text-emerald-400" size={24} />
                  <p className="text-sm font-bold text-emerald-400">¡Aplicación Configurada!</p>
                  <p className="text-[10px] text-text-muted text-center">Tus rutinas y dieta están listas en sus pestañas correspondientes.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Progreso de Peso</h3>
            <div className="glass-panel p-4">
              <div className="flex gap-2 mb-4">
                <input type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="Ej: 75.5 kg" className="flex-1 bg-surface border border-border/50 rounded-xl px-3 py-2 text-sm focus:border-primary" />
                <button type="button" onClick={handleAddWeight} className="bg-primary hover:bg-primary-hover text-white px-3 rounded-xl transition-all">
                  <Plus size={18} />
                </button>
              </div>

              {loadingWeight ? (
                <div className="h-40 flex items-center justify-center text-text-muted text-sm animate-pulse">Cargando progreso...</div>
              ) : weightHistory.length > 0 ? (
                <div className="h-40 mt-4 -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="displayDate" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={30} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1d24', border: '1px solid #ffffff20', borderRadius: '12px', fontSize: '12px' }} itemStyle={{ color: '#00e5ff', fontWeight: 'bold' }} />
                      <Line type="monotone" dataKey="peso" stroke="#00e5ff" strokeWidth={3} dot={{ r: 4, fill: '#00e5ff', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#fff' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-32 flex flex-col items-center justify-center text-text-muted text-sm border border-dashed border-border/40 rounded-xl bg-surface/50">
                  No hay datos de peso.
                </div>
              )}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full bg-primary hover:bg-primary-hover text-white font-extrabold text-sm py-4 rounded-2xl flex items-center justify-center gap-2 mt-4 transition-all">
            {saving ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <><Check size={18} /> Guardar Perfil</>}
          </button>

          <button onClick={handleLogout} className="w-full bg-surface border border-danger/30 text-danger hover:bg-danger/10 font-bold text-sm py-4 rounded-2xl flex items-center justify-center gap-2 mt-4 transition-all">
            Cerrar Sesión
          </button>
        </div>
      </main>
    </div>
  );
}
