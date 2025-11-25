import React from 'react'
import { assets } from '../assets/assets'
// bg-gradient-to-r from-violet-100 to-pink-100
const Header = () => {
  return (
    <div className='flex bg-gradient-to-r from-blue-200 to-cyan-200 flex-col md:flex-row flex-wrap rounded-lg px-6 md:px-10 lg:px-20'>
      {/* ------- Left Side ------- */}
      <div className='md:w-1/2 flex flex-col items-start justify-center gap-4  m-auto md:py-[3vw] md:mb-[-30px]'>
      <div className="flex items-center gap-3 justify-center bg-gray-100 rounded-3xl px-3 py-2">
  <img className="w-4 h-4" src={assets.snowflakes} />
  <p className="text-center text-gray-500 text-sm">
    Consultant Top Doctors Anytime, From Any Location
  </p>
</div>

        <p className='text-3xl md:text-4xl lg:text-5xl  font-semibold leading-tight md:leading-tight lg:leading-tight'>
            Your Health In Your <br /> Hands,<span className='text-primary'>Every Step</span> <br/> of the way
        </p>
        <div className='flex flex-col md:flex-row items-center gap-3  text-sm font-light'>
            <img className='w-28' src={assets.group_profiles} alt="" />
            <p>We offer 24/7 acess to healthcare services, <br className='hidden sm:block' /> empowering you to stay healthy without long queee wait</p>
        </div>
        <a href="#speciality" className='flex items-center gap-2 bg-white px-8 py-3 rounded-full text-gray-600 text-sm m-auto md:m-0 hover:scale-105 transition-all duration-300'>
        Book appointment <img className='w-3' src={assets.arrow_icon} alt="" />
        </a>
        <div className="flex gap-8">

  <div className="flex items-center gap-3">
    <p className="text-3xl font-bold leading-tight">35</p>
    <p className="leading-tight text-gray-500">
      Certified Specialist<br />
      in various field
    </p>
  </div>

  <div className="flex items-center gap-3">
    <p className="text-3xl font-bold leading-tight">12</p>
    <p className="leading-tight text-gray-500">
      Years of scientific<br />
      and clinical works
    </p>
  </div>

</div>

      </div>

      {/* ------- Right Side ------- */}
    <div className="relative md:w-1/2">
  {/* Background Image */}
  <img
    src={assets.doc11}
    alt=""
    className="w-full h-full object-cover rounded-lg"
  />

  {/* 3-Icon Floating Action Bar */}
  <div className="absolute top-[13rem] right-3 flex items-center gap-3 bg-white/60 backdrop-blur-sm p-3 rounded-xl shadow">
    <div className="p-2 bg-white rounded-full shadow cursor-pointer">
      📷
    </div>
    <div className="p-2 bg-blue-600 text-white rounded-full shadow cursor-pointer">
      📞
    </div>
    <div className="p-2 bg-white rounded-full shadow cursor-pointer">
      🎤
    </div>
  </div>

  {/* 790+ Stat Card */}
  <div className="absolute bottom-10 left-5 bg-white/60 backdrop-blur-sm p-5 rounded-2xl shadow-lg w-52">
    <p className="text-gray-600 text-sm leading-[1.2]">New User</p>
    <p className="text-4xl ">790+</p><div className='flex justify-between items-center '>
<p className='text-sm '>Care with</p>
    <button className="mt-3 px-4 py-2 border rounded-xl border-primary text-sm text-primary transition">
      Services
    </button>
    </div>
  </div>
</div>

    </div>
  )
}

export default Header
