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
    <div className="relative -mx-4 sm:-mx-[3.2%] py-12 sm:py-16 lg:py-20 mt-6">

      <div className="absolute inset-0 bg-gradient-to-r from-violet-100 to-pink-100 z-0"></div>

      <div className="relative z-10 mx-4 sm:mx-[8%] lg:mx-[10%]">

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-10 sm:mb-12">
          How it works
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 sm:gap-6">

          {steps.map((step, i) => (
            <div
              key={i}
              className="relative bg-white/70 backdrop-blur-md border border-gray-200 rounded-3xl p-5 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-sm sm:text-base font-semibold shadow">
                {(i + 1).toString().padStart(2, "0")}
              </div>

              <h3 className="mt-6 text-sm sm:text-base font-semibold">
                {step.title}
              </h3>

              <p className="text-gray-600 text-xs sm:text-sm mt-2 leading-snug">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Working;