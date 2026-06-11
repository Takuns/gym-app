import { useState, useEffect } from 'react';
import { X, TrendingUp, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { pb } from '../lib/pocketbase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExerciseDetailsModalProps {
  ejercicio: {
    id: string;
    nombre: string;
    descripcion?: string;
    es_tiempo: boolean;
    imagen_url?: string;
  };
  onClose: () => void;
}

function getExerciseImage(nombre: string): string {
  const n = nombre.toLowerCase();
  
  // Peso muerto / Deadlift
  if (n.includes('muerto') || n.includes('deadlift') || n.includes('lumbar') || n.includes('hiperext')) {
    return 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=500&q=80'; 
  }
  // Glúteos / Cadera
  if (n.includes('glute') || n.includes('glúte') || n.includes('hip thrust') || n.includes('puente')) {
    return 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=500&q=80';
  }
  // Pecho / Pectorales
  if (n.includes('banca') || n.includes('pecho') || n.includes('chest') || n.includes('apertura') || n.includes('pres') || n.includes('flexi') || n.includes('pushup') || n.includes('fondos chest')) {
    return 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=500&q=80';
  }
  // Piernas / Sentadillas / Cuádriceps / Calves
  if (n.includes('sentadilla') || n.includes('pierna') || n.includes('squat') || n.includes('prensa') || n.includes('zancada') || n.includes('femoral') || n.includes('gemelo') || n.includes('leg') || n.includes('pantorrilla') || n.includes('quad')) {
    return 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=500&q=80';
  }
  // Bíceps
  if (n.includes('biceps') || n.includes('bíceps') || n.includes('curl') || n.includes('brazo')) {
    return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=500&q=80';
  }
  // Tríceps / Fondos
  if (n.includes('triceps') || n.includes('tríceps') || n.includes('fondos') || n.includes('dips') || n.includes('frances') || n.includes('francés')) {
    return 'https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?auto=format&fit=crop&w=500&q=80';
  }
  // Espalda
  if (n.includes('espalda') || n.includes('dominada') || n.includes('pullup') || n.includes('remo') || n.includes('jalon') || n.includes('jalón') || n.includes('back') || n.includes('pull down')) {
    return 'https://images.unsplash.com/photo-1603287638342-437dba827917?auto=format&fit=crop&w=500&q=80';
  }
  // Abdomen / Core
  if (n.includes('plancha') || n.includes('abdominal') || n.includes('abs') || n.includes('core') || n.includes('crunch') || n.includes('rueda')) {
    return 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=500&q=80';
  }
  // Hombro
  if (n.includes('hombro') || n.includes('shoulder') || n.includes('militar') || n.includes('pajaro') || n.includes('pájaro') || n.includes('elevacion') || n.includes('elevación') || n.includes('lateral')) {
    return 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=500&q=80';
  }
  // Cardio
  if (n.includes('cardio') || n.includes('correr') || n.includes('cinta') || n.includes('run') || n.includes('bici') || n.includes('comba') || n.includes('eliptica') || n.includes('elíptica')) {
    return 'https://images.unsplash.com/photo-1502904580116-c667104be94b?auto=format&fit=crop&w=500&q=80';
  }
  return 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=500&q=80';
}

export default function ExerciseDetailsModal({ ejercicio, onClose }: ExerciseDetailsModalProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const records = await pb.collection('historial_series').getFullList({
          filter: `ejercicio = "${ejercicio.id}" && completado = true`,
          sort: '+created',
        });

        // Agrupar por fecha y obtener el máximo valor
        const agg: Record<string, number> = {};
        records.forEach(r => {
          // PB date format: "2023-10-25 10:00:00.000Z"
          const dateStr = r.created.split(' ')[0];
          const val = ejercicio.es_tiempo ? r.tiempo_logrado : r.peso_real;
          
          if (val) {
            if (!agg[dateStr] || val > agg[dateStr]) {
              agg[dateStr] = val;
            }
          }
        });

        const data = Object.keys(agg).map(dateStr => {
          const dateObj = parseISO(dateStr);
          return {
            rawDate: dateStr,
            displayDate: format(dateObj, 'd MMM', { locale: es }),
            valor: agg[dateStr]
          };
        });

        setChartData(data);
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [ejercicio.id, ejercicio.es_tiempo]);

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background w-full sm:w-[500px] h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl border-t sm:border border-border/50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-surface/50">
          <h2 className="text-xl font-bold text-text-main line-clamp-1 pr-4">{ejercicio.nombre}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-hover text-text-muted transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 pb-10">
          
          {/* Imagen de Unsplash Automática o Personalizada */}
          <div className="w-full aspect-video bg-surface rounded-2xl border border-border/50 mb-6 overflow-hidden relative group shadow-md shadow-black/10">
            <img 
              src={ejercicio.imagen_url || getExerciseImage(ejercicio.nombre)} 
              alt={ejercicio.nombre}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
              <Info size={16} /> Técnica Correcta
            </h3>
            <div className="p-4 rounded-2xl bg-surface border border-border/50 text-text-main leading-relaxed text-sm">
              {ejercicio.descripcion ? ejercicio.descripcion : "No hay descripción disponible para este ejercicio."}
            </div>
          </div>

          {/* Chart */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4 flex items-center gap-2">
              <TrendingUp size={16} /> Evolución del Rendimiento
            </h3>
            
            <div className="h-[250px] w-full bg-surface border border-border/50 rounded-2xl p-4 pt-6">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-4 border-surface border-t-primary animate-spin" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="displayDate" 
                      stroke="#94a3b8" 
                      fontSize={12} 
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={12} 
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                      tickFormatter={(val) => ejercicio.es_tiempo ? `${val}s` : `${val}kg`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc' }}
                      itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                      formatter={(value: any) => [
                        ejercicio.es_tiempo ? `${value} segundos` : `${value} kg`, 
                        'Máximo'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="valor" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#60a5fa', stroke: '#1e3a8a', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted text-sm text-center px-4">
                  No hay datos suficientes para generar la gráfica. Completa el ejercicio para ver tu evolución.
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
