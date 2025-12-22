import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Testimonial from "../components/Testimonial";
import { assets } from "../assets/assets";

/* ================= ANIMATION ================= */
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

/* ================= DATA ================= */
const visionItems = [
  {
    id: "001",
    title: "Path to Wellness",
    desc: "Our vision is to empower patients through personalized care.",
    details:
      "We focus on long-term wellness by creating personalized treatment plans tailored to each patient’s physical, mental, and emotional needs.",
    points: [
      "Personalized treatment plans",
      "Preventive healthcare focus",
      "Lifestyle & wellness guidance",
    ],
  },
  {
    id: "002",
    title: "Mental Health Services",
    desc: "Counseling, therapy, and psychiatric care.",
    details:
      "Our mental health services provide a safe, confidential, and supportive environment for patients dealing with stress, anxiety, depression, and other conditions.",
    points: [
      "Licensed therapists & psychiatrists",
      "Confidential consultations",
      "Evidence-based treatments",
    ],
  },
  {
    id: "003",
    title: "Diagnostic Services",
    desc: "Medical procedures and tests used to identify diseases.",
    details:
      "We use modern diagnostic technology to ensure accurate and early detection, enabling timely and effective treatment decisions.",
    points: [
      "Advanced lab testing",
      "Accurate & fast results",
      "Early disease detection",
    ],
  },
  {
    id: "004",
    title: "Beyond Medicine",
    desc: "Fast response and compassionate service.",
    details:
      "Healthcare is more than prescriptions. We prioritize compassion, communication, and continuous support throughout your journey.",
  },
  {
    id: "005",
    title: "Pediatric Care",
    desc: "Healthcare services for children and adolescents.",
    details:
      "Our pediatric team ensures gentle, age-appropriate care for infants, children, and teenagers in a friendly environment.",
    points: [
      "Child-friendly specialists",
      "Vaccination & growth tracking",
      "Parental guidance",
    ],
  },
  {
    id: "006",
    title: "Telehealth Services",
    desc: "Remote consultations via video or phone.",
    details:
      "Access healthcare from anywhere with secure and convenient virtual consultations, follow-ups, and prescriptions.",
    points: [
      "Video & phone consultations",
      "Remote follow-ups",
      "Secure digital records",
    ],
  },
  {
    id: "007",
    title: "Future of Care",
    desc: "Innovative solutions for modern healthcare.",
    details:
      "We continuously adopt new technologies and data-driven approaches to improve patient outcomes and efficiency.",
  },
  {
    id: "008",
    title: "Holistic Health",
    desc: "Treating the whole person.",
    details:
      "Holistic health focuses on balance between body, mind, and lifestyle for sustainable well-being.",
    points: [
      "Mind-body balance",
      "Nutrition & lifestyle coaching",
      "Stress management",
    ],
  },
];


/* ================= PAGE ================= */
export default function About() {
  const [activeVision, setActiveVision] = useState(null);

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="min-h-[320px] h-[40vh] flex items-center justify-center px-4">
        <motion.div {...fadeUp} className="max-w-3xl text-center">
          <SectionLabel label="About Us" />

          <h1 className="text-3xl md:text-6xl font-semibold mb-4">
            Discover Our Mission and Values in Patient-Centered Healthcare
          </h1>

          <p className="text-gray-600 mb-6">
            We are dedicated to providing exceptional healthcare through a compassionate,
            patient-centered approach.
          </p>

          <Link to="/contact" className="flex justify-center">
            <PrimaryButton label="Contact us" />
          </Link>
        </motion.div>
      </section>

      {/* ================= TRUSTED ================= */}
      <section className="bg-white px-6 md:px-12 py-14 space-y-12">
        <div className="grid md:grid-cols-3 gap-8 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Your Trusted <br /> Healthcare Providers
            </h2>
            <p className="text-gray-600 mb-6 max-w-sm">
              We route all orders directly and maintain complete transparency.
            </p>
            <PrimaryButton label="Make a schedule" />
          </div>

          <motion.div {...fadeUp} className="rounded-2xl shadow-lg p-4">
            <img
              src={assets.about_dummy}
              alt="Healthcare"
              className="rounded-xl w-full object-cover"
            />
          </motion.div>

         <div className="rounded-2xl shadow p-4">
  <h3 className="font-semibold mb-2">
    Simple & Reliable Appointment Scheduling
  </h3>

  <p className="text-sm text-gray-600 mb-4">
    Find available doctors, choose a suitable time, and book appointments
    quickly through an easy-to-use interface.
  </p>

  <img
    src={assets.about_dummy2}
    alt="Doctor appointment scheduling"
    className="rounded-xl w-full "
  />
</div>

        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <StatCard value="100%" label="Certified Doctors" />
          <StatCard value="25M+" label="Happy Global Users" />
          <StatCard value="99%" label="Satisfying Treatment" />
        </div>
      </section>

      {/* ================= GOAL ================= */}
      <section className="px-6 md:px-12 py-14">
        <div className="bg-white rounded-3xl shadow-md p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Let’s know about our main goal
            </h2>
            <p className="text-gray-600 mb-6">
              We offer clear and comprehensive information so patients can make
              informed healthcare decisions.
            </p>

            <ul className="grid sm:grid-cols-2 gap-2 text-sm text-gray-700">
              {[
                "Providing Accessible Information",
                "Building Trust",
                "Enhancing Patient Engagement",
                "Community Involvement",
                "Promoting Health Education",
                "Security and Privacy",
              ].map((item) => (
                <li key={item}>✔️ {item}</li>
              ))}
            </ul>
          </motion.div>

          <img src={assets.doc9} alt="Doctor" className="mx-auto max-h-80" />
        </div>
      </section>

      {/* ================= VISION ================= */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-3xl font-semibold text-center mb-2">
          Here are some key visions
        </h2>
        <p className="text-center text-gray-500 mb-10">
          Upholding the highest standards while ensuring every patient feels heard.
        </p>

        <div className="bg-white rounded-2xl p-4 shadow-sm max-h-[40vh] overflow-y-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {visionItems.map((item) => (
              <VisionCard
                key={item.id}
                {...item}
                onOpen={() => setActiveVision(item)}
              />
            ))}
          </div>
        </div>
      </section>

      {activeVision && (
        <VisionModal
          data={activeVision}
          onClose={() => setActiveVision(null)}
        />
      )}

      <Testimonial />
    </>
  );
}

/* ================= COMPONENTS ================= */

function SectionLabel({ label }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      <span className="h-px w-20 bg-purple-300" />
      <span className="h-2 w-2 rounded-full bg-purple-500" />
      <span className="px-4 py-1 text-sm text-purple-600 border border-purple-300 rounded-full">
        {label}
      </span>
      <span className="h-2 w-2 rounded-full bg-purple-500" />
      <span className="h-px w-20 bg-purple-300" />
    </div>
  );
}

function PrimaryButton({ label }) {
  return (
    <button className="flex items-center gap-3 px-6 py-3 rounded-full text-white bg-gradient-to-r from-purple-400 to-purple-600 hover:opacity-90 transition">
      {label}
      <span className="w-6 h-6 rounded-full border border-white/70 flex items-center justify-center">
        →
      </span>
    </button>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="bg-white shadow rounded-xl p-6 text-center">
      <h3 className="text-3xl font-bold">{value}</h3>
      <p className="text-gray-600 text-sm">{label}</p>
    </div>
  );
}

function VisionCard({ id, title, desc, onOpen }) {
  return (
    <article className="relative bg-gray-50 rounded-xl p-4 shadow-inner min-h-[7rem]">
      <span className="absolute -top-3 left-3 text-xs bg-white px-3 py-1 rounded-full border">
        {id}
      </span>

      <h3 className="text-sm font-semibold mb-1 mt-3">{title}</h3>
      <p className="text-xs text-gray-500 line-clamp-3">{desc}</p>

      <button
        onClick={onOpen}
        className="text-xs text-indigo-600 font-medium mt-3 hover:underline"
      >
        Details →
      </button>
    </article>
  );
}

function VisionModal({ data, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white max-w-md w-full rounded-2xl p-6 relative shadow-xl"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
        >
          ✕
        </button>

        {/* Header */}
        <span className="text-xs text-purple-600 font-medium">
          Vision {data.id}
        </span>

        <h3 className="text-xl font-semibold mt-2 mb-3">
          {data.title}
        </h3>

        {/* Main content */}
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          {data.details}
        </p>

        {/* Optional bullet points */}
        {data.points && (
          <ul className="space-y-2 text-sm text-gray-700">
            {data.points.map((point, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-purple-500">✔</span>
                {point}
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-full bg-purple-500 text-white hover:bg-purple-600"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

