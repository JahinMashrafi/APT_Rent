import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="bg-gray-800 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <img src="/assets/images/logo/apt-rent-logo.png" alt="APT Rent logo" className="h-8 w-auto" />
            <span className="text-xl font-bold text-gray-900">
              APT <span className="font-light">Rent</span>
            </span>
          </Link>
          
          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            <Link 
              to="/login" 
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              Log in
            </Link>
            <Link 
              to="/register" 
              className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Register
            </Link>
          </div>

        </div>
      </div>
    </header>
  );
}