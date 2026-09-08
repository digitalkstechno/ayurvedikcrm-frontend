import React, { useState, useEffect, useRef } from 'react';
import { FiCalendar } from 'react-icons/fi';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onChange: (start: string | null, end: string | null) => void;
}

const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const PRESETS = [
  { label: 'All Data', getValue: () => ({ start: null, end: null }) },
  { label: 'Today', getValue: () => {
      const d = new Date();
      const str = formatDateLocal(d);
      return { start: str, end: str };
  } },
  { label: 'Yesterday', getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const str = formatDateLocal(d);
      return { start: str, end: str };
  } },
  { label: 'Last 7 Days', getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return { start: formatDateLocal(start), end: formatDateLocal(end) };
  } },
  { label: 'Last 30 Days', getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return { start: formatDateLocal(start), end: formatDateLocal(end) };
  } },
  { label: 'This Month', getValue: () => {
      const d = new Date();
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { start: formatDateLocal(start), end: formatDateLocal(end) };
  } },
  { label: 'Last Month', getValue: () => {
      const d = new Date();
      const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const end = new Date(d.getFullYear(), d.getMonth(), 0);
      return { start: formatDateLocal(start), end: formatDateLocal(end) };
  } },
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string>(() => {
    const matchingPreset = PRESETS.find(p => {
      const v = p.getValue();
      return v.start === startDate && v.end === endDate;
    });
    return matchingPreset ? matchingPreset.label : (startDate && endDate ? 'Custom Range' : 'All Data');
  });
  
  // Custom range selection states
  const [isCustom, setIsCustom] = useState(false);
  const [tempStart, setTempStart] = useState<string | null>(startDate);
  const [tempEnd, setTempEnd] = useState<string | null>(endDate);
  
  // Calendar view state (which month is currently shown on the left)
  const [viewDate, setViewDate] = useState(new Date());
  
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Sync active preset and temp values when popover opens or props change
    if (isOpen) {
      setTempStart(startDate);
      setTempEnd(endDate);
      const matchingPreset = PRESETS.find(p => {
        const v = p.getValue();
        return v.start === startDate && v.end === endDate;
      });
      if (matchingPreset) {
        setActivePreset(matchingPreset.label);
        setIsCustom(false);
      } else if (startDate || endDate) {
        setActivePreset('Custom Range');
        setIsCustom(true);
      } else {
        setActivePreset('All Data');
        setIsCustom(false);
      }
    }
  }, [isOpen, startDate, endDate]);

  const handlePresetClick = (label: string, getValue: () => { start: string | null, end: string | null }) => {
    setActivePreset(label);
    if (label === 'Custom Range') {
      setIsCustom(true);
      return;
    }
    setIsCustom(false);
    const { start, end } = getValue();
    onChange(start, end);
    setIsOpen(false);
  };

  const handleApplyCustom = () => {
    if (tempStart && tempEnd) {
      if (new Date(tempStart) > new Date(tempEnd)) {
        onChange(tempEnd, tempStart);
      } else {
        onChange(tempStart, tempEnd);
      }
    } else {
      onChange(tempStart, tempEnd);
    }
    setIsOpen(false);
  };

  const formatDateLabel = (start: string | null, end: string | null) => {
    if (!start && !end) return 'All Data';
    const s = start ? new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    const e = end ? new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    return `${s} - ${e}`;
  };

  // Calendar rendering logic
  const renderMonth = (monthOffset: number) => {
    const targetDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthName = targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return (
      <div className="flex-1 w-64">
        <div className="flex items-center justify-between mb-4">
          {monthOffset === 0 ? (
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1 hover:bg-zinc-100 rounded">
              <MdChevronLeft className="w-5 h-5" />
            </button>
          ) : <div className="w-7"></div>}
          <div className="font-semibold text-sm text-zinc-800">{monthName}</div>
          {monthOffset === 1 ? (
            <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1 hover:bg-zinc-100 rounded">
              <MdChevronRight className="w-5 h-5" />
            </button>
          ) : <div className="w-7"></div>}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-xs font-semibold text-zinc-500">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((dateObj, i) => {
            if (!dateObj) return <div key={`empty-${i}`} className="p-2"></div>;
            
            const dateStr = formatDateLocal(dateObj);
            const isStart = tempStart === dateStr;
            const isEnd = tempEnd === dateStr;
            const isBetween = tempStart && tempEnd && dateStr > tempStart && dateStr < tempEnd;
            const isSelected = isStart || isEnd;
            
            let bgClass = "hover:bg-zinc-100";
            if (isSelected) bgClass = "bg-blue-600 text-white hover:bg-blue-700";
            else if (isBetween) bgClass = "bg-blue-50";

            return (
              <button
                key={dateStr}
                onClick={() => {
                  if (!tempStart || (tempStart && tempEnd)) {
                    setTempStart(dateStr);
                    setTempEnd(null);
                  } else {
                    if (dateStr < tempStart) {
                      setTempEnd(tempStart);
                      setTempStart(dateStr);
                    } else {
                      setTempEnd(dateStr);
                    }
                  }
                }}
                className={`text-sm py-1.5 mx-0.5 rounded transition-colors ${bgClass}`}
              >
                {dateObj.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-teal-500 h-[38px]"
      >
        <FiCalendar className="w-4 h-4 text-teal-600" />
        {formatDateLabel(startDate, endDate)}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 bg-white rounded-lg shadow-xl border border-zinc-200 flex flex-col md:flex-row overflow-hidden max-w-[95vw] md:max-w-none md:min-w-max">
          
          {/* Presets Sidebar */}
          <div className="w-full md:w-48 bg-zinc-50 border-r border-zinc-200 flex flex-col py-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset.label, preset.getValue)}
                className={`px-4 py-2 text-sm text-left hover:bg-zinc-200 transition-colors ${activePreset === preset.label && !isCustom ? 'bg-teal-100/50 text-teal-800 font-semibold border-l-2 border-teal-600' : 'text-zinc-600'}`}
              >
                {preset.label}
              </button>
            ))}
            <button
              onClick={() => { setActivePreset('Custom Range'); setIsCustom(true); }}
              className={`px-4 py-2 text-sm text-left hover:bg-zinc-200 transition-colors ${isCustom ? 'bg-teal-100/50 text-teal-800 font-semibold border-l-2 border-teal-600' : 'text-zinc-600'}`}
            >
              Custom Range
            </button>
          </div>

          {/* Custom Calendar View */}
          {isCustom && (
            <div className="p-4 flex flex-col overflow-y-auto max-h-[80vh]">
              <div className="flex flex-col sm:flex-row gap-6 mb-4">
                {renderMonth(0)}
                {renderMonth(1)}
              </div>
              <div className="flex items-center justify-between border-t border-zinc-200 pt-4 mt-2">
                <div className="text-sm font-medium text-zinc-600">
                  {tempStart ? new Date(tempStart).toLocaleDateString() : 'Start Date'} - {tempEnd ? new Date(tempEnd).toLocaleDateString() : 'End Date'}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIsOpen(false)} className="px-4 py-1.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg">Cancel</button>
                  <button onClick={handleApplyCustom} className="px-4 py-1.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg">Apply</button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
