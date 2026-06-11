import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  subWeeks
} from 'date-fns';
import { es } from 'date-fns/locale';

interface CalendarWidgetProps {
  selectedDate: Date;
  onChangeDate: (date: Date) => void;
  workoutDates: string[]; // Formato YYYY-MM-DD
  calendarData?: Record<string, { status: 'met' | 'short' | 'over' | 'none' }>;
}

export default function CalendarWidget({ selectedDate, onChangeDate, workoutDates, calendarData }: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));
  const [isExpanded, setIsExpanded] = useState(false);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Determine date range to show
  const startDate = isExpanded 
    ? startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 })
    : startOfWeek(subWeeks(selectedDate, 1), { weekStartsOn: 1 });
    
  const endDate = isExpanded
    ? endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
    : endOfWeek(selectedDate, { weekStartsOn: 1 });

  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";

  const displayMonth = isExpanded ? currentMonth : selectedDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      const dateString = format(day, 'yyyy-MM-dd');
      const hasWorkout = workoutDates.includes(dateString);
      const calStatus = calendarData?.[dateString]?.status || 'none';
      const isSelected = isSameDay(day, selectedDate);
      const isCurrentMonth = isSameMonth(day, displayMonth);
      const isToday = isSameDay(day, new Date());

      let numberClass = '';
      let bgClass = '';
      
      if (!isSelected && (isCurrentMonth || !isExpanded)) {
        const dietGood = (calStatus === 'met');
        const exerciseDone = hasWorkout;

        if (dietGood && exerciseDone) {
          numberClass = 'text-transparent bg-clip-text bg-gradient-to-br from-success to-primary font-black';
          bgClass = 'bg-primary/10 border border-primary/30 shadow-sm';
        } else if (dietGood) {
          numberClass = 'text-success font-bold';
          bgClass = 'bg-success/10 border border-success/20';
        } else if (exerciseDone) {
          numberClass = 'text-primary font-bold';
          bgClass = 'bg-primary/10 border border-primary/20';
        } else if (calStatus === 'short') {
          numberClass = 'text-amber-400 font-bold';
          bgClass = 'bg-amber-500/10 border border-amber-500/20';
        } else if (calStatus === 'over') {
          numberClass = 'text-danger font-bold';
          bgClass = 'bg-danger/10 border border-danger/20';
        }
      }

      if (isSelected) {
        numberClass = 'text-white font-black';
        bgClass = 'bg-primary shadow-lg shadow-primary/30';
      } else if (!isCurrentMonth && isExpanded) {
        numberClass = 'text-text-muted/30';
      } else if (isToday && !isSelected && !bgClass) {
         bgClass = 'border border-primary/50';
         numberClass = 'text-primary font-bold';
      }

      if (!numberClass) numberClass = 'text-text-main';
      if (!bgClass && !isSelected && !isToday) bgClass = 'hover:bg-surface-hover';

      days.push(
        <div
          key={day.toISOString()}
          onClick={() => onChangeDate(cloneDay)}
          className={`relative p-2 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 rounded-2xl h-12 w-full ${bgClass}`}
        >
          <span className={`text-sm z-10 ${numberClass}`}>{formattedDate}</span>
          <div className="flex gap-1 absolute bottom-1.5 justify-center items-center">
            {hasWorkout && (
              <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
            )}
            {calStatus !== 'none' && (
              <div className={`w-1 h-1 rounded-full ${
                calStatus === 'met'
                  ? (isSelected ? 'bg-white' : 'bg-success')
                  : calStatus === 'short'
                  ? (isSelected ? 'bg-white/80' : 'bg-amber-400')
                  : (isSelected ? 'bg-white/60' : 'bg-danger')
              }`} />
            )}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7 gap-1" key={day.toISOString()}>
        {days}
      </div>
    );
    days = [];
  }

  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <div className="bg-surface/80 backdrop-blur-md rounded-3xl p-4 border border-border/50 shadow-xl w-full">
      <div className="flex items-center justify-between mb-4 px-2">
        {isExpanded ? (
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-surface-hover transition-colors text-text-muted hover:text-text-main">
            <ChevronLeft size={20} />
          </button>
        ) : <div className="w-9" />}
        <span className="text-sm font-black capitalize tracking-wide text-text-main">
          {format(displayMonth, 'MMMM yyyy', { locale: es })}
        </span>
        {isExpanded ? (
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-surface-hover transition-colors text-text-muted hover:text-text-main">
            <ChevronRight size={20} />
          </button>
        ) : <div className="w-9" />}
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((dayName, i) => (
          <div key={i} className="text-center text-[10px] font-black text-text-muted uppercase tracking-wider py-1">
            {dayName}
          </div>
        ))}
      </div>
      
      <div className="flex flex-col gap-1">
        {rows}
      </div>

      <div className="flex justify-center mt-3 border-t border-border/30 pt-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[10px] uppercase font-black tracking-wider text-text-muted hover:text-text-main flex items-center gap-1.5 transition-colors focus:outline-none"
        >
          {isExpanded ? (
            <>
              <ChevronUp size={12} /> Ver menos
            </>
          ) : (
            <>
              <ChevronDown size={12} /> Ver mes completo
            </>
          )}
        </button>
      </div>
    </div>
  );
}
