import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { clearUser } from "../redux/authSlice";
import { api } from "../utils/api";

export default function Navbar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Get auth state from Redux
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  // Handle logout
  const handleLogout = async () => {
    try {
      await api("/logout", { method: "POST" });
      dispatch(clearUser());
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err.message);
    }
  };

  return (
    <div className="navbar sticky top-0 z-40 bg-white/60 backdrop-blur-md border-base-200">
      <div className="container mx-auto px-4 flex items-center justify-between gap-4">
        {/* Left */}
        <div className="flex items-center">
          <Link
            to="/"
            className="text-3xl font-extrabold tracking-tight text-emerald-600"
          >
            Cooper
          </Link>
        </div>

        {/* Center (hidden on small) */}
        <div className="hidden md:flex items-center gap-6"></div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            // Profile dropdown when logged in
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="avatar cursor-pointer">
                <div className="w-10 rounded-full ring ring-emerald-500 ring-offset-2">
                  <img
                    src={
                      user.photoUrl ||
                      "https://geographyandyou.com/images/user-profile.png"
                    }
                    alt="Profile"
                  />
                </div>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
              >
                <li className="menu-title">
                  <span>
                    {user.firstName} {user.lastName}
                  </span>
                </li>
                <li>
                  <Link to="/dashboard">Dashboard</Link>
                </li>
                <li>
                  <a onClick={handleLogout}>Logout</a>
                </li>
              </ul>
            </div>
          ) : (
            // Login and Signup buttons when not authenticated
            <>
              <Link
                to="/login"
                className="btn btn-link text-emerald-600 no-underline"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="btn btn-primary bg-emerald-500 border-none text-white"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
