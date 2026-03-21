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

  if (loading) return <div className="p-6 text-center">Loading pending doctors...</div>;
  
  if (pendingDoctors.length === 0)
    return <p className="p-6 text-center text-gray-500">No pending doctors at the moment.</p>;

  return (
    <div className="p-4 sm:p-6 w-full max-w-7xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-gray-800 text-center sm:text-left">
        Pending Doctor Approvals
      </h2>

      {/* Desktop Table View (Hidden on Mobile) */}
      <div className="hidden lg:block overflow-x-auto bg-white border rounded-lg shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-3 text-center">Profile</th>
              <th className="px-4 py-3 text-center">Degree</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Fee & Exp</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pendingDoctors.map((doc) => (
              <tr key={doc._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 flex justify-center">
                  {doc.profilePic?.url ? (
                    <a href={doc.profilePic.url} target="_blank" rel="noopener noreferrer">
                      <img src={doc.profilePic.url} alt="Profile" className="w-12 h-12 rounded-full object-cover border" />
                    </a>
                  ) : "N/A"}
                </td>
                <td className="px-4 py-3 text-center">
                  {doc.degreeProof?.url ? (
                    <a href={doc.degreeProof.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">
                      {doc.degreeProof.url.endsWith(".pdf") ? "View PDF" : <img src={doc.degreeProof.url} className="w-12 h-12 mx-auto object-cover rounded" />}
                    </a>
                  ) : "N/A"}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{doc.fullName}</p>
                  <p className="text-gray-500 text-xs">{doc.email}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-700">{doc.specialty}</p>
                  <p className="text-gray-500 text-xs">{doc.city} | {doc.education}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-gray-700">{doc.experience}</p>
                  <p className="text-gray-500 text-xs">Fee: {doc.fee}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => approveDoctor(doc._id)} className="bg-green-500 text-white px-3 py-1.5 rounded text-xs hover:bg-green-600 transition">Approve</button>
                    <button onClick={() => rejectDoctor(doc._id)} className="bg-red-500 text-white px-3 py-1.5 rounded text-xs hover:bg-red-600 transition">Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (Hidden on Desktop) */}
      <div className="lg:hidden grid grid-cols-1 gap-4">
        {pendingDoctors.map((doc) => (
          <div key={doc._id} className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <img src={doc.profilePic?.url} className="w-16 h-16 rounded-full object-cover border" alt="Profile" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{doc.fullName}</h3>
                <p className="text-sm text-gray-500 truncate">{doc.email}</p>
                <span className="inline-block bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded mt-1 font-bold uppercase">
                  {doc.specialty}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-gray-50">
              <div><p className="text-gray-400">City</p><p className="font-medium">{doc.city}</p></div>
              <div><p className="text-gray-400">Experience</p><p className="font-medium">{doc.experience}</p></div>
              <div><p className="text-gray-400">Education</p><p className="font-medium">{doc.education}</p></div>
              <div><p className="text-gray-400">Consultation Fee</p><p className="font-medium">{doc.fee}</p></div>
            </div>

            <div className="flex flex-col gap-2">
               <p className="text-xs text-gray-400 font-medium uppercase">Credentials</p>
               {doc.degreeProof?.url ? (
                  <a href={doc.degreeProof.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full py-2 border-2 border-dashed rounded-lg text-blue-600 font-medium text-sm hover:bg-blue-50">
                    {doc.degreeProof.url.endsWith(".pdf") ? "📄 View Degree PDF" : "🖼️ View Degree Image"}
                  </a>
               ) : <p className="text-sm text-gray-400 italic">No proof uploaded</p>}
            </div>

            <div className="flex gap-2 mt-2">
              <button onClick={() => approveDoctor(doc._id)} className="flex-1 bg-green-500 text-white py-2.5 rounded-lg font-bold hover:bg-green-600 active:scale-95 transition">Approve</button>
              <button onClick={() => rejectDoctor(doc._id)} className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-bold hover:bg-red-600 active:scale-95 transition">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingApprovals;

