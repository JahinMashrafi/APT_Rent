import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/login', 
        { email, password },
        { withCredentials: true } // Required to securely receive the httpOnly cookie
      );

      if (response.data.status === 'success') {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    /* 
      MAIN WRAPPER 
      min-h-screen: Ensures the div takes up at least 100% of the viewport height.
      flex: Activates Flexbox (defaults to row layout on desktop).
    */
    <div className="flex min-h-screen bg-gray-50 font-sans">
      
      {/* 
        LEFT BRANDING PANEL
        hidden: display: none on mobile devices (phones).
        md:flex: When the screen hits the "md" breakpoint (768px), display as flex.
        md:w-1/3: Take up exactly 33.333% of the width on tablet/desktop.
        flex-col justify-between: Stacks items vertically and pushes them to the top/bottom edges.
      */}
      <section className="hidden md:flex md:w-1/3 bg-blue-900 text-white flex-col justify-between p-10 lg:p-16">
        
        {/* hover:opacity-90 makes the logo slightly transparent when hovered */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <img src="/assets/images/logo/apt-rent-logo.png" alt="APT Rent logo" className="h-10 w-auto" />
          <span className="text-2xl font-bold tracking-tight">
            APT <span className="font-light">Rent</span>
          </span>
        </Link>

        {/* space-y-6 adds margin-bottom to all direct children, spacing out the text */}
        <div className="space-y-6">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
            Welcome back
          </span>
          <h2 className="text-4xl lg:text-5xl font-semibold leading-tight">
            Pick up right where the lease left off.
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed max-w-md">
            One sign-in for both sides of the rental — landlords managing units, tenants tracking rent and requests.
          </p>
        </div>

        <p className="text-xs font-mono tracking-widest text-blue-400/70">
          APT RENT // SECURE SIGN-IN
        </p>
      </section>

      {/* 
        RIGHT FORM PANEL
        flex-1: Tells this container to grow and take up all the remaining space (2/3 of the screen).
        items-center justify-center: Centers the login card perfectly in the middle of this area.
      */}
      <section className="flex flex-1 items-center justify-center p-6 sm:p-12">
        
        {/* 
          THE WHITE LOGIN CARD
          max-w-md: Limits the width to 28rem (448px) so it doesn't get too wide on massive screens.
          shadow-xl: Adds a deep drop shadow for a modern "floating" effect.
        */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 sm:p-10 border border-gray-100">
          
          <header className="mb-8 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Account access
            </span>
            <h1 className="text-3xl font-bold text-gray-900">Log in</h1>
            <p className="text-gray-500 text-sm">
              Enter your details to access your APT Rent dashboard.
            </p>
          </header>

          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            
            {/* Error Message Display */}
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            {/* EMAIL FIELD */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="loginEmail" className="text-sm font-semibold text-gray-700">
                Email address <span className="text-red-500">*</span>
              </label>
              
              {/* relative: Crucial! This allows us to absolutely position the icon inside the input wrapper */}
              <div className="relative flex items-center">
                
                {/* absolute left-3.5: Pins the SVG icon to the left side inside the input */}
                <img 
                  src="/assets/icons/email.svg" 
                  alt="" 
                  className="absolute left-3.5 h-5 w-5 opacity-40"
                />
                
                {/* 
                  pl-11: Padding-left of 2.75rem. This pushes the typing area to the right so text doesn't overlap the absolute icon!
                  focus:ring-2: Adds the blue glowing outline when the user clicks to type.
                */}
                <input 
                  type="email" 
                  id="loginEmail" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                />
              </div>
            </div>

            {/* PASSWORD FIELD */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="loginPassword" className="text-sm font-semibold text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <img 
                  src="/assets/icons/lock.svg" 
                  alt="" 
                  className="absolute left-3.5 h-5 w-5 opacity-40"
                />
                <input 
                  type="password" 
                  id="loginPassword" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                />
              </div>
            </div>

            {/* 
              SUBMIT BUTTON 
              transition-all: Smoothly animates the background color change on hover.
              active:scale-[0.98]: This custom value slightly shrinks the button when clicked, making it feel physical.
            */}
            <button 
              type="submit" 
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            >
              Log in
            </button>
          </form>

          {/* Switch to Register link */}
          <div className="mt-8 text-center text-sm text-gray-600">
            New to APT Rent?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors">
              Create an account
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}