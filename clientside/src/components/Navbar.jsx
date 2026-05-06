import React, { useContext, useState, useEffect } from "react";
import { assets } from "../assets/assets";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { getProfilePicUrl, getDefaultAvatarUrl } from "../utils/profileHelpers";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { token, setToken, userData, isPendingProfile, logout } =
    useContext(AppContext);

  const [showMenu, setShowMenu] = useState(false);

  // Navigation guard for protected routes
  const handleNavigation = (path) => {
    if (isPendingProfile && path !== "/complete-profile") {
      navigate("/complete-profile");
      return;
    }
    navigate(path);
  };

  useEffect(() => {
    // Redirect to complete-profile if user is pending profile and not already there
    if (isPendingProfile && location.pathname !== "/complete-profile") {
      navigate("/complete-profile", { replace: true });
    }
  }, [isPendingProfile, location.pathname, navigate]);

  return (
    <div className="flex items-center justify-between text-sm py-4 mb-5 ">
      <p
        onClick={() => navigate({ pathname: "/", hash: "" })}
        className="font-poppins font-extrabold w-36 cursor-pointer text-3xl"
      >
        <span className="text-blue-600">Doc</span>Chain
      </p>
      <ul className="hidden md:flex items-start gap-10 font-medium">
        <NavLink
          to={{ pathname: "/", hash: "" }}
          className={({ isActive }) =>
            `py-1 text-base ${isActive ? "text-blue-500" : "text-gray-500"}`
          }
          onClick={(e) => {
            if (isPendingProfile) {
              e.preventDefault();
              handleNavigation("/");
            }
          }}
        >
          Home
        </NavLink>

        <NavLink
          to="/doctors"
          className={({ isActive }) =>
            `py-1 text-base ${isActive ? "text-blue-500" : "text-gray-500"}`
          }
          onClick={(e) => {
            if (isPendingProfile) {
              e.preventDefault();
              handleNavigation("/doctors");
            }
          }}
        >
          Doctor Booking
        </NavLink>

        <NavLink
          to="/about"
          className={({ isActive }) =>
            `py-1 text-base ${isActive ? "text-blue-500" : "text-gray-500"}`
          }
          onClick={(e) => {
            if (isPendingProfile) {
              e.preventDefault();
              handleNavigation("/about");
            }
          }}
        >
          About
        </NavLink>

        <NavLink
          to="/contact"
          className={({ isActive }) =>
            `py-1 text-base ${isActive ? "text-blue-500" : "text-gray-500"}`
          }
          onClick={(e) => {
            if (isPendingProfile) {
              e.preventDefault();
              handleNavigation("/contact");
            }
          }}
        >
          Contact
        </NavLink>

        <button
          onClick={() => handleNavigation("/join-doctor")}
          className="border border-blue-600 text-blue-600 px-5 py-2 rounded-full text-base hover:bg-blue-600 hover:text-white transition"
        >
          Join as Doctor
        </button>
      </ul>

      <div className="flex items-center gap-4">
        {token && userData ? (
          <div className="flex items-center gap-2 cursor-pointer group relative">
            <img
              className="w-8 rounded-full"
              src={getProfilePicUrl(userData, true) || getDefaultAvatarUrl()}
              alt="Profile"
              loading="lazy"
              onError={(e) => {
                e.target.src = getDefaultAvatarUrl();
              }}
            />
            <img className="w-2.5" src={assets.dropdown_icon} alt="" />
            <div className="absolute top-0 right-0 pt-14 text-base font-medium text-gray-600 z-20 hidden group-hover:block">
              <div className="min-w-48 bg-stone-100 rounded flex flex-col gap-4 p-4">
                <p
                  onClick={() => handleNavigation("/my-profile")}
                  className="hover:text-black cursor-pointer"
                >
                  My Profile
                </p>
                <p
                  onClick={() => handleNavigation("/my-appointments")}
                  className="hover:text-black cursor-pointer"
                >
                  My Appointments
                </p>
                <p onClick={logout} className="hover:text-black cursor-pointer">
                  Logout
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/login?mode=signup")}
              className="border border-primary text-primary px-6 py-3 rounded-full font-semibold hidden md:block hover:bg-primary hover:text-white transition"
            >
              Signup
            </button>
            <button
              onClick={() => navigate("/login?mode=login")}
              className="bg-primary text-white px-8 py-3 rounded-full font-semibold hidden md:block"
            >
              Login
            </button>
          </div>
        )}
        <img
          onClick={() => setShowMenu(true)}
          className="w-6 md:hidden"
          src={assets.menu_icon}
          alt=""
        />
        {/* ---------- Mobile Menu ---------- */}
        <div
          className={`${
            showMenu ? "fixed w-full" : "h-0 w-0"
          } md:hidden right-0 top-0 bottom-0 z-20 overflow-hidden bg-white transition-all`}
        >
          <div className="flex items-center justify-between px-5 py-6">
            <img className="w-36" src={assets.logo} alt="" />
            <img
              className="w-7"
              onClick={() => setShowMenu(false)}
              src={assets.cross_icon}
              alt=""
            />
          </div>
          <ul className="flex flex-col items-center gap-2 mt-5 px-5 text-lg font-medium">
            <NavLink
              onClick={() => setShowMenu(false)}
              to={{ pathname: "/", hash: "" }}
              onMouseDown={(e) => {
                if (isPendingProfile) {
                  e.preventDefault();
                  handleNavigation("/");
                  setShowMenu(false);
                }
              }}
            >
              <p className="px-4 py-2 rounded inline-block">HOME</p>
            </NavLink>
            <NavLink
              onClick={() => setShowMenu(false)}
              to="/doctors"
              onMouseDown={(e) => {
                if (isPendingProfile) {
                  e.preventDefault();
                  handleNavigation("/doctors");
                  setShowMenu(false);
                }
              }}
            >
              <p className="px-4 py-2 rounded inline-block">ALL DOCTORS</p>
            </NavLink>
            <NavLink
              onClick={() => setShowMenu(false)}
              to="/about"
              onMouseDown={(e) => {
                if (isPendingProfile) {
                  e.preventDefault();
                  handleNavigation("/about");
                  setShowMenu(false);
                }
              }}
            >
              <p className="px-4 py-2 rounded inline-block">ABOUT</p>
            </NavLink>
            <NavLink
              onClick={() => setShowMenu(false)}
              to="/contact"
              onMouseDown={(e) => {
                if (isPendingProfile) {
                  e.preventDefault();
                  handleNavigation("/contact");
                  setShowMenu(false);
                }
              }}
            >
              <p className="px-4 py-2 rounded inline-block">CONTACT</p>
            </NavLink>
            <NavLink
              onClick={() => setShowMenu(false)}
              to="/join-doctor"
              onMouseDown={(e) => {
                if (isPendingProfile) {
                  e.preventDefault();
                  handleNavigation("/join-doctor");
                  setShowMenu(false);
                }
              }}
            >
              <p className="px-4 py-2 rounded inline-block text-blue-600">
                JOIN AS DOCTOR
              </p>
            </NavLink>
            <NavLink onClick={() => setShowMenu(false)} to="/login?mode=signup">
              <p className="px-4 py-2 rounded inline-block border border-primary text-primary">
                SIGNUP
              </p>
            </NavLink>
            <NavLink onClick={() => setShowMenu(false)} to="/login?mode=login">
              <p className="px-4 py-2 rounded inline-block bg-primary text-white">
                LOGIN
              </p>
            </NavLink>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
