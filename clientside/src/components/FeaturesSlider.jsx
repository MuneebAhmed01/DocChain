import { useEffect, useState, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function FeaturesSlider() {
  const cards = [
  {
    title: "Doctor Booking",
    desc: "Easily find and book consultations with trusted specialists and general practitioners in just a few clicks",
    to: "/doctors",
  },
  {
    title: "Appointment Reminders",
    desc: "Get timely reminders so you never miss your scheduled consultations",
    to: "/doctors",
  },
  {
    title: "Specialist Search",
    desc: "Filter and find doctors by speciality, experience, and availability to make the best choice for your health",
    to: "/doctors",
  },
  {
    title: "Secure Records",
    desc: "Keep your medical history and appointments organized securely in one place",
    to: "/doctors",
  },
  ];

  const [active, setActive] = useState(0);
  const [blinkLeft, setBlinkLeft] = useState(false);
  const [blinkRight, setBlinkRight] = useState(false);

//👉 TALAL made changes to moveLeft and moveRight functions for infinite looping 
// If you are on the first card and click left, it jumps to the last card
 const moveLeft = () => {
  const next = (active - 1 + cards.length) % cards.length;
  setActive(next);
  setBlinkLeft(true);
  setTimeout(() => setBlinkLeft(false), 200);
};

  const moveRight = () => {
    const next = (active + 1) % cards.length;
    setActive(next);
    setBlinkRight(true);
    setTimeout(() => setBlinkRight(false), 200);
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") moveLeft();
      if (e.key === "ArrowRight") moveRight();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

//👉 TALAL added useRef and useEffect to scroll the active card into view when it changes
  const sliderRef = useRef(null);

  useEffect(() => {
  if (!sliderRef.current) return;

  const card = sliderRef.current.children[active];
  if (card) {
    card.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
  }
}, [active]);

  return (
    <div className="w-full flex flex-col items-start gap-6 px-2 sm:px-4 md:px-0 mt-6 sm:mt-10 scroll-mt-24" id="features">
      
      {/* Heading */}
      <div className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4">
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            Your One-Stop Health Hub
          </h1>

          <div className="flex gap-3 sm:gap-4 sm:ml-auto">
            {/* Left */}
            <button
              onClick={moveLeft}
              className={`p-2 sm:p-3 rounded-full border transition-all duration-200
            ${blinkLeft ? "bg-blue-600 text-white" : "bg-white text-black"}`}
            >
              <ArrowLeft size={20} />
            </button>

            {/* Right */}
            <button
              onClick={moveRight}
              className={`p-2 sm:p-3 rounded-full border transition-all duration-200
            ${blinkRight ? "bg-blue-600 text-white" : "bg-white text-black"}`}
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

        <p className="text-gray-500 max-w-full sm:max-w-xl mt-2 text-sm sm:text-base">
          From booking doctors to lab tests and beyond, we bring all your
          healthcare needs together under one roof — accessible anytime,
          anywhere
        </p>
      </div>

      {/* Cards */}
      <div ref={sliderRef} className="flex lg:grid lg:grid-cols-4 gap-4 sm:gap-6 w-full overflow-x-auto lg:overflow-visible">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`p-5 sm:p-6 rounded-3xl transition-all duration-300 border shadow-sm cursor-pointer select-none flex-none w-[85%] sm:w-[60%] lg:w-auto
          ${
            active === i
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-black border-gray-200"
          }`}
          >
            <div
              className={`text-xl sm:text-2xl mb-2 ${
                active === i ? "text-blue-100" : "text-primary"
              }`}
            >
              ⌘
            </div>

            <h2
              className={`text-sm sm:text-base font-semibold mb-1 ${
                active === i ? "text-white" : "text-black"
              }`}
            >
              {card.title}
            </h2>

            <p
              className={`text-xs sm:text-sm leading-snug ${
                active === i ? "text-blue-100" : "text-gray-500"
              }`}
            >
              {card.desc}
            </p>

            <Link
              to={card.to}
              className={`underline mt-2 inline-block text-sm font-medium cursor-pointer
    transition-transform duration-200 ease-out
    hover:-translate-y-0.5
    ${active === i ? "text-white" : "text-blue-800"}
  `}
            >
              Learn More
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}