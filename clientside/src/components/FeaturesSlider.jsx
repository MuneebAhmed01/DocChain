import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function FeaturesSlider() {
  const cards = [
    {
      title: "Doctor Booking",
      desc: "Easily find and book consultations with trusted specialists and general practitioners in just a few clicks",
      details:
        "Browse verified doctors, compare availability, and reserve appointments from the landing page without extra steps. The booking flow is designed to stay quick, clear, and patient friendly from start to finish.",
      highlights: [
        "Search doctors by specialty and schedule",
        "Review availability before confirming",
        "Book consultations in just a few steps",
      ],
    },
    {
      title: "Appointment Reminders",
      desc: "Get timely reminders so you never miss your scheduled consultations",
      details:
        "Automatic reminders help patients stay prepared for every consultation. Clear alerts reduce missed visits and make it easier to manage upcoming appointments with confidence.",
      highlights: [
        "Receive timely reminders before each visit",
        "Stay informed about upcoming consultations",
        "Reduce missed or forgotten appointments",
      ],
    },
    {
      title: "Specialist Search",
      desc: "Filter and find doctors by speciality, experience, and availability to make the best choice for your health",
      details:
        "Explore a more focused way to discover specialists based on the care you need. Patients can compare options using meaningful filters and quickly identify the right fit for their treatment journey.",
      highlights: [
        "Filter doctors by specialty and experience",
        "Compare profiles that match your needs",
        "Choose the right specialist faster",
      ],
    },
    {
      title: "Secure Records",
      desc: "Keep your medical history and appointments organized securely in one place",
      details:
        "Health information stays organized in one secure experience, helping patients review medical history, appointments, and care details whenever they need them.",
      highlights: [
        "Keep records organized in one place",
        "Access your health history when needed",
        "Protect sensitive information with secure storage",
      ],
    },
  ];

  const [active, setActive] = useState(0);
  const [blinkLeft, setBlinkLeft] = useState(false);
  const [blinkRight, setBlinkRight] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

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
      if (selectedCard !== null && e.key === "Escape") {
        setSelectedCard(null);
        return;
      }

      if (selectedCard !== null) return;

      if (e.key === "ArrowLeft") moveLeft();
      if (e.key === "ArrowRight") moveRight();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, selectedCard]);

  useEffect(() => {
    if (selectedCard === null) {
      document.body.style.overflow = "";
      return undefined;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedCard]);

  //👉 TALAL added useRef and useEffect to scroll the active card into view when it changes
  const sliderRef = useRef(null);

  useEffect(() => {
    if (!sliderRef.current) return;

    const container = sliderRef.current;
    const card = container.children[active];
    if (!card) return;

    const canScrollHorizontally = container.scrollWidth > container.clientWidth;
    if (!canScrollHorizontally) return;

    // Keep slider navigation horizontal-only to avoid pulling the full page down.
    const targetLeft = card.offsetLeft - container.offsetLeft;
    container.scrollTo({ left: targetLeft, behavior: "smooth" });
  }, [active]);

  return (
    <div
      className="w-full flex flex-col items-start gap-6 px-2 sm:px-4 md:px-0 mt-6 sm:mt-10 scroll-mt-24"
      id="features"
    >
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
      <div
        ref={sliderRef}
        className="flex lg:grid lg:grid-cols-4 gap-4 sm:gap-6 w-full overflow-x-auto lg:overflow-visible"
      >
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

            <button
              type="button"
              onClick={() => setSelectedCard(i)}
              className={`underline mt-2 inline-block text-sm font-medium cursor-pointer
    transition-transform duration-200 ease-out
    hover:-translate-y-0.5
    bg-transparent border-none p-0 text-left
    ${active === i ? "text-white" : "text-blue-800"}
  `}
            >
              Learn More
            </button>
          </div>
        ))}
      </div>

      {selectedCard !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 sm:px-6"
          onClick={() => setSelectedCard(null)}
          role="presentation"
        >
          <div
            className="testi-smooth relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feature-modal-title"
          >
            <button
              type="button"
              onClick={() => setSelectedCard(null)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-xl text-gray-600 transition-colors duration-200 hover:bg-gray-100 hover:text-black"
              aria-label="Close details"
            >
              ×
            </button>

            <div className="pr-10">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                Feature Details
              </p>
              <h3
                id="feature-modal-title"
                className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl"
              >
                {cards[selectedCard].title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
                {cards[selectedCard].details}
              </p>

              <div className="mt-6 rounded-2xl bg-blue-50 p-4 sm:p-5">
                <p className="text-sm font-semibold text-blue-900">
                  What this helps with
                </p>
                <ul className="mt-3 space-y-3 text-sm text-blue-950 sm:text-base">
                  {cards[selectedCard].highlights.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
