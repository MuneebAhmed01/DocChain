// import multer from "multer";

// const storage = multer.diskStorage({
//   filename: function (req, file, callback) {
//     callback(null, file.originalname);
//   },
// });

// const upload = multer({ storage });

// export default upload;
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

// Multer config (memory storage)
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// Cloudinary stream upload middleware
export const uploadToCloudinary = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "doctor_images" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const result = await streamUpload();

    // attach URL to request
    req.imageUrl = result.secure_url;

    next();
  } catch (error) {
    console.error("Cloudinary Stream Error:", error);
    return res.status(500).json({ success: false, message: "Image upload failed" });
  }
};
