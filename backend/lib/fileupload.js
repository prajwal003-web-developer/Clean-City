
const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const uploadLocal = async (file, folder = "reports") => {
  if (!file || file.truncated || typeof file.mv !== "function") {
    throw new Error("Invalid or oversized uploaded file");
  }

  const allowedTypes = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };

  const extension = allowedTypes[file.mimetype];

  if (!extension) {
    throw new Error("Only JPEG, PNG, WEBP and GIF images are allowed");
  }

  const safeFolder = path.basename(folder);
  const uploadDir = path.join(process.cwd(), "uploads", safeFolder);

  await fs.mkdir(uploadDir, { recursive: true });

  const filename = `${randomUUID()}${extension}`;
  const filePath = path.join(uploadDir, filename);

  await file.mv(filePath);

  const serverUrl = (
    process.env.SERVER_URL ||
    `http://localhost:${process.env.PORT || 5000}`
  ).replace(/\/+$/, "");

  return {
    filename,
    fileID: filename,
    path: filePath,
    url: `${serverUrl}/uploads/${safeFolder}/${filename}`,
  };
};

const deleteLocal = async (fileID, folder = "reports") => {
  if (
    typeof fileID !== "string" ||
    !fileID ||
    path.basename(fileID) !== fileID
  ) {
    throw new Error("Invalid file ID");
  }

  const filePath = path.join(
    process.cwd(),
    "uploads",
    path.basename(folder),
    fileID
  );

  await fs.unlink(filePath).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
};

// module.exports = { uploadLocal, deleteLocal };




const cloudinary = require("../lib/Cloudinary.js");

const uploadCloudinary = async (file) => {
  if (!file || !file.tempFilePath) {
    throw new Error("Invalid file or temporary file path");
  }

  const result = await cloudinary.uploader.upload(file.tempFilePath, {
    folder: "cleancity/reports",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
  });

  console.log(result);
  return {
    url: result.secure_url,
    fileID: result.public_id,
  };
};

const deleteCloudinary = async (publicId) => {
  if (!publicId) {
    throw new Error("Cloudinary public ID is required");
  }

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });

  return result.result === "ok" || result.result === "not found";
};

module.exports = {
  uploadCloudinary,
  deleteCloudinary,
  uploadLocal, deleteLocal
};

