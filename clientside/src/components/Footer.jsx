{/* <footer className="bg-[#1a1a1a] text-white  mt-16 relative -mx-4 sm:-mx-[3.2%] pt-16 "> */}
{/* <div className="w-full flex justify-center px-4 -mt-28"> */}
const Footer = () => {
  return (
    <footer className="-mx-4 sm:-mx-[3.2%] bg-gradient-to-b from-[#0b0b0b] to-black text-gray-400 flex flex-col justify-between">
      
      {/* Top Section */}
      <div className="max-w-7xl mx-auto w-full px-6 py-6 grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* Brand */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            <span className="text-blue-500">Doc</span>
            <span className="text-white">Chain</span>
          </h2>

          <p className="text-sm leading-relaxed mb-4">
            Healthcare plays a vital role in improving quality of life by
            providing essential medical services, preventive care, and
            treatment for illnesses.
          </p>

          <div className="flex gap-3">
            {["in", "ig", "x", "f"].map((icon) => (
              <div
                key={icon}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-600 text-sm hover:text-white hover:border-white transition"
              >
                {icon}
              </div>
            ))}
          </div>
        </div>

        {/* Menu */}
        <div>
          <h4 className="text-white font-medium mb-4">Menu</h4>
          <ul className="space-y-2 text-sm">
            <li>Home</li>
            <li>About Us</li>
            <li>Services</li>
            <li>Blog</li>
          </ul>
        </div>

        {/* Services */}
        <div>
          <h4 className="text-white font-medium mb-4">Services</h4>
          <ul className="space-y-2 text-sm">
            <li>Cardiology</li>
            <li>Neurology</li>
            <li>Radiology</li>
            <li>Urology</li>
          </ul>
        </div>

        {/* Further Info */}
        <div>
          <h4 className="text-white font-medium mb-4">Further Information</h4>
          <ul className="space-y-2 text-sm">
            <li>Terms & Condition</li>
            <li>Privacy Policy</li>
            <li>Support</li>
          </ul>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-gray-700 px-2 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          <h1 className="text-5xl font-bold text-gray-500 tracking-wide">
            Doc<span className="text-gray-300">Chain</span>
          </h1>

          <div className="flex gap-6 text-sm">
            <span>Privacy Policy</span>
            <span>Terms & Condition</span>
            <span>Healthcare Setting</span>
          </div>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
