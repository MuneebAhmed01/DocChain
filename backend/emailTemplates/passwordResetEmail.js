import sendEmail from "../utils/sendEmail.js";

const sendPasswordResetEmail = async (email, otp) => {
  const subject = "DocChain - Reset Your Password";
  const text = `
Hello,

We received a request to reset your password for your DocChain account.

Your One-Time Password (OTP) to change your password is: ${otp}

This OTP will expire in 5 minutes for security reasons.

Please enter this OTP on the password reset page to continue with the password reset process.

If you didn't request this password reset, please ignore this email or contact our support team immediately.

Best regards,
The DocChain Team
  `.trim();

  try {
    await sendEmail(email, subject, text);
    console.log(`📧 Password reset OTP email sent to ${email}`);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    console.log(`🔐 EMAIL FAILED - Password reset OTP for ${email}: ${otp}`);
    console.log("⚠️  Please use the OTP above to reset your password. Email service is currently unavailable.");
    
    // Don't throw error - allow OTP flow to continue even if email fails
    // This ensures users can still reset password using the console OTP
  }
};

export default sendPasswordResetEmail;
