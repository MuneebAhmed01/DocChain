import sendEmail from "../utils/sendEmail.js";

const sendOTPEmail = async (email, otp) => {
  const subject = "DocChain - Verify Your Email";
  const text = `
Hello,

Thank you for signing up with DocChain!

Your One-Time Password (OTP) for email verification is: ${otp}

This OTP will expire in 5 minutes for security reasons.

Please enter this OTP on the signup page to complete your registration.

If you didn't request this OTP, please ignore this email.

Best regards,
The DocChain Team
  `.trim();

  try {
    await sendEmail(email, subject, text);
    console.log(`📧 OTP email sent to ${email}`);
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email");
  }
};

export default sendOTPEmail;
