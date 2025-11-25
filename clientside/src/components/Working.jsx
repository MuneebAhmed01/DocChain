// Working.jsx
import React from "react";

const steps = [
  {
    title: "Explore Services",
    desc: "Browse our platform to find the healthcare service you need—doctor appointments, lab tests, or health packages.",
  },
  {
    title: "Book Online",
    desc: "Easily schedule appointments or tests with just a few clicks, choosing a time that works best for you.",
  },
  {
    title: "Get Expert Care",
    desc: "Consult with top doctors or visit diagnostic centers for tests, ensuring high-quality healthcare.",
  },
  {
    title: "Access Reports",
    desc: "View and download your medical reports securely from your profile, anytime, anywhere.",
  },
  {
    title: "Stay on Track",
    desc: "Receive reminders, health tips, and recommendations tailored to your needs.",
  },
];

const Working = () => {
  return (
    // Outer div cancels App's horizontal margin for full-width background
    <div className="relative -mx-4 sm:-mx-[3.2%] py-16 mt-6 ">
      {/* Full-width background */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-100 to-pink-100 z-0 "></div>

      {/* Inner content respects App's global margins */}
      <div className="relative z-10 mx-4 sm:mx-[10%]">
        <h2 className="text-4xl font-bold text-center mb-12">How it works</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative bg-white/70 backdrop-blur-md border border-gray-200 rounded-3xl p-4 px-3 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all duration-300 min-w-[180px]"
            >
              {/* Number badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-full text-base font-semibold shadow">
                {(i + 1).toString().padStart(2, "0")}
              </div>

              {/* Title */}
              <h3 className="mt-6 text-md font-semibold">{step.title}</h3>

              {/* Description */}
              <p className="text-gray-600 text-sm mt-2 leading-snug">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Working;
