import React from 'react'
import Headers from '../components/Header'
import SpecialityMenu from '../components/SpecialityMenu'
import TopDoctors from '../components/TopDoctors'
import Banner from '../components/Banner'
import FeaturesSlider from '../components/FeaturesSlider'
import Working from '../components/Working'
import HealthTips from '../components/HealthTips'

import FAQSection from '../components/Faq'

const Home = () => {
  return (
    <div>
      <Headers />
      <FeaturesSlider/>
      
      <Working/>
      <HealthTips/>
      
      <SpecialityMenu />
      <TopDoctors />
      {/* <Banner /> */}
      <FAQSection/>
    </div>
  )
}

export default Home
