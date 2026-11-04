/**
 * Reference catalogue checked 4 November 2026. Venue names and movie metadata
 * come from the linked public listings. Schedules, screen counts, formats,
 * seating plans and prices below are configured DEMONSTRATION data, not live
 * cinema inventory. No venue is affiliated with this student project.
 */
export type Movie = {
  id: string; title: string; languages: string[]; genres: string[];
  duration: number; certificate: string; poster: string; backdrop?: string;
  description: string; tagline: string; release: 'now' | 'soon';
  color: string; source: string;
};
export type Cinema = {
  id: string; name: string; area: string; type: 'Multiplex' | 'Single screen';
  screens: number; features: string[]; address: string; source: string;
};
export type Show = {
  id: string; day: string; cinema: string; screen: number; time: string;
  starts: number; movie: string; format: string; language: string;
};
export type Seat = {
  id: string; row: string; number: number;
  section: 'Recliner' | 'Prime' | 'Classic'; price: number;
};

export const movies: Movie[] = [
  {
    id: 'ramayana', title: 'Ramayana', languages: ['Telugu', 'Hindi', 'Tamil'],
    genres: ['Epic', 'Mythological'], duration: 195, certificate: 'U',
    poster: '/assets/ramayana.jpg', backdrop: '/assets/ramayana-backdrop.jpg', color: '#aa542c', release: 'soon',
    tagline: 'An epic made for the big screen.',
    description: 'A mythological epic bringing a familiar legend to the cinema. Discover a larger-than-life world of duty, courage and devotion.',
    source: 'https://www.district.in/movies/ramayana-movie-tickets-in-hyderabad-MV176276',
  },
  {
    id: 'jailer-2', title: 'Jailer 2', languages: ['Telugu', 'Tamil'],
    genres: ['Action', 'Thriller'], duration: 165, certificate: 'UA16+',
    poster: '/assets/jailer-2.jpg', color: '#9e4b30', release: 'now',
    tagline: 'Some returns deserve a full house.',
    description: 'Big-screen action with a thriller edge. Choose your favourite language, pick a screen and make a night of it.',
    source: 'https://www.district.in/movies/jailer-2-movie-tickets-in-hyderabad-MV187766',
  },
  {
    id: 'ak47', title: 'Aadarsha Kutumbam House No: 47', languages: ['Telugu'],
    genres: ['Family', 'Comedy', 'Drama'], duration: 149, certificate: 'UA16+',
    poster: '/assets/ak47.jpg', color: '#7c2c37', release: 'now',
    tagline: 'Every family has a story.',
    description: 'A Telugu family entertainer with comedy and drama. Bring your favourite company along for a shared big-screen outing.',
    source: 'https://www.district.in/movies/aadarsha-kutumbam-house-no-47-movie-tickets-in-hyderabad-MV211590',
  },
  {
    id: 'cult', title: 'Cult', languages: ['Telugu'], genres: ['Psychological', 'Thriller'],
    duration: 152, certificate: 'A', poster: '/assets/cult.avif',
    color: '#43616b', release: 'now', tagline: 'Let the suspense take over.',
    description: 'A Telugu psychological thriller for audiences who enjoy a darker cinema experience. Rated A: intended for adult audiences.',
    source: 'https://www.district.in/movies/cult-movie-tickets-in-hyderabad-MV216077',
  },
  {
    id: 'ranabaali', title: 'Ranabaali', languages: ['Telugu'],
    genres: ['Action', 'Drama', 'Period'], duration: 178, certificate: 'UA16+',
    poster: '/assets/ranabaali.avif', color: '#967344', release: 'now',
    tagline: 'A story with scale. A screen to match.',
    description: 'An action-led period drama in Telugu. Explore the available demonstration shows and find your preferred cinema experience.',
    source: 'https://www.district.in/movies/ranabaali-movie-tickets-in-hyderabad-MV214106',
  },
  {
    id: 'drishyam', title: 'Drishyam: The Conclusion', languages: ['Hindi'],
    genres: ['Drama', 'Mystery', 'Thriller'], duration: 150, certificate: 'UA16+',
    poster: '/assets/drishyam.jpg', color: '#3f6b6d', release: 'now',
    tagline: 'Stay for the questions. Leave with a conversation.',
    description: 'A Hindi mystery drama with suspense at its heart. Settle in for a story best experienced without distractions.',
    source: 'https://www.district.in/movies/drishyam-the-conclusion-movie-tickets-in-hyderabad-MV207254',
  },
  {
    id: 'scene', title: 'Scene', languages: ['Telugu', 'Tamil'],
    genres: ['Action', 'Comedy', 'Thriller'], duration: 149, certificate: 'UA16+',
    poster: '/assets/scene.jpg', color: '#54506e', release: 'soon',
    tagline: 'Something new is about to unfold.',
    description: 'Action, comedy and thriller come together in this Telugu and Tamil release. Save it to your watchlist for a future movie night.',
    source: 'https://www.district.in/movies/scene-movie-tickets-in-hyderabad-MV233181',
  },
  {
    id: 'cat-in-the-hat', title: 'The Cat in the Hat', languages: ['English', 'Hindi'],
    genres: ['Animation', 'Comedy'], duration: 110, certificate: 'U',
    poster: '/assets/cat-in-the-hat.jpg', color: '#ba4548', release: 'soon',
    tagline: 'Make a little room for mischief.',
    description: 'A colourful animated outing built around Dr. Seuss’s famous mischief-maker. Add it to your watchlist and plan an imaginative cinema day.',
    source: 'https://www.district.in/movies/the-cat-in-the-hat-movie-tickets-in-hyderabad-MV201083',
  },
];

export const cinemas: Cinema[] = [
  { id: 'prasads', name: 'Prasads Multiplex', area: 'Khairatabad', type: 'Multiplex', screens: 4,
    features: ['Large screen', 'Recliner seats', 'Food court'],
    address: 'NTR Marg, near NTR Gardens, Khairatabad, Hyderabad', source: 'https://prasadz.com/' },
  { id: 'amb', name: 'AMB Cinemas', area: 'Gachibowli', type: 'Multiplex', screens: 4,
    features: ['Premium screens', 'Recliner seats', 'Mall parking'],
    address: 'Sarath City Capital Mall, Gachibowli–Miyapur Road, Kondapur, Hyderabad',
    source: 'https://www.hyderabadtheatres.com/theaters/amb-cinemas/' },
  { id: 'pvr-inorbit', name: 'PVR Superplex Inorbit', area: 'Madhapur', type: 'Multiplex', screens: 3,
    features: ['Multiple screens', 'Premium seats', 'Mall parking'],
    address: 'Inorbit Mall, Cyberabad, Madhapur, Hyderabad',
    source: 'https://www.district.in/movies/ramayana-movie-tickets-in-hyderabad-MV176276' },
  { id: 'inox-gvk', name: 'INOX GVK One', area: 'Banjara Hills', type: 'Multiplex', screens: 3,
    features: ['Multiple screens', 'Recliner seats', 'Mall parking'],
    address: 'GVK One Mall, Road No. 1, Banjara Hills, Hyderabad',
    source: 'https://www.district.in/movies/jailer-2-movie-tickets-in-hyderabad-MV187766' },
  { id: 'cinepolis-dsl', name: 'Cinépolis DSL Virtue Mall', area: 'Uppal', type: 'Multiplex', screens: 3,
    features: ['Multiple screens', 'Premium seats', 'Mall parking'],
    address: 'DSL Virtue Mall, Uppal, Hyderabad',
    source: 'https://www.district.in/movies/ramayana-movie-tickets-in-hyderabad-MV176276' },
  { id: 'sandhya', name: 'Sandhya 70MM', area: 'RTC X Roads', type: 'Single screen', screens: 1,
    features: ['Single-screen experience', 'Reserved seating', 'Local favourite'],
    address: 'RTC X Roads, Chikkadpally, Hyderabad',
    source: 'https://cinematimes.in/theatre/sandhya-70mm-theatre-rtc-x-roads-hyderabad/' },
  { id: 'sudarshan', name: 'Sudarshan 35MM', area: 'RTC X Roads', type: 'Single screen', screens: 1,
    features: ['Single-screen experience', 'Reserved seating', 'Local favourite'],
    address: 'RTC X Roads, Chikkadpally, Hyderabad',
    source: 'https://www.district.in/movies/cult-movie-tickets-in-hyderabad-MV216077' },
  { id: 'devi', name: 'Devi 70MM', area: 'RTC X Roads', type: 'Single screen', screens: 1,
    features: ['Single-screen experience', 'Reserved seating', 'Local favourite'],
    address: 'RTC X Roads, Chikkadpally, Hyderabad',
    source: 'https://www.district.in/movies/ramayana-movie-tickets-in-hyderabad-MV176276' },
  { id: 'saptagiri', name: 'Saptagiri 70MM', area: 'RTC X Roads', type: 'Single screen', screens: 1,
    features: ['Single-screen experience', 'Reserved seating', 'Classic cinema'],
    address: 'RTC X Roads, Chikkadpally, Hyderabad',
    source: 'https://chronicleclub.in/storage/uploads/1772169389-deccan-chronicle.pdf' },
  { id: 'ramakrishna', name: 'Ramakrishna 70MM', area: 'Abids', type: 'Single screen', screens: 1,
    features: ['Single-screen experience', 'Reserved seating', 'Classic cinema'],
    address: 'Troop Bazaar, Abids, Hyderabad',
    source: 'https://chronicleclub.in/storage/uploads/1749014064-dc.pdf' },
];

/** Demo scheduling. 210-minute gaps accommodate the longest listed feature. */
export const showTimes = ['09:30', '13:00', '16:30', '20:00'];
export function dayKeys(): string[] {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  return Array.from({ length: 7 }, (_, i) =>
    new Date(new Date(`${today}T00:00:00Z`).getTime() + i * 86400000).toISOString().slice(0, 10));
}
export function showsFor(day: string, movieId?: string, cinemaId?: string, allowPast = false): Show[] {
  if (!validDay(day) || (!allowPast && !dayKeys().includes(day))) return [];
  const showing = movies.filter(m => m.release === 'now');
  const seed = Math.floor(new Date(`${day}T00:00:00Z`).getTime() / 86400000);
  const result: Show[] = [];
  cinemas.forEach((cinema, ci) => {
    if (cinemaId && cinema.id !== cinemaId) return;
    for (let screen = 1; screen <= cinema.screens; screen++) {
      showTimes.forEach((time, ti) => {
        const movie = showing[(seed + ci * 3 + screen + ti) % showing.length];
        if (movieId && movie.id !== movieId) return;
        result.push({
          id: `${day}~${cinema.id}~${screen}~${ti}`, day, cinema: cinema.id, screen, time,
          starts: new Date(`${day}T${time}:00+05:30`).getTime(), movie: movie.id,
          format: cinema.type === 'Multiplex' && screen === 1 ? '4K · Atmos' : '2D',
          language: movie.languages[(ci + screen) % movie.languages.length],
        });
      });
    }
  });
  return result;
}
function validDay(day: string): boolean {
  if (!/^(20\d{2}|2100)-\d{2}-\d{2}$/.test(day || '')) return false;
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}
export function showFor(id: string, allowPast = false): Show | undefined {
  if (typeof id !== 'string' || id.length > 100) return undefined;
  const [day, cinemaId, screen, timeIndex, extra] = id.split('~');
  if (extra !== undefined || !/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return undefined;
  if (!/^\d+$/.test(screen || '') || !/^[0-3]$/.test(timeIndex || '')) return undefined;
  return showsFor(day, undefined, cinemaId, allowPast).find(s => s.id === id);
}
export function seatsFor(show: Show | string): Seat[] {
  const selected = typeof show === 'string' ? showFor(show) : show;
  if (!selected) return [];
  const cinema = cinemas.find(c => c.id === selected.cinema);
  if (!cinema) return [];
  return 'ABCDEFGH'.split('').flatMap((row, ri) => {
    const section: Seat['section'] = ri < 2 ? 'Recliner' : ri < 5 ? 'Prime' : 'Classic';
    const price = cinema.type === 'Multiplex'
      ? section === 'Recliner' ? 450 : section === 'Prime' ? 300 : 200
      : section === 'Recliner' ? 250 : section === 'Prime' ? 200 : 150;
    return Array.from({ length: 12 }, (_, i) => ({ id: `${row}${i + 1}`, row, number: i + 1, section, price }));
  });
}
