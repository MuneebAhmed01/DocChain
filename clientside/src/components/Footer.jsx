import React from "react";

export default function Footer() {
  return (
    <footer className="bg-[#1a1a1a] text-white  mt-16 relative -mx-4 sm:-mx-[3.2%] pt-16 ">
      {/* Top Banner */}
      <div className="w-full flex justify-center px-4 -mt-28">
        <div className="bg-gradient-to-r from-blue-500 to-blue-700 rounded-3xl shadow-xl w-full max-w-5xl p-8 flex flex-col md:flex-row items-center justify-between text-center md:text-left">
          <div>
            <h2 className="text-3xl font-bold">Need Urgent Help</h2>
            <p className="text-lg mt-2">Contact Emergency Service Now</p>
          </div>
          <button className="mt-4 md:mt-0 bg-white text-blue-600 font-semibold px-6 py-3 rounded-full shadow-md flex items-center gap-2">
            <span>📞</span> Contact Now
          </button>
        </div>
      </div>

      {/* Footer Main */}
      <div className=" max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        {/* Logo + Description */}
        <div>
          <h1 className="text-2xl font-bold tracking-wide">
            <span className="text-white">DEZO</span>
            <span className="text-gray-400">CARE</span>
          </h1>
          <p className="text-gray-400 mt-2 leading-relaxed">
            We offers 24/7 access to healthcare services, empowering you to stay
            healthy without stepping outside
          </p>

          {/* Social Icons */}
          <div className="flex gap-4 mt-6 text-2xl">
            <span>📸</span>
            <span>📘</span>
            <span>▶️</span>
          </div>
        </div>

        {/* Contact Us */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
          <ul className="text-gray-400 space-y-3">
            <li>✉️ info@DEZOcare.com</li>
            <li>📍 44 Batesford Rd, Malvern East VIC 3144</li>
          </ul>
        </div>

        {/* Pages */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Pages</h3>
          <ul className="text-gray-400 space-y-3">
            <li>Doctor Booking</li>
            <li>Lab Test Booking</li>
            <li>Emergency Support</li>
          </ul>
        </div>

        {/* Other */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Other</h3>
          <ul className="text-gray-400 space-y-3">
            <li>Home</li>
            <li>About</li>
            <li>Privacy Policy</li>
          </ul>
        </div>
      </div>

      <div className="text-center text-gray-600 py-3  border-t  border-gray-700 text-sm">
        © 2024 DEZOcare.com
      </div>
    </footer>
  );
}
