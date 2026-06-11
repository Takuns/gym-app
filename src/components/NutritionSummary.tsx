import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import { Flame, Beef, Wheat, Droplet } from 'lucide-react';
import { cn } from './FloatingRestTimer';
import { format } from 'date-fns';

interface NutritionSummaryProps {
  user: any;
  selectedDate: Date;
}

export default function NutritionSummary({ user, selectedDate }: NutritionSummaryProps) {
  const [consumed, setConsumed] = useState({ kcal: 0, prot: 0, carb: 0, fat: 0 });

  useEffect(() => {
    const fetchTodayMeals = async () => {
      try {
        const startOfDay = format(selectedDate, 'yyyy-MM-dd') + ' 00:00:00.000Z';
        const endOfDay = format(selectedDate, 'yyyy-MM-dd') + ' 23:59:59.999Z';
        const records = await pb.collection('comidas_diarias').getFullList({
          filter: `usuario = "${user.id}" && fecha >= "${startOfDay}" && fecha <= "${endOfDay}"`,
        });

        const sum = records.reduce((acc, curr) => ({
          kcal: acc.kcal + (curr.calorias || 0),
          prot: acc.prot + (curr.proteinas || 0),
          carb: acc.carb + (curr.carbohidratos || 0),
          fat: acc.fat + (curr.grasas || 0),
        }), { kcal: 0, prot: 0, carb: 0, fat: 0 });

        setConsumed(sum);
      } catch (err) {
        console.error("Error fetching today meals:", err);
      }
    };
    
    fetchTodayMeals();

    // Subscribe to realtime updates for this user's meals today
    pb.collection('comidas_diarias').subscribe('*', function (e) {
      if (e.record.usuario === user.id) {
        // Simple re-fetch on any change
        fetchTodayMeals();
      }
    });

    return () => {
      pb.collection('comidas_diarias').unsubscribe('*');
    };
  }, [user.id, selectedDate]);

  // Calcular macros objetivos
  const calcMacros = () => {
    const cal = user.calorias_objetivo || 2500;
    let pPct = 0.30, cPct = 0.40, fPct = 0.30; // Mantenimiento por defecto

    if (user.objetivo?.toLowerCase() === 'volumen') {
      pPct = 0.30; cPct = 0.50; fPct = 0.20;
    } else if (user.objetivo?.toLowerCase() === 'definicion' || user.objetivo?.toLowerCase() === 'definición') {
      pPct = 0.40; cPct = 0.30; fPct = 0.30;
    }

    return {
      prot: Math.round((cal * pPct) / 4),
      carb: Math.round((cal * cPct) / 4),
      fat: Math.round((cal * fPct) / 9),
      kcal: cal
    };
  };

  const target = calcMacros();

  const ProgressBar = ({ label, current, max, textColor, bgColor, icon: Icon }: any) => {
    const percentage = Math.min(Math.round((current / max) * 100), 100) || 0;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center text-xs">
          <span className={`flex items-center gap-1 font-bold text-text-muted`}>
            <Icon size={12} className={textColor} /> {label}
          </span>
          <span className="font-medium text-text-main tabular-nums">
            {Math.round(current)} / {max}g
          </span>
        </div>
        <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-700 ease-out", bgColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel p-5 mb-6">
      <div className="flex items-end justify-between mb-6 border-b border-border/50 pb-4">
        <div>
          <p className="text-sm font-bold text-text-muted uppercase tracking-wider mb-1">Calorías Hoy</p>
          <p className="text-4xl font-black tabular-nums tracking-tighter text-white">
            {Math.round(consumed.kcal)}
            <span className="text-xl text-text-muted font-medium ml-1">/ {target.kcal}</span>
          </p>
        </div>
        <div className={cn(
          "px-3 py-1.5 rounded-xl font-bold text-sm border flex items-center gap-1.5",
          consumed.kcal > target.kcal ? "bg-danger/10 text-danger border-danger/20" : "bg-success/10 text-success border-success/20"
        )}>
          <Flame size={16} />
          {consumed.kcal > target.kcal ? "Límite superado" : "En objetivo"}
        </div>
      </div>

      <div className="space-y-4">
        <ProgressBar label="Proteínas" current={consumed.prot} max={target.prot} textColor="text-blue-500" bgColor="bg-blue-500" icon={Beef} />
        <ProgressBar label="Carbohidratos" current={consumed.carb} max={target.carb} textColor="text-amber-500" bgColor="bg-amber-500" icon={Wheat} />
        <ProgressBar label="Grasas" current={consumed.fat} max={target.fat} textColor="text-rose-500" bgColor="bg-rose-500" icon={Droplet} />
      </div>
    </div>
  );
}
