import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Profile from "./pages/Profile.jsx";

function SimplePage({ title, text }) {
  return (
    <section className="container" style={{ padding: "4rem 1rem" }}>
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />

        {/* Routes used by the authenticated hamburger/navbar. */}
        <Route
          path="/listings"
          element={<SimplePage title="Listings" text="Listings page coming next." />}
        />
        <Route
          path="/contact"
          element={<SimplePage title="Contact" text="Contact page coming next." />}
        />
        <Route
          path="/wishlist"
          element={<SimplePage title="Wishlist" text="Your saved properties will appear here." />}
        />
        <Route
          path="/map-view"
          element={<SimplePage title="Map View" text="Map view coming next." />}
        />
        <Route
          path="/my-apartment"
          element={<SimplePage title="My Current Apartment" text="Your current apartment will appear here." />}
        />
        <Route
          path="/apartments/:id"
          element={<SimplePage title="Apartment Details" text="Apartment details page coming next." />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
