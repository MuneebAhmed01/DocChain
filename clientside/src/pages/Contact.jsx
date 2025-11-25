import React, { useState } from "react";

// ContactAndLocation.jsx
// Frontend-only React component (Tailwind CSS classes used)
// - Height: each section ~120vh
// - Responsive layout matching the provided screenshot
// - Form submits to POST /api/contact (you will implement backend/Nodemailer later)
// - Map image is used from the uploaded file path: /mnt/data/277dd00c-9352-4478-b398-dd88e1c831bd.png

export default function Contact() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "+92",
    phone: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  function validate() {
    if (!form.firstName.trim() || !form.lastName.trim()) return "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Please enter a valid email.";
    if (!form.message.trim()) return "Please enter a message.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    try {
      // This posts to your backend route. Implement /api/contact with Nodemailer.
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to send message");
      }

      setSuccess("Message sent — thank you! We'll reply soon.");
      setForm({ firstName: "", lastName: "", email: "", countryCode: "+92", phone: "", message: "" });
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen font-sans text-gray-900 bg-gray-50">
      {/* CONTACT SECTION */}
      <section className="w-full flex items-start justify-center" style={{ minHeight: '120vh' }}>
        <div className="container mx-auto px-6 lg:px-20 py-12 grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Left content */}
          <div className="lg:col-span-3 space-y-6 pt-6">
            <h1 className="text-4xl lg:text-5xl font-extrabold">Contact Us</h1>
            <p className="text-sm text-gray-600 max-w-lg">
              Email, call, or complete the form to learn how Snappy can solve your messaging problem.
            </p>

            <div className="mt-4 text-sm text-gray-700">
              <p>info@snappy.io</p>
              <p className="mt-2">321-221-231</p>
              <a className="mt-3 inline-block text-sm text-blue-600 underline" href="#">Customer Support</a>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
              <div>
                <h3 className="font-semibold text-gray-800">Customer Support</h3>
                <p className="mt-2">Our support team is available around the clock to address any concerns or queries you may have.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800">Feedback and Suggestions</h3>
                <p className="mt-2">We value your feedback and are continuously working to improve Snappy.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800">Media Inquiries</h3>
                <p className="mt-2">For media-related questions or press inquiries, please contact media@snappyapp.com.</p>
              </div>
            </div>
          </div>

          {/* Right form card */}
          
<div className="lg:col-span-2 flex justify-center">
  <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 w-full max-w-lg">
    <h2 className="text-xl lg:text-2xl font-bold mt-0">Get in Touch</h2>
    <p className="text-sm lg:text-base text-gray-500 mt-1">You can reach us anytime</p>

    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      {/* Name inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          id="firstName"
          name="firstName"
          value={form.firstName}
          onChange={handleChange}
          placeholder="First name"
          className="input rounded-full px-4 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 w-full"
        />
        <input
          id="lastName"
          name="lastName"
          value={form.lastName}
          onChange={handleChange}
          placeholder="Last name"
          className="input rounded-full px-4 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 w-full"
        />
      </div>

      {/* Email */}
      <input
        id="email"
        name="email"
        value={form.email}
        onChange={handleChange}
        placeholder="Your email"
        className="w-full rounded-full px-4 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
      />

      {/* Phone */}
      <div className="flex gap-3 items-center">
        <select
          id="countryCode"
          name="countryCode"
          value={form.countryCode}
          onChange={handleChange}
          className="w-28 rounded-full px-3 py-2 border border-gray-200 focus:outline-none"
        >
          <option>+1</option>
          <option>+44</option>
          <option>+92</option>
          <option>+61</option>
          <option>+91</option>
        </select>
        <input
          id="phone"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Phone number"
          className="flex-1 rounded-full px-4 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 w-full"
        />
      </div>

      {/* Message */}
      <textarea
        id="message"
        name="message"
        value={form.message}
        onChange={handleChange}
        rows={4}
        maxLength={120}
        placeholder="How can we help?"
        className="w-full rounded-xl p-4 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
      />
      <div className="text-xs text-gray-400 text-right mt-1">{form.message.length}/120</div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {success && <div className="text-sm text-green-600">{success}</div>}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full py-3 px-6 bg-blue-600 text-white font-semibold shadow-md hover:shadow-lg disabled:opacity-60 mt-2"
      >
        {loading ? "Sending..." : "Submit"}
      </button>

      <p className="text-xs text-gray-400 text-center mt-2">
        By contacting us, you agree to our Terms of service and Privacy Policy
      </p>
    </form>
  </div>
</div>


        </div>
      </section>

      {/* LOCATION SECTION */}
      <section className="w-full bg-white py-12 flex items-center justify-center" style={{ minHeight: '120vh' }}>
        <div className="container mx-auto px-6 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="w-full">
            <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100">
              {/* Use provided image as the map placeholder */}
              <img src="/mnt/data/277dd00c-9352-4478-b398-dd88e1c831bd.png" alt="Map placeholder" className="w-full h-[420px] md:h-[520px] object-cover" />
              <div className="p-4">
                <div className="inline-block bg-white rounded-lg shadow px-4 py-3 -mt-10">
                  <div className="font-semibold">Snappy Inc.</div>
                  <div className="text-sm text-gray-500">San Francisco, USA</div>
                  <div className="mt-2 text-sm text-blue-600 underline cursor-pointer">Open Google Maps</div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full">
            <p className="text-sm text-gray-500">Our Location</p>
            <h2 className="text-3xl lg:text-4xl font-extrabold mt-2">Connecting Near and Far</h2>
            <div className="mt-4 text-sm text-gray-700">
              <h3 className="font-semibold">Headquarters</h3>
              <address className="not-italic mt-2">
                Snappy Inc.<br />
                San Francisco, USA<br />
                123 Tech Boulevard, Suite 456<br />
                San Francisco, CA 12345<br />
                United States
              </address>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
