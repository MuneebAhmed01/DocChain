import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Headers from "../components/Header";
import SpecialityMenu from "../components/SpecialityMenu";
import TopDoctors from "../components/TopDoctors";
import Banner from "../components/Banner";
import FeaturesSlider from "../components/FeaturesSlider";
import Working from "../components/Working";
import HealthTips from "../components/HealthTips";
import FAQSection from "../components/Faq";

const Home = () => {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash?.replace("#", "");
    if (!hash) return;

    requestAnimationFrame(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [location.hash]);

  return (
    <div className="flex flex-col w-full overflow-x-hidden">

      <div className="w-full">
        <Headers />
        
      </div>

      <div id="services" className="w-full py-10 sm:py-14 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
          <FeaturesSlider />
        </div>
      </div>

      <div className="w-full py-10 sm:py-14 lg:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
          <Working />
        </div>
      </div>

      <div className="w-full py-10 sm:py-14 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
          <HealthTips />
        </div>
      </div>

      <div id="speciality" className="w-full py-10 sm:py-14 lg:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
          <SpecialityMenu />
        </div>
      </div>

      {/* Top Doctors Section */}
      <div id="top-doctors" className="w-full py-12 sm:py-16 lg:py-20 relative z-10 block clear-both">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
          <TopDoctors />
        </div>
      </div>

      {/* FAQ Section */}
      <div id="faq" className="w-full py-10 sm:py-14 lg:py-16 bg-gray-50 relative z-0 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
          <FAQSection />
        </div>
      </div>

    </div>
  );
};

export default Home;