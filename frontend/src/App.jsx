import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useApp } from "./context/AppContext.jsx";

// Existing pages
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Profile from "./pages/Profile.jsx";
import Dashboard from "./pages/dashboard.jsx";

// New pages
import PropertyDetails from "./pages/PropertyDetails.jsx";
import TourScheduling from "./pages/TourScheduling.jsx";
import LeaseDeposit from "./pages/LeaseDeposit.jsx";
import RentCollection from "./pages/RentCollection.jsx";
import Inbox from "./pages/Inbox.jsx";
import LandlordDashboard from "./pages/LandlordDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Applications from "./pages/Applications.jsx";

// Simple placeholder for unlisted routes
function SimplePage({ title, text }) {
  return (
    <section className="container mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="text-slate-600 mt-2">{text}</p>
    </section>
  );
}

// Route guard for admin-only pages
function AdminRoute({ children }) {
  const { role } = useApp();
  return role === "admin" ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Property browsing */}
        <Route path="/listings" element={<Dashboard />} />
        <Route path="/property/:id" element={<PropertyDetails />} />
        {/* Legacy route kept for ApartmentCard links */}
        <Route path="/apartments/:id" element={<PropertyDetails />} />

        {/* Feature modules */}
        <Route path="/tour/:propertyId" element={<TourScheduling />} />
        <Route path="/lease/:propertyId" element={<LeaseDeposit />} />
        <Route path="/rent" element={<RentCollection />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/landlord" element={<LandlordDashboard />} />

        {/* Admin-only */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* Legacy placeholder routes */}
        <Route path="/contact" element={<SimplePage title="Contact" text="Get in touch with us." />} />
        <Route path="/wishlist" element={<SimplePage title="Wishlist" text="Your saved properties will appear here." />} />
        <Route path="/map-view" element={<SimplePage title="Map View" text="Map view coming soon." />} />
        <Route path="/my-apartment" element={<SimplePage title="My Current Apartment" text="Your current apartment details." />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
