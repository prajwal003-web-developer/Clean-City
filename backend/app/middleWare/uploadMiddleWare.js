
const multer = require("multer");

const upload = multer({
  // Keep files in memory temporarily.
  // The controller will save them to local storage.
  storage: multer.memoryStorage(),

  // Maximum file size: 5 MB per image.
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 3,
  },

  // Allow only image files.
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    cb(new Error("Only JPEG, PNG, WEBP and GIF images are allowed"));
  },
});

module.exports = upload;
