import { Dumbbell, CalendarDays, User } from 'lucide-react';
import { cn } from './FloatingRestTimer';

interface BottomNavProps {
  currentTab: 'gym' | 'hoy' | 'profile';
  onChange: (tab: 'gym' | 'hoy' | 'profile') => void;
}

export default function BottomNav({ currentTab, onChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 pb-safe">
      <div className="flex items-center justify-around p-2">
        <button
          onClick={() => onChange('gym')}
          className={cn(
            "flex flex-col items-center justify-center w-full py-2 rounded-2xl transition-all duration-300",
            currentTab === 'gym' ? "text-primary" : "text-text-muted hover:text-text-main"
          )}
        >
          <div className={cn(
            "p-1.5 rounded-xl transition-all duration-300",
            currentTab === 'gym' ? "bg-primary/20" : "bg-transparent"
          )}>
            <Dumbbell size={24} />
          </div>
          <span className="text-[11px] font-medium mt-1">Gimnasio</span>
        </button>

        <button
          onClick={() => onChange('hoy')}
          className={cn(
            "flex flex-col items-center justify-center w-full py-2 rounded-2xl transition-all duration-300",
            currentTab === 'hoy' ? "text-primary" : "text-text-muted hover:text-text-main"
          )}
        >
          <div className={cn(
            "p-1.5 rounded-xl transition-all duration-300",
            currentTab === 'hoy' ? "bg-primary/20" : "bg-transparent"
          )}>
            <CalendarDays size={24} />
          </div>
          <span className="text-[11px] font-medium mt-1">Hoy</span>
        </button>

        <button
          onClick={() => onChange('profile')}
          className={cn(
            "flex flex-col items-center justify-center w-full py-2 rounded-2xl transition-all duration-300",
            currentTab === 'profile' ? "text-primary" : "text-text-muted hover:text-text-main"
          )}
        >
          <div className={cn(
            "p-1.5 rounded-xl transition-all duration-300",
            currentTab === 'profile' ? "bg-primary/20" : "bg-transparent"
          )}>
            <User size={24} />
          </div>
          <span className="text-[11px] font-medium mt-1">Perfil</span>
        </button>
      </div>
    </div>
  );
}
