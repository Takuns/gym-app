import { useState } from 'react';
import { pb } from '../lib/pocketbase';
import { Dumbbell, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [edad, setEdad] = useState('');
  const [objetivo, setObjetivo] = useState('Mantenimiento');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await pb.collection('usuarios').authWithPassword(email, password);
        onLoginSuccess();
      } else {
        // Register
        const data = {
          email,
          emailVisibility: true,
          password,
          passwordConfirm: password,
          nombre,
          peso_actual: parseFloat(peso) || 70,
          altura: parseFloat(altura) || 170,
          edad: parseInt(edad) || 25,
          objetivo,
          calorias_objetivo: 2000, // Valor base inicial
          tiempo_reposo_general: 90
        };
        await pb.collection('usuarios').create(data);
        // Automatically login after register
        await pb.collection('usuarios').authWithPassword(email, password);
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al autenticar. Revisa tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 pb-12">
      <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <Dumbbell className="text-primary" size={32} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">GymApp</h1>
          <p className="text-text-muted text-sm font-medium">
            {isLogin ? 'Inicia sesión para continuar' : 'Crea tu cuenta para empezar'}
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-panel p-6 space-y-4">
          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {!isLogin && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                  <input 
                    type="text" 
                    placeholder="Tu nombre o apodo" 
                    required 
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    className="w-full bg-surface-hover border border-border/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="Peso (kg)" 
                      required 
                      value={peso}
                      onChange={e => setPeso(e.target.value)}
                      className="w-full bg-surface-hover border border-border/50 rounded-xl py-3 px-4 text-sm text-white placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="Altura (cm)" 
                      required 
                      value={altura}
                      onChange={e => setAltura(e.target.value)}
                      className="w-full bg-surface-hover border border-border/50 rounded-xl py-3 px-4 text-sm text-white placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="Edad" 
                      required 
                      value={edad}
                      onChange={e => setEdad(e.target.value)}
                      className="w-full bg-surface-hover border border-border/50 rounded-xl py-3 px-4 text-sm text-white placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="relative">
                    <select 
                      value={objetivo}
                      onChange={e => setObjetivo(e.target.value)}
                      className="w-full bg-surface-hover border border-border/50 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                    >
                      <option value="Mantenimiento">Mantenimiento</option>
                      <option value="Volumen">Volumen</option>
                      <option value="Definicion">Definición</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input 
                  type="email" 
                  placeholder="Correo electrónico" 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-surface-hover border border-border/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input 
                  type="password" 
                  placeholder="Contraseña" 
                  required 
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-surface-hover border border-border/50 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-surface disabled:text-text-muted text-white text-sm font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Entrar' : 'Comenzar mi viaje'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-border/30 text-center">
            <button 
              type="button" 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-xs text-text-muted hover:text-white transition-colors focus:outline-none cursor-pointer"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
