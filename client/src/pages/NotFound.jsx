import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-page grid min-h-[50vh] place-items-center py-16 text-center">
      <div>
        <p className="text-sm font-semibold text-secondary">404</p>
        <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted">The page you are looking for does not exist or has moved.</p>
        <Link to="/" className="btn btn-primary mt-6">
          Back to home
        </Link>
      </div>
    </div>
  );
}
