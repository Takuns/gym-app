import { useState, useEffect } from 'react';
import { Calendar, FolderOpen } from 'lucide-react';
import TemplatesModal from './TemplatesModal';
import { pb } from '../lib/pocketbase';

interface GymScreenProps {}

export default function GymScreen({}: GymScreenProps) {
  const [user, setUser] = useState<any>(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Fetch user
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
  }, [refreshTrigger]);

  const toggleTrainingDay = async (day: string) => {
    if (!user) return;
    try {
      let diasActivos: string[] = Array.isArray(user.dias_entrenamiento) ? user.dias_entrenamiento : [];
      if (diasActivos.includes(day)) {
        diasActivos = diasActivos.filter(d => d !== day);
      } else {
        diasActivos.push(day);
      }
      const updatedUser = await pb.collection('usuarios').update(user.id, {
        dias_entrenamiento: diasActivos
      });
      setUser(updatedUser);
    } catch (err) {
      console.error(err);
      alert("Error al actualizar días de entrenamiento.");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Calendar className="text-primary" /> Mi Agenda
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowTemplatesModal(true)}
              className="p-2.5 rounded-xl bg-surface hover:bg-surface-hover border border-border/80 text-text-main hover:text-primary flex items-center justify-center gap-1.5 font-bold text-xs active:scale-95 transition-all cursor-pointer"
              title="Gestionar mis plantillas"
            >
              <FolderOpen size={16} /> Plantillas
            </button>
          </div>
        </div>

        <p className="text-xs text-text-muted leading-relaxed">
          Marca los días de la semana en los que quieres entrenar. Te lo recordaremos en la pestaña "Hoy".
        </p>
      </header>

      <main className="p-4 mt-2 space-y-4">
        {!user ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-surface border-t-primary animate-spin" />
          </div>
        ) : (
          <div className="glass-panel p-4 space-y-4">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              Días de Entrenamiento
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {DIAS_SEMANA.map(dia => {
                const isActive = Array.isArray(user.dias_entrenamiento) && user.dias_entrenamiento.includes(dia);
                return (
                  <button
                    key={dia}
                    onClick={() => toggleTrainingDay(dia)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isActive 
                        ? 'bg-primary/10 border-primary text-white' 
                        : 'bg-surface border-border/50 text-text-muted hover:bg-surface-hover'
                    }`}
                  >
                    <span className="font-bold text-sm capitalize">{dia}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-primary bg-primary' : 'border-border'}`}>
                      {isActive && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {showTemplatesModal && user && (
        <TemplatesModal 
          user={user}
          onClose={() => setShowTemplatesModal(false)}
          onTemplateUpdated={triggerRefresh}
        />
      )}
    </div>
  );
}
