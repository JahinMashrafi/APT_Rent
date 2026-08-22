import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main className="flex-grow">
      
      {/* 
        HERO SECTION 
        relative: Allows us to position the background image behind the text.
        min-h-[600px]: Gives the hero section a nice tall height.
      */}
      <section className="relative min-h-[600px] flex items-center justify-center text-center">
        
        {/* BACKGROUND IMAGE & OVERLAY */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          // We apply the background image inline here so it's easy to read the path
          style={{ backgroundImage: "url('/assets/images/backgrounds/hero-background.svg')" }}
        >
          {/* This darkens the background image so the white text is readable (replaces 'hero-overlay') */}
          <div className="absolute inset-0 bg-black/60"></div>
        </div>

        {/* 
          HERO CONTENT 
          relative z-10: Pulls the text and search bar on top of the background image.
        */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 w-full text-white">
          <span className="text-sm font-bold uppercase tracking-widest text-blue-300 drop-shadow-md">
            Verified listings · Digital leases · Cashless rent
          </span>
          
          <h1 className="mt-4 text-5xl sm:text-6xl font-extrabold tracking-tight italic drop-shadow-lg">
            Find Your Next Home
          </h1>

          {/* 
            SEARCH BAR
            flex: Puts the icon, input, and button in a horizontal row.
            overflow-hidden: Keeps the rounded corners clean by clipping the input field inside.
          */}
          <form className="mt-10 flex bg-white rounded-lg overflow-hidden shadow-2xl max-w-2xl mx-auto focus-within:ring-4 focus-within:ring-blue-500/50 transition-all">
            
            <div className="flex items-center pl-5 pr-3 bg-white">
              <img src="/assets/icons/search.svg" alt="" className="h-5 w-5 opacity-40" />
            </div>
            
            <input 
              type="search" 
              placeholder="Search by area, e.g. Gulshan, Dhanmondi..." 
              className="w-full py-4 px-2 text-gray-900 outline-none text-lg"
              aria-label="Search apartments by area"
            />
            
            <button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 font-semibold transition-colors active:bg-blue-800"
            >
              Search
            </button>
          </form>
          
          <p className="mt-6 text-sm text-gray-300 drop-shadow-md">
            Sign in to unlock live listings, filters, and saved searches.
          </p>
        </div>

      </section>
      
    </main>
  );
}