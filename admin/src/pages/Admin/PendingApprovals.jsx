// src/pages/Admin/PendingApprovals.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const PendingApprovals = () => {
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

const fetchPendingDoctors = async () => {
  try {
    const { data } = await axios.get("/api/pending-doctor");
    if (data.success) {
      setPendingDoctors(data.doctors);
    }
  } catch (err) {
    console.error(err);
    toast.error("Failed to fetch pending doctors");
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchPendingDoctors();
  }, []);

const approveDoctor = async (id) => {
  try {
    const { data } = await axios.post(`/api/pending-doctor/approve/${id}`);

    if (data.success) {
      toast.success(data.message);
      fetchPendingDoctors();
    } else {
      toast.error(data.message || "Approval failed");
    }
  } catch (err) {
    console.error(err);
    toast.error("Failed to approve doctor");
  }
};


  const rejectDoctor = async (id) => {
    try {
      const { data } = await axios.post(`/api/pending-doctor/reject/${id}`);
      if (data.success) {
        toast.success("Doctor rejected!");
        fetchPendingDoctors();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject doctor");
    }
  };

  if (loading) return <p>Loading pending doctors...</p>;
  if (pendingDoctors.length === 0)
    return <p className="p-6">No pending doctors at the moment.</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Pending Doctor Approvals</h2>
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200">
          <thead>
            <tr className="bg-gray-100 text-center">
              <th className="px-4 py-2">Profile Pic</th>
              <th className="px-4 py-2">Degree Proof</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Specialty</th>
              <th className="px-4 py-2">City</th>
              <th className="px-4 py-2">Experience</th>
              <th className="px-4 py-2">Fee</th>
              <th className="px-4 py-2">Education</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingDoctors.map((doc) => (
              <tr key={doc._id} className="text-center border-t border-gray-200">
             <td className="px-4 py-2">
  {doc.profilePic?.url ? (
    <a
      href={doc.profilePic.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex justify-center"
    >
      <img
        src={doc.profilePic.url}
        alt="Profile"
        className="w-14 h-14 rounded-full object-cover"
      />
    </a>
  ) : (
    "No Image"
  )}
</td>

               <td className="px-4 py-2">
  {doc.degreeProof?.url ? (
    doc.degreeProof.url.endsWith(".pdf") ? (
      <a
        href={doc.degreeProof.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline font-medium"
      >
        View Degree PDF
      </a>
    ) : (
      <a
        href={doc.degreeProof.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src={doc.degreeProof.url}
          alt="Degree Proof"
          className="w-16 h-16 object-cover mx-auto cursor-pointer hover:scale-105 transition"
        />
      </a>
    )
  ) : (
    "No Document"
  )}
</td>

                <td>{doc.fullName}</td>
                <td className="px-4 py-2">{doc.email}</td>
                <td className="px-4 py-2">{doc.specialty}</td>
                <td className="px-4 py-2">{doc.city}</td>
                <td>{doc.experience}</td>
                <td className="px-4 py-2">{doc.fee}</td>
                <td className="px-4 py-2">{doc.education}</td>
                <td className="px-4 py-2 flex justify-center gap-2">
                  <button
                    onClick={() => approveDoctor(doc._id)}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => rejectDoctor(doc._id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PendingApprovals;
