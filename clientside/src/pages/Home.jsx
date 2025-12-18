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

    // wait a tick for layout/components to paint
    requestAnimationFrame(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [location.hash]);

  return (
    <div>
      <Headers />
      <FeaturesSlider />

      <Working />
      <HealthTips />

      <SpecialityMenu />
      <TopDoctors />
      {/* <Banner /> */}
      <FAQSection />
    </div>
  );
};

export default Home;
