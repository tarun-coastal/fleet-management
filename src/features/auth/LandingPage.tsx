import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-4xl font-bold mb-4">Fleet Management System</h1>
      <p className="text-lg mb-8 text-gray-600 text-center max-w-lg">
        Manage your vehicles, drivers, documents, trips, and expenses in one place.
      </p>
      <div className="flex gap-4">
        <Link to="/login"><Button>Log In</Button></Link>
        <Link to="/signup"><Button variant="outline">Sign Up as Owner</Button></Link>
      </div>
    </div>
  );
}
