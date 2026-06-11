import { useState, useEffect } from 'react';
import { Calendar, Plus, FolderOpen, CalendarPlus, X, Image as ImageIcon } from 'lucide-react';
import TemplatesModal from './TemplatesModal';
import { pb } from '../lib/pocketbase';

interface GymScreenProps {}

export default function GymScreen({}: GymScreenProps) {
  const [user, setUser] = useState<any>(null);
  const [plantillas, setPlantillas] = useState<any[]>([]);
  const [ejerciciosMap, setEjerciciosMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Selector modal
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);

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
  }, []);

  // Fetch plantillas
  useEffect(() => {
    const fetchPlantillas = async () => {
      setLoading(true);
      try {
        const records = await pb.collection('plantillas_rutinas').getFullList({
          sort: '-created',
        });
        setPlantillas(records);

        if (records.length > 0) {
          const filterQuery = records.map(r => `plantilla = "${r.id}"`).join(' || ');
          const ejerciciosRecords = await pb.collection('ejercicios_plantilla').getFullList({
            filter: filterQuery,
            sort: 'orden,created'
          });

          const map: Record<string, any[]> = {};
          ejerciciosRecords.forEach(ej => {
            if (!map[ej.plantilla]) {
              map[ej.plantilla] = [];
            }
            map[ej.plantilla].push(ej);
          });
          setEjerciciosMap(map);
        } else {
          setEjerciciosMap({});
        }
      } catch (err) {
        console.error('Error fetching plantillas', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlantillas();
  }, [refreshTrigger]);

  const toggleDayForTemplate = async (plantillaId: string, day: string, action: 'add' | 'remove') => {
    try {
      const plantilla = plantillas.find(p => p.id === plantillaId);
      if (!plantilla) return;
      
      let diasActivos: string[] = Array.isArray(plantilla.dias_semana) ? plantilla.dias_semana : [];
      
      if (action === 'add' && !diasActivos.includes(day)) {
        diasActivos.push(day);
      } else if (action === 'remove') {
        diasActivos = diasActivos.filter(d => d !== day);
      }

      await pb.collection('plantillas_rutinas').update(plantillaId, {
        dias_semana: diasActivos
      });
      
      triggerRefresh();
      setShowAssignModal(null);
    } catch (err) {
      console.error(err);
      alert("Error al actualizar la agenda.");
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
          Asigna tus plantillas de entrenamiento a los días de la semana. Se activarán automáticamente en la pestaña "Hoy".
        </p>
      </header>

      <main className="p-4 mt-2 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-surface border-t-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {DIAS_SEMANA.map(dia => {
              const plantillasDelDia = plantillas.filter(p => {
                const dias = Array.isArray(p.dias_semana) ? p.dias_semana : [];
                return dias.includes(dia);
              });

              return (
                <div key={dia} className="glass-panel p-4 overflow-hidden relative group">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-white text-lg capitalize">{dia}</h3>
                    <button 
                      onClick={() => setShowAssignModal(dia)}
                      className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                      title={`Asignar rutina el ${dia}`}
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {plantillasDelDia.length > 0 && (
                    <div className="space-y-2">
                      {plantillasDelDia.map(p => (
                        <div key={p.id} className="bg-surface border border-border/40 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-text-main">{p.nombre}</span>
                            <button 
                              onClick={() => toggleDayForTemplate(p.id, dia, 'remove')}
                              className="p-1 text-text-muted hover:text-danger transition-colors"
                              title="Quitar de este día"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          
                          {/* Miniaturas de ejercicios */}
                          {ejerciciosMap[p.id] && ejerciciosMap[p.id].length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {ejerciciosMap[p.id].map(ej => (
                                <div 
                                  key={ej.id} 
                                  className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center shrink-0 border border-border/30"
                                  title={ej.nombre}
                                >
                                  {ej.imagen_url ? (
                                    <img src={ej.imagen_url} alt={ej.nombre} className="w-full h-full object-cover" />
                                  ) : (
                                    <ImageIcon size={14} className="text-text-muted/40" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
      {/* Select Template Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-hover w-full max-w-sm rounded-3xl border border-border/50 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border/50 flex items-center justify-between bg-surface/50">
              <h3 className="font-bold text-white flex items-center gap-2">
                <CalendarPlus className="text-primary" size={20} />
                Rutinas para {showAssignModal}
              </h3>
              <button onClick={() => setShowAssignModal(null)} className="text-text-muted hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {plantillas.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-4">No tienes plantillas creadas.</p>
              ) : (
                plantillas.map(p => {
                  const isActive = Array.isArray(p.dias_semana) && p.dias_semana.includes(showAssignModal);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleDayForTemplate(p.id, showAssignModal, 'add')}
                      disabled={isActive}
                      className={`w-full text-left px-4 py-3 rounded-xl border ${isActive ? 'border-primary bg-primary/10 opacity-50 cursor-not-allowed' : 'border-border/50 bg-surface hover:border-primary/50'}`}
                    >
                      <div className="font-bold text-sm text-white">{p.nombre}</div>
                      {isActive && <div className="text-[10px] text-primary mt-1">Ya asignada a este día</div>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
