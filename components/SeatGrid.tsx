
import React from 'react';
import { Seat, SeatStatus } from '../types';

interface SeatGridProps {
  seats: Seat[];
  onSeatClick: (seatId: string) => void;
  selectedSeatIds: string[];
}

const SeatGrid: React.FC<SeatGridProps> = ({ seats, onSeatClick, selectedSeatIds }) => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  
  return (
    <div className="flex flex-col items-center gap-8 p-6 bg-slate-800/50 rounded-2xl border border-slate-700 shadow-2xl">
      <div className="relative w-full max-w-lg mb-8">
        <div className="h-2 w-full bg-slate-600 rounded-full shadow-[0_10px_25px_rgba(255,255,255,0.1)]"></div>
        <p className="text-center text-[10px] uppercase tracking-widest text-slate-500 mt-2 font-bold">Screen This Way</p>
      </div>

      <div className="grid grid-cols-10 gap-3">
        {seats.map((seat) => {
          const isSelected = selectedSeatIds.includes(seat.id);
          const status = seat.status;
          
          let bgColor = 'bg-slate-700 hover:bg-slate-600';
          let borderColor = 'border-slate-600';
          let cursor = 'cursor-pointer';

          if (isSelected) {
            bgColor = 'bg-blue-600 shadow-blue-500/50 shadow-lg';
            borderColor = 'border-blue-400';
          } else if (status === SeatStatus.LOCKED) {
            bgColor = 'bg-amber-600 shadow-amber-500/50 shadow-lg animate-pulse';
            borderColor = 'border-amber-400';
            cursor = 'cursor-not-allowed';
          } else if (status === SeatStatus.BOOKED) {
            bgColor = 'bg-red-900/40 text-slate-600';
            borderColor = 'border-red-900/50';
            cursor = 'cursor-not-allowed';
          }

          return (
            <button
              key={seat.id}
              onClick={() => onSeatClick(seat.id)}
              disabled={status === SeatStatus.LOCKED || status === SeatStatus.BOOKED}
              className={`w-8 h-8 rounded-t-lg border-2 flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${bgColor} ${borderColor} ${cursor} transform active:scale-90`}
              title={`${seat.row}${seat.number} - ${status}`}
            >
              {seat.number}
            </button>
          );
        })}
      </div>

      <div className="flex gap-6 text-xs text-slate-400 mt-4 border-t border-slate-700 pt-6 w-full justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-700 rounded-sm"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-600 animate-pulse rounded-sm"></div>
          <span>Locked (Other User)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-900/40 rounded-sm"></div>
          <span>Booked</span>
        </div>
      </div>
    </div>
  );
};

export default SeatGrid;
