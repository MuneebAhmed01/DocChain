import multer from "multer";
import { cloudinary } from "../config/cloudinary.js";
import streamifier from "streamifier";

// File filter to only allow .jpg/.png images for profile pictures
const fileFilter = (req, file, cb) => {
  // For profile picture, only allow .jpg/.png
  if (file.fieldname === 'profilePic') {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG image files are allowed for profile pictures'), false);
    }
  } 
  // For degree proof, allow images and PDFs
  else if (file.fieldname === 'degreeProof') {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG images and PDF files are allowed for degree proof'), false);
    }
  }
  else {
    cb(new Error('Invalid file field'), false);
  }
};

// Multer config (memory storage)
const storage = multer.memoryStorage();
export const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Cloudinary stream upload middleware for single image
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

// Upload multiple files (profilePic + degreeProof) safely
export const uploadDoctorDocuments = async (req, res, next) => {
  try {
       console.log("FILEEEEEEEE", req.files)
    if (!req.files) return next();

    // helper function to upload any file type
    const uploadBuffer = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    let resource_type = "image";
    if (file.mimetype === "application/pdf") resource_type = "raw";

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type,
        ...options, // 👈 transformations go here
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};


    // Upload profilePic (image)
    if (req.files.profilePic?.[0]) {
     const result = await uploadBuffer(req.files.profilePic[0], {
  folder: "doctor_profiles",
  width: 400,
  height: 400,
  crop: "fill",
  gravity: "face",
});

      req.profilePic = { public_id: result.public_id, url: result.secure_url };
    }

    // Upload degreeProof (image or PDF)
    if (req.files.degreeProof?.[0]) {
      const result = await uploadBuffer(req.files.degreeProof[0], "doctor_degrees");
      req.degreeProof = { public_id: result.public_id, url: result.secure_url };
    }

    next();
  } catch (error) {
    console.error("Doctor document upload error:", error);
    return res.status(500).json({ success: false, message: "Document upload failed" });
  }
};
