import { useState, useEffect } from 'react';
import { X, TrendingUp, User, Key, Calculator, Plus, Eye, EyeOff, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { pb } from '../lib/pocketbase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from './FloatingRestTimer';

interface ProfileModalProps {
  user: any;
  onClose: () => void;
  onSave: (updatedUser: any) => void;
}

export default function ProfileModal({ user, onClose, onSave }: ProfileModalProps) {
  const [nombre, setNombre] = useState(user.nombre || '');
  const [genero, setGenero] = useState(user.genero || 'Hombre');
  const [edad, setEdad] = useState<number | ''>(user.edad || '');
  const [altura, setAltura] = useState<number | ''>(user.altura || '');
  const [pesoActual, setPesoActual] = useState<number | ''>(user.peso_actual || '');
  const [objetivo, setObjetivo] = useState(user.objetivo || 'Mantenimiento');
  const [caloriasObjetivo, setCaloriasObjetivo] = useState<number | ''>(user.calorias_objetivo || '');
  const [tiempoReposo, setTiempoReposo] = useState<number>(user.tiempo_reposo_general || 90);
  
  const [geminiKey, setGeminiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [loadingWeight, setLoadingWeight] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weightMessage, setWeightMessage] = useState('');

  // Cargar clave de Gemini e historial de peso
  useEffect(() => {
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
        console.error('Error fetching weight history:', err);
      } finally {
        setLoadingWeight(false);
      }
    };

    fetchWeightHistory();
  }, [user.id]);

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Calcular calorías con Harris-Benedict
  const handleAutoCalculate = () => {
    if (!pesoActual || !altura || !edad) {
      alert("Por favor rellena peso, altura y edad para calcular las calorías automáticamente.");
      return;
    }

    // TMB (Fórmula Mifflin-St Jeor)
    let bmr = (10 * Number(pesoActual)) + (6.25 * Number(altura)) - (5 * Number(edad));
    if (genero === 'Hombre') {
      bmr += 5;
    } else {
      bmr -= 161;
    }

    // Factor de actividad moderada (~3-5 entrenamientos semanales)
    let totalKcal = Math.round(bmr * 1.375);

    // Ajuste según objetivo
    if (objetivo.toLowerCase() === 'volumen') {
      totalKcal += 400;
    } else if (objetivo.toLowerCase() === 'definicion' || objetivo.toLowerCase() === 'definición') {
      totalKcal -= 400;
    }

    setCaloriasObjetivo(totalKcal);
  };

  // Registrar un peso de forma manual en el historial
  const handleAddWeightRecord = async () => {
    if (!newWeight || isNaN(Number(newWeight))) {
      alert("Introduce un peso válido.");
      return;
    }

    const weightVal = parseFloat(newWeight);
    try {
      const todayStr = new Date().toISOString();
      await pb.collection('historial_peso').create({
        usuario: user.id,
        peso: weightVal,
        fecha: todayStr
      });

      // Actualizar peso actual local
      setPesoActual(weightVal);

      // Agregar a la gráfica localmente
      const dateObj = parseISO(todayStr);
      setWeightHistory(prev => [
        ...prev,
        {
          rawDate: todayStr,
          displayDate: format(dateObj, 'd MMM', { locale: es }),
          peso: weightVal
        }
      ]);

      setNewWeight('');
      setWeightMessage('¡Peso registrado con éxito!');
      setTimeout(() => setWeightMessage(''), 3000);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el peso en la base de datos.");
    }
  };

  // Guardar todos los cambios
  const handleSave = async () => {
    if (!nombre) {
      alert("El nombre es requerido.");
      return;
    }

    setSaving(true);
    try {
      // Guardar clave API en localStorage
      localStorage.setItem('gemini_api_key', geminiKey.trim());

      const dataToUpdate: any = {
        nombre,
        genero,
        objetivo,
        calorias_objetivo: caloriasObjetivo ? Number(caloriasObjetivo) : 0,
        tiempo_reposo_general: tiempoReposo,
      };

      if (pesoActual) dataToUpdate.peso_actual = Number(pesoActual);
      if (altura) dataToUpdate.altura = Number(altura);
      if (edad) dataToUpdate.edad = Number(edad);

      // Si el peso actual difiere de lo inicial de la base de datos, agregamos registro al historial
      if (Number(pesoActual) !== Number(user.peso_actual)) {
        await pb.collection('historial_peso').create({
          usuario: user.id,
          peso: Number(pesoActual),
          fecha: new Date().toISOString()
        });
      }

      const updatedUser = await pb.collection('usuarios').update(user.id, dataToUpdate);
      onSave(updatedUser);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error al guardar los cambios en la base de datos.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f1115] w-full sm:w-[540px] h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl border-t sm:border border-border/60 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-surface/50">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <User className="text-primary" size={22} /> Perfil & Ajustes
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-hover text-text-muted transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-20">
          
          {/* Datos Físicos */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              Datos Personales y Físicos
            </h3>
            <div className="glass-panel p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted font-bold block mb-1">Nombre</label>
                  <input 
                    type="text" 
                    value={nombre} 
                    onChange={e => setNombre(e.target.value)}
                    className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted font-bold block mb-1">Género</label>
                  <select 
                    value={genero} 
                    onChange={e => setGenero(e.target.value)}
                    className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="Hombre">Hombre</option>
                    <option value="Mujer">Mujer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-text-muted font-bold block mb-1">Edad (años)</label>
                  <input 
                    type="number" 
                    value={edad} 
                    onChange={e => setEdad(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted font-bold block mb-1">Altura (cm)</label>
                  <input 
                    type="number" 
                    value={altura} 
                    onChange={e => setAltura(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted font-bold block mb-1">Peso (kg)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={pesoActual} 
                    onChange={e => setPesoActual(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-text-muted font-bold block mb-1">Objetivo Físico</label>
                <div className="flex bg-surface-hover p-1 rounded-xl gap-1">
                  {['Volumen', 'Definición', 'Mantenimiento'].map(obj => (
                    <button
                      key={obj}
                      type="button"
                      onClick={() => setObjetivo(obj)}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                        objetivo === obj 
                          ? "bg-primary text-white shadow-md shadow-primary/20" 
                          : "text-text-muted hover:text-text-main"
                      )}
                    >
                      {obj}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Nutrición y Calorías */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Objetivo de Calorías
              </h3>
              <button
                type="button"
                onClick={handleAutoCalculate}
                className="text-xs text-primary font-bold hover:text-primary-hover flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 transition-all active:scale-95"
              >
                <Calculator size={14} /> Calcular TMB
              </button>
            </div>
            
            <div className="glass-panel p-4 space-y-4">
              <div>
                <label className="text-xs text-text-muted font-bold block mb-1">Calorías Diarias Objetivo (kcal)</label>
                <input 
                  type="number" 
                  value={caloriasObjetivo} 
                  onChange={e => setCaloriasObjetivo(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ej: 2500"
                  className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm text-text-main font-bold focus:outline-none focus:border-primary transition-colors"
                />
                <p className="text-[10px] text-text-muted mt-1.5 leading-tight">
                  Calculado usando la fórmula de Mifflin-St Jeor (Tasa Metabólica Basal) adaptada a tu objetivo de {objetivo.toLowerCase()} (+400 kcal para volumen, -400 kcal para definición).
                </p>
              </div>
            </div>
          </div>

          {/* Ajustes de Entrenamiento */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              Ajustes de Entrenamiento
            </h3>
            <div className="glass-panel p-4 space-y-4">
              <div>
                <label className="text-xs text-text-muted font-bold block mb-1">Tiempo de Reposo General (segundos)</label>
                <input 
                  type="number" 
                  value={tiempoReposo} 
                  onChange={e => setTiempoReposo(Number(e.target.value))}
                  className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary transition-colors"
                />
                <p className="text-[10px] text-text-muted mt-1.5 leading-tight">
                  Tiempo de descanso predeterminado entre series. Podrás ajustarlo para cada ejercicio individualmente.
                </p>
              </div>
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Key size={14} /> Clave API de Google Gemini (IA)
            </h3>
            <div className="glass-panel p-4 space-y-2">
              <div className="relative">
                <input 
                  type={showKey ? "text" : "password"} 
                  value={geminiKey} 
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="Introduce tu API Key de Gemini..."
                  className="w-full bg-surface border border-border/50 rounded-xl pl-4 pr-11 py-2.5 text-xs text-text-main focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-text-muted leading-tight">
                Requerido para generar sugerencias de dieta 100% personalizadas con IA. La clave se almacena de forma segura de forma local en tu propio navegador.
              </p>
            </div>
          </div>

          {/* Evolución de Peso */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <TrendingUp size={14} /> Evolución del Peso
            </h3>
            
            <div className="glass-panel p-4 space-y-4">
              {/* Registro Rápido */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="Registrar peso (kg)..."
                    value={newWeight}
                    onChange={e => setNewWeight(e.target.value)}
                    className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2 text-xs text-text-main focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddWeightRecord}
                  className="bg-surface hover:bg-surface-hover active:bg-surface-active border border-border rounded-xl px-4 py-2 text-xs font-bold text-text-main flex items-center gap-1 active:scale-[0.98] transition-all"
                >
                  <Plus size={14} /> Registrar
                </button>
              </div>

              {weightMessage && (
                <div className="text-xs text-success flex items-center gap-1 font-bold animate-pulse">
                  <Check size={14} /> {weightMessage}
                </div>
              )}

              {/* Gráfica de peso */}
              <div className="h-[180px] w-full bg-black/10 border border-border/30 rounded-xl p-2 pt-4">
                {loadingWeight ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-surface border-t-primary animate-spin" />
                  </div>
                ) : weightHistory.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis 
                        dataKey="displayDate" 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                        dy={6}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                        domain={['dataMin - 1', 'dataMax + 1']}
                        dx={-6}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '10px', color: '#f8fafc', fontSize: 11 }}
                        itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                        formatter={(val: any) => [`${val} kg`, 'Peso']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="peso" 
                        stroke="#3b82f6" 
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#60a5fa', stroke: '#1e3a8a', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted text-[11px] text-center px-4">
                    Registra tu peso en diferentes días para ver la gráfica de tu evolución.
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-[#0c0d10] flex gap-3">
          <button 
            onClick={onClose} 
            disabled={saving}
            className="flex-1 py-3 bg-surface hover:bg-surface-hover border border-border/60 rounded-xl font-bold text-sm text-text-muted hover:text-text-main transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex-1 py-3 bg-primary text-white hover:bg-primary-hover rounded-xl font-bold text-sm shadow-lg shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            {saving ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            ) : "Guardar Ajustes"}
          </button>
        </div>

      </div>
    </div>
  );
}
