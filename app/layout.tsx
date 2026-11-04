import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Showtime — Big screens. Better plans.',description:'Discover films, explore ten Hyderabad cinemas and book your favourite seats. A cinema-booking project, with no payments.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
