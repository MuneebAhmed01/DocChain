import React, { useState } from "react";

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: "How to book an appointment?",
      a: "Lorem ipsum dolor sit amet consectetur. Vestibulum augue sit libero amet laoreet etiam mattis cras ullamcorper. Morbi donec morbi sit mollis. Eget non aliquet ut ut. Id massa at mattis est tellus a.",
    },
    { q: "How to book an appointment?", a: "" },
    { q: "How to book an appointment?", a: "" },
    { q: "How to book an appointment?", a: "" },
  ];

  return (
    <div className="w-full h-[50vh] mb-64 flex justify-center items-center px-6">
      <div className="w-full max-w-5xl bg-[#e6f6fc] rounded-3xl p-10 shadow-sm overflow-y-auto">
        <h2 className="text-4xl font-bold text-center mb-10">Frequently Asked Questions</h2>

        <div className="space-y-6">
          {faqs.map((item, index) => (
            <div key={index} className="border-b border-gray-400 pb-4">
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setOpenIndex(index === openIndex ? null : index)}
              >
                <h3 className="text-lg font-semibold">Q: {item.q}</h3>
                <span className="text-2xl font-bold text-blue-600">
                  {openIndex === index ? "-" : "+"}
                </span>
              </div>

              {openIndex === index && item.a && (
                <p className="mt-3 text-gray-700 leading-relaxed">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
