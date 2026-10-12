import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import TourRequests from "./pages/TourRequests.jsx";
import LeaseDeposit from "./pages/LeaseDeposit.jsx";
import RentCollection from "./pages/RentCollection.jsx";
import Inbox from "./pages/Inbox.jsx";
import LandlordDashboard from "./pages/LandlordDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Applications from "./pages/Applications.jsx";
import Contracts from "./pages/Contracts.jsx";

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

// Route guard for pages that need a signed-in user.
//
// Waits for authReady before deciding. currentUser is null both while
// the "who am I" request is still in flight and when the visitor is
// genuinely signed out, so redirecting on currentUser alone would kick
// every signed-in user to /login on a slow connection or a hard refresh.
//
// The attempted URL travels to /login as `state.from` so Login can
// return them there after signing in.
function RequireAuth({ children }) {
  const { currentUser, authReady } = useApp();
  const location = useLocation();

  if (!authReady) return null;
  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
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

        {/* Feature modules — every one of these calls an authenticated
            endpoint, so a signed-out visitor is sent to sign in before
            the page renders rather than after filling in a form. */}
        <Route path="/tour/:propertyId" element={<RequireAuth><TourScheduling /></RequireAuth>} />
        <Route path="/tour-requests" element={<RequireAuth><TourRequests /></RequireAuth>} />
        <Route path="/lease/:propertyId" element={<RequireAuth><LeaseDeposit /></RequireAuth>} />
        <Route path="/rent" element={<RequireAuth><RentCollection /></RequireAuth>} />
        <Route path="/inbox" element={<RequireAuth><Inbox /></RequireAuth>} />
        <Route path="/applications" element={<RequireAuth><Applications /></RequireAuth>} />
        <Route path="/contracts" element={<RequireAuth><Contracts /></RequireAuth>} />
        <Route path="/landlord" element={<RequireAuth><LandlordDashboard /></RequireAuth>} />

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
