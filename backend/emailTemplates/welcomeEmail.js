import sendEmail from "../utils/sendEmail.js";

const welcomeEmail = async (user) => {
  await sendEmail(
    user.email,
    "Welcome to Docchain",
    `Hello ${user.name},

Your account has been created successfully.

You can now book appointments with doctors.

– Docchain Team`
  );
};

export default welcomeEmail;
