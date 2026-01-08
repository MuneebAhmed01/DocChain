import React from 'react'
import { specialityData } from '../assets/assets'
import { Link } from 'react-router-dom'

const SpecialityMenu = () => {
  return (
    <div className='flex flex-col items-center gap-4 py-16 text-gray-800 ' id='speciality' >
        <h1 className='text-3xl font-medium'>Find by Speciality</h1>
        <p className='sm:w-1/3 text-center text-sm'>Simply browse through our extensive list of trusted doctors, schedule your appointment hassle-free.</p>
        <div className="flex sm:justify-center gap-8 pt-5 w-full">
  {specialityData.map((item, index) => (
    <Link
      key={index}
      to={`/doctors/${item.speciality}`}
      onClick={() => scrollTo(0, 0)}
      className="flex flex-col items-center text-xs cursor-pointer flex-shrink-0
                 hover:-translate-y-2 transition-all duration-500"
    >
      {/* Image container */}
      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gray-100">
        <img
          src={item.image}
          alt={item.speciality}
          className="w-full h-full object-cover"
        />
      </div>

      <p className="text-base mt-2 text-center">{item.speciality}</p>
    </Link>
  ))}
</div>

    </div>
  )
}

export default SpecialityMenu
