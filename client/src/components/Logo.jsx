import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';

export function LogoMark({ className = 'h-11 sm:h-14 w-auto object-contain' }) {
  return <img src={logoImg} alt="Rembrio" className={className} />;
}

export default function Logo({ to = '/', className = 'h-11 sm:h-14 w-auto object-contain' }) {
  return (
    <Link to={to} className="inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary" aria-label="Rembrio home">
      <img src={logoImg} alt="Rembrio" className={className} />
    </Link>
  );
}
