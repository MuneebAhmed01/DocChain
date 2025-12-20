import sendEmail from "../utils/sendEmail.js";

const doctorRegistered = async (doctor) => {
  await sendEmail(
    doctor.email,
    "Welcome to Docchain",
    `Hello Dr. ${doctor.name},

Your account has been successfully created on Docchain.

You can now manage your appointments and profile.

– Docchain Team`
  );
};

export default doctorRegistered;
