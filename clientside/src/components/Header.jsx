import React from 'react'
import { assets } from '../assets/assets'

const Header = () => {
  return (
    <div className='flex bg-gradient-to-r from-blue-200 to-cyan-200 flex-col md:flex-row flex-wrap rounded-xl px-5 sm:px-8 md:px-12 lg:px-20 py-10 sm:py-12 md:py-0'>

      {/* ------- Left Side ------- */}
      {/* Centered on mobile (items-center/text-center), Left-aligned on desktop (md:items-start/md:text-left) */}
      <div className='md:w-1/2 flex flex-col items-center md:items-start justify-center gap-5 m-auto md:py-[3vw] text-center md:text-left'>

        <div className="flex items-center gap-3 justify-center bg-gray-100 rounded-3xl px-3 py-2">
          <img className="w-4 h-4" src={assets.snowflakes} />
          <p className="text-gray-500 text-xs sm:text-sm">
            Connect with Top Doctors Anytime, Anywhere
          </p>
        </div>

        <p className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight'>
          Your Health In Your <br />
          Hands,<span className='text-primary'>Every Step</span> <br />
          of the way
        </p>

        <div className='flex flex-col sm:flex-row items-center gap-3 text-sm font-light'>
          <img className='w-24 sm:w-28' src={assets.group_profiles} alt="" />
          <p className="text-sm sm:text-base">
            We offer 24/7 acess to healthcare services,
            <br className='hidden sm:block' />
            empowering you to stay healthy without long queee wait
          </p>
        </div>

        <a
          href="#speciality"
          className='flex items-center gap-2 bg-white px-6 sm:px-8 py-3 rounded-full text-gray-600 text-sm sm:text-base m-auto md:m-0 hover:scale-105 transition-all duration-300'
        >
          Book appointment
          <img className='w-3' src={assets.arrow_icon} alt="" />
        </a>

        <div className="flex justify-center md:justify-start gap-6 sm:gap-8 mt-3 flex-wrap">
          <div className="flex items-center gap-3">
            <p className="text-2xl sm:text-3xl font-bold leading-tight">35</p>
            <p className="leading-tight text-gray-500 text-sm sm:text-base">
              Certified Specialist<br />
              in various field
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-2xl sm:text-3xl font-bold leading-tight">12</p>
            <p className="leading-tight text-gray-500 text-sm sm:text-base">
              Years of scientific<br />
              and clinical works
            </p>
          </div>
        </div>
      </div>

      {/* ------- Right Side ------- */}
      <div className="relative md:w-1/2 mt-10 md:mt-0">
        <img
          src={assets.doc11}
          alt=""
          className="w-full h-full object-cover rounded-xl"
        />

        {/* Floating Action Bar - Hidden on mobile, Flex on desktop */}
        <div className="hidden md:flex absolute top-1/2 right-3 -translate-y-1/2 items-center gap-3 bg-white/60 backdrop-blur-sm p-3 rounded-xl shadow">
          <div className="p-2 bg-white rounded-full shadow cursor-pointer">📷</div>
          <div className="p-2 bg-blue-600 text-white rounded-full shadow cursor-pointer">📞</div>
          <div className="p-2 bg-white rounded-full shadow cursor-pointer">🎤</div>
        </div>

        {/* 790+ Card - Hidden on mobile, Block on desktop */}
        <div className="hidden md:block absolute bottom-10 left-6 bg-white/60 backdrop-blur-sm p-5 rounded-2xl shadow-lg w-52">
          <p className="text-gray-600 text-sm leading-[1.2]">New User</p>
          <p className="text-4xl">790+</p>
          <div className='flex justify-between items-center'>
            <p className='text-sm'>Care with</p>
            <a href="#features" className="mt-3 inline-block px-3 py-2 border rounded-xl border-primary text-sm text-primary transition hover:-translate-y-0.5 hover:opacity-80">
              Services
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header