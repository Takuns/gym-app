import { useState, useEffect } from 'react';
import { User, Calculator, Plus, Eye, EyeOff, Check, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { pb } from '../lib/pocketbase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

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

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

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

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !newPasswordConfirm) {
      setPasswordError('Rellena todos los campos');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
      if (!user) throw new Error("No estás autenticado");
      await pb.collection('usuarios').update(user.id, {
        oldPassword: oldPassword,
        password: newPassword,
        passwordConfirm: newPasswordConfirm
      });
      setPasswordSuccess('Contraseña actualizada correctamente');
      setOldPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (e: any) {
      console.error(e);
      setPasswordError(e.message || 'Error al actualizar la contraseña');
    } finally {
      setChangingPassword(false);
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Cambiar Contraseña</h3>
            <div className="glass-panel p-4 space-y-3 border border-primary/20">
              <div>
                <label className="text-xs text-text-muted font-bold block mb-1">Contraseña Actual</label>
                <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-text-muted font-bold block mb-1">Nueva Contraseña</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:border-primary" />
              </div>
              <div>
                <label className="text-xs text-text-muted font-bold block mb-1">Confirmar Nueva Contraseña</label>
                <input type="password" value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)} className="w-full bg-surface border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:border-primary" />
              </div>
              
              {passwordError && <p className="text-[10px] text-rose-400 font-bold bg-rose-500/10 p-2 rounded-lg">{passwordError}</p>}
              {passwordSuccess && <p className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 p-2 rounded-lg">{passwordSuccess}</p>}
              
              <button onClick={handleChangePassword} disabled={changingPassword} className="w-full bg-surface-hover hover:bg-surface border border-border text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                {changingPassword ? <Loader2 size={16} className="animate-spin" /> : "Actualizar Contraseña"}
              </button>
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
