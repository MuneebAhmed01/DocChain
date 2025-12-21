import React, { useContext, useState } from "react";
import { assets } from "../assets/assets";
import { NavLink, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";

const Navbar = () => {
  const navigate = useNavigate();


  const { token, setToken, userData } = useContext(AppContext);

  const [showMenu, setShowMenu] = useState(false);

  const logout = () => {
    setToken(false);
    localStorage.removeItem("token");
  };

  return (
    <div className="flex items-center justify-between text-sm py-4 mb-5 ">
      <p onClick={() => navigate("/")}
        className="font-poppins font-extrabold w-36 cursor-pointer text-3xl"><span className="text-blue-600">Doc</span>Chain</p>
      <ul className="hidden md:flex items-start gap-10 font-medium">
  <NavLink 
    to="/" 
    className={({ isActive }) =>
      `py-1 text-base ${isActive ? "text-blue-500" : "text-gray-500"}`
    }
  >
    Home
  </NavLink>

  <NavLink 
    to="/doctors" 
    className={({ isActive }) =>
      `py-1 text-base ${isActive ? "text-blue-500" : "text-gray-500"}`
    }
  >
    Doctor Booking
  </NavLink>

  <NavLink 
    to="/about" 
    className={({ isActive }) =>
      `py-1 text-base ${isActive ? "text-blue-500" : "text-gray-500"}`
    }
  >
    About
  </NavLink>

  

  <NavLink 
    to="/contact" 
    className={({ isActive }) =>
      `py-1 text-base ${isActive ? "text-blue-500" : "text-gray-500"}`
    }
  >
    Contact
  </NavLink>
  <button
  onClick={() => navigate("/join-doctor")}
  className="border border-blue-600 text-blue-600 px-5 py-2 rounded-full text-base hover:bg-blue-600 hover:text-white transition"
>
  Join as Doctor
</button>

</ul>

      <div className="flex items-center gap-4">
        {token && userData ? (
          <div className="flex items-center gap-2 cursor-pointer group relative">
            <img className="w-8 rounded-full" src={userData.image} alt="" />
            <img className="w-2.5" src={assets.dropdown_icon} alt="" />
            <div className="absolute top-0 right-0 pt-14 text-base font-medium text-gray-600 z-20 hidden group-hover:block">
              <div className="min-w-48 bg-stone-100 rounded flex flex-col gap-4 p-4">
                <p
                  onClick={() => navigate("/my-profile")}
                  className="hover:text-black cursor-pointer"
                >
                  My Profile
                </p>
                <p
                  onClick={() => navigate("/my-appointments")}
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
          <button
            onClick={() => navigate("/login")}
            className="bg-primary text-white px-8 py-3 rounded-full font-semibold hidden md:block"
          >
            Create Account
          </button>
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
            <NavLink onClick={() => setShowMenu(false)} to="/">
              <p className="px-4 py-2 rounded inline-block">HOME</p>
            </NavLink>
            <NavLink onClick={() => setShowMenu(false)} to="/doctors">
              <p className="px-4 py-2 rounded inline-block">ALL DOCTORS</p>
            </NavLink>
            <NavLink onClick={() => setShowMenu(false)} to="/about">
              <p className="px-4 py-2 rounded inline-block">ABOUT</p>
            </NavLink>
            <NavLink onClick={() => setShowMenu(false)} to="/contact">
              <p className="px-4 py-2 rounded inline-block">CONTACT</p>
            </NavLink>
            <NavLink onClick={() => setShowMenu(false)} to="/join-doctor">
  <p className="px-4 py-2 rounded inline-block text-blue-600">
    JOIN AS DOCTOR
  </p>
</NavLink>

          </ul>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
