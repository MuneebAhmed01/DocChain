import sendEmail from "../utils/sendEmail.js";

const doctorRemoved = async (doctor) => {
  await sendEmail(
    doctor.email,
    "Account Removed",
    `Hello Dr. ${doctor.name},

We regret to inform you that your account has been removed from Docchain by the admin.

If you have questions, please contact support.

– Docchain Team`
  );
};

export default doctorRemoved;
