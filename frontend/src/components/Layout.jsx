import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Navbar stays at the very top */}
      <Navbar />
      
      {/* 2. main flex-grow pushes the footer to the bottom */}
      <main className="flex-grow">
        {/* 3. Outlet is CRITICAL! This is where the Register/Login page actually renders */}
        <Outlet /> 
      </main>
      
      {/* 4. Footer stays at the very bottom */}
      <Footer />
    </div>
  );
}