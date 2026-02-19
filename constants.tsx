
import { Movie, Show } from './types';

export const MOVIES: Movie[] = [
  {
    id: 'm1',
    title: 'Interstellar',
    genre: 'Sci-Fi / Drama',
    duration: '2h 49m',
    image: 'https://picsum.photos/seed/interstellar/400/600',
    rating: '8.7/10'
  },
  {
    id: 'm2',
    title: 'Inception',
    genre: 'Sci-Fi / Action',
    duration: '2h 28m',
    image: 'https://picsum.photos/seed/inception/400/600',
    rating: '8.8/10'
  },
  {
    id: 'm3',
    title: 'The Dark Knight',
    genre: 'Action / Crime',
    duration: '2h 32m',
    image: 'https://picsum.photos/seed/batman/400/600',
    rating: '9.0/10'
  }
];

export const SHOWS: Show[] = [
  { id: 's1', movieId: 'm1', time: '14:30', theater: 'IMAX screen 1', price: 15 },
  { id: 's2', movieId: 'm1', time: '18:00', theater: 'IMAX screen 1', price: 18 },
  { id: 's3', movieId: 'm2', time: '15:00', theater: 'Screen 4', price: 12 },
  { id: 's4', movieId: 'm3', time: '20:15', theater: 'Screen 2', price: 14 }
];

export const LOCK_DURATION_MS = 7 * 60 * 1000; // 7 minutes
