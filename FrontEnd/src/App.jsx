import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import Signup from "./pages/Signup.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MyGroups from "./pages/MyGroups.jsx";
import GroupLedger from "./pages/GroupLedger.jsx";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-groups" element={<MyGroups />} />
        <Route path="/groups/:groupId" element={<GroupLedger />} />
        <Route
          path="*"
          element={
            <div className="min-h-[60vh] grid place-items-center p-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold">Page not found</h1>
                <Link to="/" className="btn btn-primary mt-4">Go Home</Link>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
