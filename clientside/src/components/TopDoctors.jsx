import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";


const TopDoctors = () => {
  const navigate = useNavigate();
  const { doctors } = useContext(AppContext);

//👉 TALAL added state and useEffect to adjust the number of displayed cards based on screen size
// On mobile, show 5 cards. On desktop, show 10 cards.
const [cardCount, setCardCount] = useState(10);

useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth < 640) {
      setCardCount(5); // mobile
    } else {
      setCardCount(10); // desktop
    }
  };

  handleResize(); // run once
  window.addEventListener("resize", handleResize);

  return () => window.removeEventListener("resize", handleResize);
}, []);


  return (
    <div className="flex flex-col items-center gap-5 my-12 sm:my-16 lg:my-20 text-gray-900">

      <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-center">
        Top Doctors to Book
      </h1>

      <p className="w-full sm:w-2/3 lg:w-1/3 text-center text-sm sm:text-base text-gray-500">
        Simply browse through our extensive list of trusted doctors.
      </p>

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 pt-6">

        {doctors
          .filter((doc) => doc.status !== "suspended")
          .slice(0, cardCount)
          .map((item, index) => (
            <div
              onClick={() => {
                navigate(`/appointment/${item._id}`);
                scrollTo(0, 0);
              }}
              className="border border-blue-200 rounded-xl overflow-hidden cursor-pointer hover:-translate-y-2 transition-all duration-300"
              key={index}
            >
              <img
                className="bg-blue-50 w-full object-cover"
                src={item.image}
                alt=""
              />

              <div className="p-4">

                <div
                  className={`flex items-center gap-2 text-sm ${
                    item.available ? "text-green-500" : "text-gray-500"
                  }`}
                >
                  <p
                    className={`w-2 h-2 ${
                      item.available ? "bg-green-500" : "bg-gray-500"
                    } rounded-full`}
                  ></p>

                  <p>{item.available ? "Available" : "Not Available"}</p>
                </div>

                <p className="text-gray-900 text-base sm:text-lg font-medium">
                  {item.name}
                </p>

                <p className="text-gray-600 text-sm">
                  {item.speciality}
                </p>

              </div>
            </div>
          ))}
      </div>

      <button
        onClick={() => {
          navigate("/doctors");
          scrollTo(0, 0);
        }}
        className="bg-blue-50 text-gray-600 px-8 sm:px-12 py-3 rounded-full mt-8 sm:mt-10 hover:bg-blue-100 transition"
      >
        more
      </button>
    </div>
  );
};

export default TopDoctors;