
const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

// Upload file locally
const uploadLocal = async (file, folder = "reports") => {
  if (!file?.buffer) {
    throw new Error("A valid uploaded file is required");
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

  const uploadDir = path.join(
    process.cwd(),
    "uploads",
    safeFolder
  );

  await fs.mkdir(uploadDir, { recursive: true });

  const filename = `${randomUUID()}${extension}`;
  const filePath = path.join(uploadDir, filename);

  await fs.writeFile(filePath, file.buffer, { flag: "wx" });

  const serverUrl = (
    process.env.SERVER_URL ||
    `http://localhost:${process.env.PORT || 5000}`
  ).replace(/\/+$/, "");

  const url = `${serverUrl}/uploads/${safeFolder}/${filename}`;

  return {
    filename,
    fileID: filename,
    path: filePath,
    url,
  };
};

// Delete locally stored file
const deleteLocal = async (fileID, folder = "reports") => {
  if (
    !fileID ||
    typeof fileID !== "string" ||
    path.basename(fileID) !== fileID
  ) {
    throw new Error("Invalid file ID");
  }

  const safeFolder = path.basename(folder);

  const filePath = path.join(
    process.cwd(),
    "uploads",
    safeFolder,
    fileID
  );

  await fs.unlink(filePath).catch((error) => {
    if (error.code !== "ENOENT") {
      throw error;
    }
  });
};

module.exports = {
  uploadLocal,
  deleteLocal,
};
