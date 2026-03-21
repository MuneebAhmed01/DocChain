import React, { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";
import { assets } from "../assets/assets";

import { toast } from "react-toastify";
import axiosInstance from "../axiosInstance";

const MyProfile = () => {
  const { userData, setUserData, token, backendUrl, loadUserProfileData } =
    useContext(AppContext);

  const [isEdit, setIsEdit] = useState(false);
  const [image, setImage] = useState(false);

  const updateUserProfileData = async () => {
    try {
      const formData = new FormData();

      formData.append("name", userData.name);
      formData.append("phone", userData.phone);
      formData.append("address", JSON.stringify(userData.address));
      formData.append("gender", userData.gender);
      formData.append("dob", userData.dob);

      image && formData.append("image", image);

      const { data } = await axiosInstance.post(
        backendUrl + "/api/user/update-profile",
        formData,
        { headers: { token } }
      );

      if (data.success) {
        toast.success(data.message);
        await loadUserProfileData();
        setIsEdit(false);
        setImage(false);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  return (
    userData && (
      <div className="w-full px-4 sm:px-6 md:px-8 py-6">
        <div className="max-w-3xl mx-auto bg-white shadow-md rounded-2xl p-6 sm:p-8 flex flex-col gap-6 text-sm">

          {/* Profile Image */}
          <div className="flex flex-col items-center sm:items-start">
            {isEdit ? (
              <label htmlFor="image">
                <div className="relative cursor-pointer">
                  <img
                    className="w-28 sm:w-36 rounded opacity-75 object-cover"
                    src={image ? URL.createObjectURL(image) : userData.image}
                    alt=""
                  />
                  {!image && (
                    <img
                      className="w-8 sm:w-10 absolute bottom-8 right-8"
                      src={assets.upload_icon}
                      alt=""
                    />
                  )}
                </div>
                <input
                  onChange={(e) => setImage(e.target.files[0])}
                  type="file"
                  id="image"
                  hidden
                />
              </label>
            ) : (
              <img
                className="w-28 sm:w-36 rounded object-cover"
                src={userData.image}
                alt=""
              />
            )}
          </div>

          {/* Name */}
          <div>
            {isEdit ? (
              <input
                className="w-full sm:max-w-sm bg-gray-50 text-2xl sm:text-3xl font-medium mt-2 p-2 rounded"
                type="text"
                value={userData.name}
                onChange={(e) =>
                  setUserData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            ) : (
              <p className="font-medium text-2xl sm:text-3xl text-neutral-800 mt-2">
                {userData.name}
              </p>
            )}
          </div>

          <hr className="bg-zinc-300 h-[1px] border-none" />

          {/* CONTACT INFORMATION */}
          <div>
            <p className="text-neutral-500 underline mb-4">
              CONTACT INFORMATION
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-4 text-neutral-700">

              <p className="font-medium sm:col-span-1">Email:</p>
              <p className="text-blue-500 sm:col-span-2 break-all">
                {userData.email}
              </p>

              <p className="font-medium sm:col-span-1">Phone:</p>
              <div className="sm:col-span-2">
                {isEdit ? (
                  <input
                    className="w-full sm:max-w-xs bg-gray-100 p-2 rounded"
                    type="text"
                    value={userData.phone}
                    onChange={(e) =>
                      setUserData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <p className="text-blue-400">{userData.phone}</p>
                )}
              </div>

              <p className="font-medium sm:col-span-1">Address:</p>
              <div className="sm:col-span-2">
                {isEdit ? (
                  <div className="flex flex-col gap-2">
                    <input
                      className="w-full bg-gray-50 p-2 rounded"
                      onChange={(e) =>
                        setUserData((prev) => ({
                          ...prev,
                          address: {
                            ...prev.address,
                            line1: e.target.value,
                          },
                        }))
                      }
                      value={userData.address.line1}
                      type="text"
                    />
                    <input
                      className="w-full bg-gray-50 p-2 rounded"
                      onChange={(e) =>
                        setUserData((prev) => ({
                          ...prev,
                          address: {
                            ...prev.address,
                            line2: e.target.value,
                          },
                        }))
                      }
                      value={userData.address.line2}
                      type="text"
                    />
                  </div>
                ) : (
                  <p className="text-gray-500">
                    {userData.address.line1}
                    <br />
                    {userData.address.line2}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* BASIC INFORMATION */}
          <div>
            <p className="text-neutral-500 underline mb-4">
              BASIC INFORMATION
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-4 text-neutral-700">

              <p className="font-medium sm:col-span-1">Gender:</p>
              <div className="sm:col-span-2">
                {isEdit ? (
                  <select
                    className="w-full sm:max-w-xs bg-gray-100 p-2 rounded"
                    onChange={(e) =>
                      setUserData((prev) => ({
                        ...prev,
                        gender: e.target.value,
                      }))
                    }
                    value={userData.gender}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                ) : (
                  <p className="text-gray-400">{userData.gender}</p>
                )}
              </div>

              <p className="font-medium sm:col-span-1">Birthday:</p>
              <div className="sm:col-span-2">
                {isEdit ? (
                  <input
                    className="w-full sm:max-w-xs bg-gray-100 p-2 rounded"
                    type="date"
                    onChange={(e) =>
                      setUserData((prev) => ({
                        ...prev,
                        dob: e.target.value,
                      }))
                    }
                    value={userData.dob}
                  />
                ) : (
                  <p className="text-gray-400">{userData.dob}</p>
                )}
              </div>
            </div>
          </div>

          {/* Button */}
          <div className="pt-6">
            {isEdit ? (
              <button
                className="w-full sm:w-auto border border-primary px-6 py-2 rounded-full hover:bg-primary hover:text-white transition-all"
                onClick={updateUserProfileData}
              >
                Save Information
              </button>
            ) : (
              <button
                className="w-full sm:w-auto border border-primary px-6 py-2 rounded-full hover:bg-primary hover:text-white transition-all"
                onClick={() => setIsEdit(true)}
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    )
  );
};

export default MyProfile;