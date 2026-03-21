import React, { useState } from "react";

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: "How do I book an appointment?",
      a: "You can book an appointment online by selecting your preferred doctor, date, and time. You may also contact our reception desk for assistance."
    },
    {
      q: "Do I need to create an account to book an appointment?",
      a: "Yes, creating an account is required to book an appointment. However, you can browse doctors and available services without signing up."
    },
    {
      q: "What should I bring to my appointment?",
      a: "Please bring a valid ID, your insurance card (if applicable), previous medical reports, and a list of any medications you are currently taking."
    },
    {
      q: "Can I reschedule or cancel my appointment?",
      a: "Yes, appointments can be rescheduled or canceled through your account or by contacting our clinic at least 24 hours in advance."
    },
    {
      q: "Do you accept health insurance?",
      a: "Yes, we accept most major insurance providers. Please contact our clinic to confirm whether your insurance plan is supported."
    },
    {
      q: "How early should I arrive for my appointment?",
      a: "We recommend arriving 10–15 minutes early to allow time for check-in and any required paperwork."
    }
  ];

  return (
  /* Removed h-[50vh] and mb-64. Added py-10 for better spacing. */
  <div className="w-full py-12 sm:py-16 flex justify-center items-start px-4 sm:px-6">
    {/* Removed fixed height logic, added h-auto */}
    <div className="w-full max-w-5xl bg-[#e6f6fc] rounded-3xl p-6 sm:p-10 shadow-sm">
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-10">
        Frequently Asked Questions
      </h2>

      <div className="space-y-6">
        {faqs.map((item, index) => (
          <div key={index} className="border-b border-gray-400 pb-4">
            <div
              className="flex justify-between items-center cursor-pointer select-none gap-4"
              onClick={() =>
                setOpenIndex(openIndex === index ? null : index)
              }
            >
              {/* Added text-base for mobile, text-lg for desktop */}
              <h3 className="text-base sm:text-lg font-semibold">Q: {item.q}</h3>
              <span
                className={`text-2xl font-bold text-blue-600 transition-transform duration-300 flex-shrink-0
                  ${openIndex === index ? "rotate-45" : ""}
                `}
              >
                +
              </span>
            </div>

            <div
              className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${openIndex === index ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0"}
              `}
            >
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                {item.a}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
}
