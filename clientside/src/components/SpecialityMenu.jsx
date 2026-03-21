import React from 'react'
import { specialityData } from '../assets/assets'
import { Link } from 'react-router-dom'

const SpecialityMenu = () => {
  return (
    <div className='flex flex-col items-center gap-5 py-12 sm:py-16 text-gray-800' id='speciality'>
      
      <h1 className='text-2xl sm:text-3xl md:text-4xl font-semibold text-center'>
        Find by Speciality
      </h1>

      <p className='w-full sm:w-2/3 lg:w-1/3 text-center text-sm sm:text-base text-gray-500'>
        Simply browse through our extensive list of trusted doctors, schedule your appointment hassle-free.
      </p>
      
      <div className="flex flex-wrap justify-center gap-5 sm:gap-6 lg:gap-8 pt-6 w-full">
        {specialityData.map((item, index) => (
          <Link
            key={index}
            to={`/doctors/${item.speciality}`}
            onClick={() => window.scrollTo(0, 0)}
            className="flex flex-col items-center text-xs sm:text-sm cursor-pointer hover:-translate-y-2 transition-all duration-300 w-20 sm:w-24 md:w-28"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-gray-100">
              <img
                src={item.image}
                alt={item.speciality}
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-xs sm:text-sm md:text-base mt-2 text-center">
              {item.speciality}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default SpecialityMenu