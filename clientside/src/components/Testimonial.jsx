import { useState, useEffect } from "react";
import { testimonialData } from "../assets/TestimonialData";

export default function Testimonial() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonialData.length);
    }, 3500); // smoother pacing,decrease fr fst

    return () => clearInterval(interval);
  }, []);

  const visibleTestimonials = [
    testimonialData[index],
    testimonialData[(index + 1) % testimonialData.length],
  ];

  return (
    <div className="w-full py-10 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-10">What our users say</h1>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleTestimonials.map((item, i) => (
          <div
            key={i}
            className="testi-smooth bg-white p-6 rounded-xl shadow-sm border h-56 flex flex-col justify-between"
          >
            <p className="text-4xl font-bold text-gray-400">“</p>
            <p className="text-gray-600 text-sm leading-relaxed">{item.text}</p>
            <div className="flex items-center gap-3 mt-4">
              <img
                src={item.image}
                className="w-10 h-10 rounded-full object-cover"
              />
              <p className="font-semibold text-gray-800">{item.name}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-6">
        {testimonialData.map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-300 border ${
              i === index ? "bg-blue-600" : "bg-gray-300"
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
}
