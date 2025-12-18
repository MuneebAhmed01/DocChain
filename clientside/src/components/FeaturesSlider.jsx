import { useEffect, useState } from "react";
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
      title: "Lab Test Booking",
      desc: "Schedule a wide range of diagnostic tests online with accurate and timely results delivered to you securely",
      to: "/labtest",
    },
    {
      title: "Online Consultation",
      desc: "Connect with healthcare professionals virtually for expert advice from the comfort of your home",
      to: "/online-consult",
    },
    {
      title: "Emergency Services",
      desc: "Quickly locate nearby emergency healthcare facilities and connect with emergency response teams",
      to: "/emergency",
    },
  ];

  const [active, setActive] = useState(0);
  const [blinkLeft, setBlinkLeft] = useState(false);
  const [blinkRight, setBlinkRight] = useState(false);

  const moveLeft = () => {
    if (active === 0) return;
    setActive(active - 1);
    setBlinkLeft(true);
    setTimeout(() => setBlinkLeft(false), 200);
  };

  const moveRight = () => {
    if (active === cards.length - 1) return;
    setActive(active + 1);
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

  return (
    <div className="w-full flex flex-col items-start gap-6 p-6 mt-10" id="features">
      {/* Heading */}

      <div className="w-full">
        <div className="flex items-center justify-between w-full self-stretch">
          <h1 className="text-4xl font-bold">Your One-Stop Health Hub</h1>

          <div className="flex gap-4 ml-auto mt-2">
            {/* Left */}
            <button
              onClick={moveLeft}
              className={`p-3 rounded-full border transition-all duration-200
            ${blinkLeft ? "bg-blue-600 text-white" : "bg-white text-black"}`}
            >
              <ArrowLeft size={20} />
            </button>

            {/* Right */}
            <button
              onClick={moveRight}
              className={`p-3 rounded-full border transition-all duration-200
            ${blinkRight ? "bg-blue-600 text-white" : "bg-white text-black"}`}
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
        <p className="text-gray-500 max-w-xl mt-2">
          From booking doctors to lab tests and beyond, we bring all your
          healthcare needs together under one roof — accessible anytime,
          anywhere
        </p>
      </div>
      {/* Arrows */}

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`p-5 rounded-3xl transition-all duration-300 border shadow-sm cursor-pointer select-none
        ${
          active === i
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white text-black border-gray-200"
        }`}
          >
            <div
              className={`text-2xl mb-2 ${
                active === i ? "text-blue-100" : "text-primary"
              }`}
            >
              ⌘
            </div>

            <h2
              className={`text-base font-semibold mb-1 ${
                active === i ? "text-white" : "text-black"
              }`}
            >
              {card.title}
            </h2>

            <p
              className={`text-sm leading-snug ${
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
