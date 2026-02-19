
export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  LOCKED = 'LOCKED',
  BOOKED = 'BOOKED',
  SELECTED = 'SELECTED' // Local UI state
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  status: SeatStatus;
  lockedBy?: string;
  lockedAt?: number; // timestamp
}

export interface Movie {
  id: string;
  title: string;
  genre: string;
  duration: string;
  image: string;
  rating: string;
}

export interface Show {
  id: string;
  movieId: string;
  time: string;
  theater: string;
  price: number;
}

export interface SimulationLog {
  timestamp: number;
  type: 'INFO' | 'DB_LOCK' | 'SUCCESS' | 'ERROR' | 'DEADLOCK';
  message: string;
  sql?: string;
}

export interface UserSession {
  userId: string;
  userName: string;
}
