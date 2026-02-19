
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Seat, SeatStatus, Movie, Show, SimulationLog, UserSession } from './types';
import { MOVIES, SHOWS, LOCK_DURATION_MS } from './constants';
import { getSystemInsight } from './services/geminiService';
import SeatGrid from './components/SeatGrid';
import LogViewer from './components/LogViewer';

const App: React.FC = () => {
  // State
  const [selectedMovie, setSelectedMovie] = useState<Movie>(MOVIES[0]);
  const [selectedShow, setSelectedShow] = useState<Show>(SHOWS[0]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<SimulationLog[]>([]);
  const [insight, setInsight] = useState<string>("Welcome to CineLock. Select a movie to begin the concurrent booking simulation.");
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [userSession] = useState<UserSession>({ userId: 'u-current', userName: 'Main User' });
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize Seats
  useEffect(() => {
    const initialSeats: Seat[] = [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    rows.forEach(row => {
      for (let i = 1; i <= 10; i++) {
        initialSeats.push({
          id: `${row}${i}`,
          row,
          number: i,
          status: SeatStatus.AVAILABLE
        });
      }
    });
    setSeats(initialSeats);
    addLog('INFO', `Initialized seat inventory for ${selectedShow.theater}.`);
  }, [selectedShow]);

  // Lock expiry checker
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      let expiredCount = 0;

      setSeats(prev => prev.map(seat => {
        if (seat.status === SeatStatus.LOCKED && seat.lockedAt && (now - seat.lockedAt > LOCK_DURATION_MS)) {
          expiredCount++;
          return { ...seat, status: SeatStatus.AVAILABLE, lockedAt: undefined, lockedBy: undefined };
        }
        return seat;
      }));

      if (expiredCount > 0) {
        addLog('INFO', `Scheduled task: Released ${expiredCount} expired locks.`);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const addLog = (type: SimulationLog['type'], message: string, sql?: string) => {
    setLogs(prev => [...prev, { timestamp: Date.now(), type, message, sql }].slice(-50));
  };

  const handleSeatClick = (seatId: string) => {
    setSelectedSeatIds(prev => 
      prev.includes(seatId) ? prev.filter(id => id !== seatId) : [...prev, seatId]
    );
  };

  const updateInsight = async (scenario: string) => {
    setIsLoadingInsight(true);
    const text = await getSystemInsight(scenario);
    setInsight(text);
    setIsLoadingInsight(false);
  };

  const simulateLocking = async () => {
    if (selectedSeatIds.length === 0) return;
    setIsProcessing(true);
    addLog('INFO', `Initiating transaction for user ${userSession.userId}...`);
    
    // Simulate DB Latency
    await new Promise(r => setTimeout(r, 800));

    addLog('DB_LOCK', `Attempting Pessimistic Lock on seats: ${selectedSeatIds.join(', ')}`, `SELECT * FROM seats WHERE id IN (${selectedSeatIds.map(s => `'${s}'`).join(',')}) FOR UPDATE;`);
    
    // Check for conflicts
    const conflicts = seats.filter(s => selectedSeatIds.includes(s.id) && s.status !== SeatStatus.AVAILABLE);
    
    if (conflicts.length > 0) {
      addLog('ERROR', `Transaction failed: Some seats are already locked or booked.`);
      updateInsight("Pessimistic locking prevents a double-booking conflict.");
    } else {
      setSeats(prev => prev.map(s => {
        if (selectedSeatIds.includes(s.id)) {
          return { ...s, status: SeatStatus.LOCKED, lockedAt: Date.now(), lockedBy: userSession.userId };
        }
        return s;
      }));
      addLog('SUCCESS', `Seats locked for 7 minutes. Awaiting payment...`);
      updateInsight("A user initiates a booking, triggering a row-level lock in the DB.");
    }
    
    setSelectedSeatIds([]);
    setIsProcessing(false);
  };

  const completeBooking = async () => {
    const userLockedSeats = seats.filter(s => s.lockedBy === userSession.userId && s.status === SeatStatus.LOCKED);
    if (userLockedSeats.length === 0) return;

    setIsProcessing(true);
    addLog('INFO', 'Payment gateway processing...');
    await new Promise(r => setTimeout(r, 1500));

    setSeats(prev => prev.map(s => {
      if (s.lockedBy === userSession.userId && s.status === SeatStatus.LOCKED) {
        return { ...s, status: SeatStatus.BOOKED, lockedAt: undefined, lockedBy: undefined };
      }
      return s;
    }));

    addLog('SUCCESS', 'Payment successful. Transaction committed.', 'UPDATE seats SET status = \'BOOKED\' WHERE locked_by = \'u-current\';');
    updateInsight("Payment success triggers status update to BOOKED and a database COMMIT.");
    setIsProcessing(false);
  };

  const simulateConcurrentBot = async () => {
    addLog('INFO', 'Simulating concurrent bot user access...');
    const available = seats.filter(s => s.status === SeatStatus.AVAILABLE);
    if (available.length < 2) return;

    const targetSeats = available.sort(() => 0.5 - Math.random()).slice(0, 2);
    const targetIds = targetSeats.map(s => s.id);

    addLog('DB_LOCK', `Bot User attempting to lock: ${targetIds.join(', ')}`, `BEGIN TRANSACTION; SELECT FOR UPDATE...`);
    
    await new Promise(r => setTimeout(r, 1200));

    setSeats(prev => prev.map(s => {
      if (targetIds.includes(s.id)) {
        return { ...s, status: SeatStatus.LOCKED, lockedAt: Date.now(), lockedBy: 'u-bot-' + Math.random().toString(36).substr(2, 5) };
      }
      return s;
    }));

    addLog('SUCCESS', 'Bot user successfully acquired locks.');
    updateInsight("Concurrent access is handled using Spring's Transaction Management.");
  };

  const simulateDeadlock = async () => {
    addLog('DEADLOCK', 'Forcing Deadlock Scenario: User A locks S1 -> User B locks S2 -> User A requests S2 -> User B requests S1');
    updateInsight("A deadlock occurs when two transactions hold locks and wait for each other. Spring Boot/DB detects this and rolls back one.");
    
    await new Promise(r => setTimeout(r, 2000));
    addLog('ERROR', 'Deadlock detected! Database engine kills Transaction B. Transaction A retries.', 'ROLLBACK TO SAVEPOINT;');
    addLog('INFO', 'Retrying Transaction A...');
    await new Promise(r => setTimeout(r, 1000));
    addLog('SUCCESS', 'Transaction A recovered and completed.');
  };

  const userLockedCount = seats.filter(s => s.lockedBy === userSession.userId).length;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar: Control Panel */}
      <aside className="w-full lg:w-96 bg-slate-800 border-r border-slate-700 flex flex-col p-6 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-blue-600 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter">CINELOCK <span className="text-blue-500 font-normal text-sm not-italic align-top">v1.0</span></h1>
        </div>

        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase text-slate-500 mb-4">Simulation Controls</h2>
          <div className="space-y-3">
            <button 
              onClick={simulateConcurrentBot}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-semibold transition-all border border-slate-600 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Spawn Concurrent Bot
            </button>
            <button 
              onClick={simulateDeadlock}
              className="w-full py-3 bg-red-900/30 hover:bg-red-900/40 text-red-400 rounded-xl text-sm font-semibold transition-all border border-red-900/50 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              Force Deadlock Event
            </button>
          </div>
        </section>

        <section className="mb-8 bg-blue-900/20 border border-blue-800/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase text-blue-400">AI Logic Insight</h2>
            {isLoadingInsight && <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>}
          </div>
          <p className="text-sm leading-relaxed text-blue-100/80 italic">
            "{insight}"
          </p>
        </section>

        <section className="flex-1">
          <h2 className="text-xs font-bold uppercase text-slate-500 mb-4">Select Movie</h2>
          <div className="grid grid-cols-1 gap-4">
            {MOVIES.map(movie => (
              <button
                key={movie.id}
                onClick={() => setSelectedMovie(movie)}
                className={`flex gap-4 p-3 rounded-xl border transition-all ${
                  selectedMovie.id === movie.id ? 'bg-slate-700 border-blue-500 shadow-lg' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                }`}
              >
                <img src={movie.image} alt={movie.title} className="w-16 h-20 object-cover rounded-lg shadow-md" />
                <div className="text-left">
                  <p className="font-bold text-slate-100">{movie.title}</p>
                  <p className="text-xs text-slate-400">{movie.genre}</p>
                  <p className="text-[10px] mt-1 text-blue-400 font-bold">{movie.rating}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </aside>

      {/* Main Content: Seat Selection and Logs */}
      <main className="flex-1 flex flex-col p-6 lg:p-10 gap-8 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest">{selectedMovie.genre}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              <span className="text-xs font-medium text-slate-400">{selectedMovie.duration}</span>
            </div>
            <h2 className="text-4xl font-black text-white">{selectedMovie.title}</h2>
            <div className="flex gap-4 mt-4">
              {SHOWS.filter(s => s.movieId === selectedMovie.id).map(show => (
                <button
                  key={show.id}
                  onClick={() => setSelectedShow(show)}
                  className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                    selectedShow.id === show.id ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {show.time} • {show.theater}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 flex flex-col items-center">
              <span className="text-[10px] uppercase text-slate-500 font-bold mb-1">Ticket Price</span>
              <span className="text-2xl font-black text-white">${selectedShow.price}</span>
            </div>
          </div>
        </header>

        <div className="flex flex-col xl:flex-row gap-8">
          <div className="flex-1">
            <SeatGrid 
              seats={seats} 
              onSeatClick={handleSeatClick} 
              selectedSeatIds={selectedSeatIds} 
            />
          </div>

          <aside className="w-full xl:w-80 flex flex-col gap-6">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 118 0m-4 7v2a4 4 0 01-4 4H6a4 4 0 01-4-4v-4a4 4 0 014-4h2" /></svg>
                Booking Summary
              </h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Selected Seats:</span>
                  <span className="text-white font-bold">{selectedSeatIds.length || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Currently Locked:</span>
                  <span className="text-amber-400 font-bold">{userLockedCount}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-700 pt-3">
                  <span className="text-slate-400 font-bold">Subtotal:</span>
                  <span className="text-xl font-black text-white">${(selectedSeatIds.length + userLockedCount) * selectedShow.price}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={simulateLocking}
                  disabled={selectedSeatIds.length === 0 || isProcessing}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Initiate Lock (7 min)'}
                </button>
                <button
                  onClick={completeBooking}
                  disabled={userLockedCount === 0 || isProcessing}
                  className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all"
                >
                  Confirm & Pay Now
                </button>
              </div>
              <p className="text-[10px] text-slate-500 text-center mt-4">
                Locks are released automatically after 7 minutes of inactivity.
              </p>
            </div>

            <div className="bg-amber-900/10 border border-amber-900/30 rounded-2xl p-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Technical Warning</h4>
              <p className="text-[11px] text-amber-200/70 leading-relaxed">
                Using <strong>Pessimistic Locking</strong> ensures that no two transactions can modify the same seat simultaneously. 
                Deadlock detection is handled by the RDBMS, while Spring manages retry logic.
              </p>
            </div>
          </aside>
        </div>

        <LogViewer logs={logs} />
      </main>
    </div>
  );
};

export default App;
