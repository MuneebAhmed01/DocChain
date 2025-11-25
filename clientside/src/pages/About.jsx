import { motion } from "framer-motion";
import Testimonial from '../components/Testimonial'
import { assets } from "../assets/assets";
const uploadedImage = "/mnt/data/3a410c91-3ce1-42d7-abea-5b95454402b5.png";
import { Link } from "react-router-dom";
const items = [
{ id: "001", title: "Path to Wellness", desc: "Our vision is to empower patients through personalized care" },
{ id: "002", title: "Mental Health Services", desc: "Counseling, therapy, and psychiatric care for mental health conditions." },
{ id: "003", title: "Diagnostic Services", desc: "medical procedures and tests used to identify diseases" },
{ id: "004", title: "Beyond Medicine", desc: "We are ready to serve you with pleasure and fast response" },
{ id: "005", title: "Pediatric Care", desc: "Comprehensive healthcare services for infants, children, adolescents." },
{ id: "006", title: "Telehealth Services", desc: "Remote consultations and follow-up appointments via video or phone." },
{ id: "007", title: "Future of Care", desc: "We are ready to serve you with pleasure and fast response" },
{ id: "008", title: "Holistic Health", desc: "Holistic health is an approach to well-being that considers person" },
];


export default function About() {
  return (<>
    <section className="h-[40vh] min-h-[320px] w-full flex flex-col items-center justify-center text-center px-4 bg-gradient-to-b from-white to-purple-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto"
      >
        <p className="text-sm text-purple-500 mb-2">About Us</p>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
          Discover Our Mission and Values in Patient-Centered Healthcare
        </h1>
        <p className="text-gray-600 text-sm md:text-base mb-6">
          We are dedicated to providing exceptional healthcare through a compassionate,
          patient-centered approach.
        </p>
         <Link to="/contact"><button className="px-6 py-3 rounded-full text-sm md:text-base bg-purple-500 text-white hover:bg-purple-600 transition\"  >Contact us</button></Link>
      </motion.div>
    </section>

    {/*  trusted section */}
    <section className="h-[60vh] min-h-[420px] mt-10 w-full px-6 md:px-12 py-10 flex flex-col gap-10 justify-center bg-white">
{/* Top Content */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
{/* Left Text */}
<div>
<h2 className="text-3xl md:text-4xl font-bold leading-tight mb-4">
Your Trusted <br /> Healthcare <br /> Providers
</h2>
<p className="text-gray-600 text-sm md:text-base mb-4 max-w-sm">
Public does not participate in payment for order flow as a source of revenue. Instead, we route all orders directly.
</p>
<button className="px-6 py-3 rounded-full bg-purple-500 text-white hover:bg-purple-600 transition text-sm md:text-base flex items-center gap-2">
Make a schedule <span className="text-lg">→</span>
</button>
</div>


{/* Center Card */}
<motion.div
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6 }}
className="bg-gradient-to-br from-purple-200 to-purple-400 p-4 rounded-2xl shadow-lg"
>
<img
src="/mnt/data/a8c5555e-3995-4ffe-a1fd-7d23c00b7997.png"
alt="Service preview"
className="rounded-xl w-full h-auto object-cover"
/>
</motion.div>


{/* Right Card */}
<div className="bg-white rounded-2xl shadow p-4">
<h3 className="font-semibold text-lg mb-1">Analysis your physical performance from anywhere</h3>
<p className="text-gray-600 text-sm mb-4">
Body mass index (BMI), skinfold measurements, or bioelectrical impedance analysis.
</p>
<img
src="/mnt/data/a8c5555e-3995-4ffe-a1fd-7d23c00b7997.png"
alt="People analysis"
className="rounded-xl w-full h-auto object-cover"
/>
</div>
</div>


{/* Stats Section */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="bg-white shadow rounded-xl p-6 flex flex-col items-center text-center">
<h3 className="text-3xl font-bold">100%</h3>
<p className="text-gray-600 text-sm">Our Doctors Certified</p>
</div>
<div className="bg-white shadow rounded-xl p-6 flex flex-col items-center text-center">
<h3 className="text-3xl font-bold">25M+</h3>
<p className="text-gray-600 text-sm">Happy global users</p>
</div>
<div className="bg-white shadow rounded-xl p-6 flex flex-col items-center text-center">
<h3 className="text-3xl font-bold">99%</h3>
<p className="text-gray-600 text-sm">Satisfying treatment</p>
</div>
</div>
</section>

{/* our goal section */}
<section className="h-[40vh] min-h-[320px] w-full px-6 mt-10 md:px-12 py-8 flex items-center justify-center">
<div className="w-full bg-white shadow-md rounded-3xl p-6 md:p-10 flex flex-col md:flex-row items-center justify-between">
{/* Left Text Section */}
<motion.div
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6 }}
className="max-w-xl"
>
<h2 className="text-3xl md:text-4xl font-bold leading-snug mb-4">
Let's know about our <br /> main goal
</h2>


<p className="text-gray-600 text-sm md:text-base mb-6">
We aim to offer clear and comprehensive information about our services, conditions treated,
and treatment options. This ensures that patients can make informed decisions about their healthcare.
</p>


{/* Bullet List */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm md:text-base text-gray-700">
<p>✔️ Providing Accessible Information</p>
<p>✔️ Building Trust</p>
<p>✔️ Enhancing Patient Engagement</p>
<p>✔️ Community Involvement</p>
<p>✔️ Promoting Health Education</p>
<p>✔️ Security and Privacy</p>
</div>
</motion.div>


{/* Right Side Placeholder for Your Image */}
<div className=" md:block w-1/3 h-full flex items-center justify-center">
{/* Replace this div with your <img src="..." /> */}
<img src={assets.doc9}/>
</div>
</div>
</section>

{/* key vision card  */}
<section className="w-full max-w-6xl mx-auto p-4 mt-10">
{/* top heading with optional uploaded hero image */}
<div className="mb-4 flex items-center gap-4">
<div className="flex-1">
<h2 className="text-2xl sm:text-3xl font-semibold text-center">Here are some key vision</h2>
<p className="text-sm text-gray-500 text-center">We are committed to upholding the highest standards of medical excellence while ensuring each patient feels valued and heard.</p>
</div>

</div>


{/* Cards container - constrained to 40vh and responsive */}
<div
className="bg-white rounded-2xl p-3 shadow-sm mt-10"
style={{
maxHeight: "40vh", // the user's requirement: max 40vh
}}
>
{/* Make the grid scrollable if content overflows */}
<div className="overflow-y-visible  h-full pr-2">
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
{items.map((it) => (
<article
key={it.id}
className="relative bg-gray-50 rounded-xl p-4 flex flex-col justify-between min-h-[6.5rem] shadow-inner "
>
{/* number badge top-left */}
<div className="absolute -top-3 left-3 bg-white/80 backdrop-blur rounded-full px-3 py-1 text-xs font-medium border border-gray-100 shadow">
{it.id}
</div>


{/* bulb icon top-right */}
<div className="absolute -top-3 right-3  ">
<div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center border border-gray-100 shadow-sm">
{/* simple bulb SVG icon */}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4">
<path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M9 18h6M10 22h4M12 2a6 6 0 0 0-4 10c.36.36.72.76 1 1.2V16a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2.8c.28-.44.64-.84 1-1.2a6 6 0 0 0-4-10z" />
</svg>
</div>
</div>


<div className="pt-3">
<h3 className="text-sm font-semibold mb-1">{it.title}</h3>
<p className="text-xs text-gray-500 line-clamp-3">{it.desc}</p>
</div>


{/* optional footer or small action */}
<div className="mt-3">
<button className="text-xs text-indigo-600 font-medium">Learn more →</button>
</div>
</article>
))}
</div>
</div>
</div>

</section>
<div className="mt-10"></div>
<Testimonial/>
</>
  );
}
