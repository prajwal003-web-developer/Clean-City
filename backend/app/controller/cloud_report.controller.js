const mongoose = require("mongoose");

const Report = require("../model/report.js");
const File = require("../model/file.js");

const {
  uploadCloudinary,
  deleteCloudinary,
} = require("../../lib/fileupload.js");

const isValidId = (id) => mongoose.isValidObjectId(id);

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// --------------------------------------------------
// COORDINATE HELPERS
// Coordinates use [longitude, latitude].
// --------------------------------------------------

const parseCoordinates = (coordinates) => {
  if (Array.isArray(coordinates)) {
    return coordinates.map(Number);
  }

  if (typeof coordinates !== "string") {
    return null;
  }

  const value = coordinates.trim();

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed.map(Number);
    }
  } catch {
    // Also support "88.4,26.7".
  }

  const parts = value.split(",");

  if (parts.length !== 2) {
    return null;
  }

  return parts.map((part) => Number(part.trim()));
};

const isValidCoordinates = (coordinates) =>
  Array.isArray(coordinates) &&
  coordinates.length === 2 &&
  coordinates.every(
    (value) => typeof value === "number" && Number.isFinite(value)
  ) &&
  coordinates[0] >= -180 &&
  coordinates[0] <= 180 &&
  coordinates[1] >= -90 &&
  coordinates[1] <= 90;

// --------------------------------------------------
// IMAGE HELPERS - EXPRESS-FILEUPLOAD + CLOUDINARY
// The multipart field name must be "files".
// --------------------------------------------------

const getUploadedFiles = (req) => {
  const incoming = req.files?.files;

  if (!incoming) return [];

  return Array.isArray(incoming) ? incoming : [incoming];
};

const validateImages = (files = []) => {
  if (!Array.isArray(files)) {
    return "Invalid file upload format";
  }

  if (files.length > MAX_IMAGES) {
    return `You can upload a maximum of ${MAX_IMAGES} images`;
  }

  if (
    files.some(
      (file) =>
        !file ||
        !ALLOWED_TYPES.includes(file.mimetype) ||
        file.truncated ||
        file.size > MAX_IMAGE_SIZE
    )
  ) {
    return "Only JPEG, PNG, WEBP and GIF images up to 5 MB each are allowed";
  }

  return null;
};

// --------------------------------------------------
// POPULATE REPORT REFERENCES
// Always populate user, cleanedBy, and files.
// --------------------------------------------------

const populateReport = (query) =>
  query
    .populate("user", "name email")
    .populate("cleanedBy", "name")
    .populate("files");

// --------------------------------------------------
// UPLOAD IMAGES TO CLOUDINARY
// Save the URL and Cloudinary public ID in MongoDB.
// --------------------------------------------------

const saveFiles = async (files = []) => {
  const savedDocuments = [];
  const uploadedPublicIds = [];

  try {
    for (const file of files) {
      const uploaded = await uploadCloudinary(file);

      uploadedPublicIds.push(uploaded.fileID);

      const fileDocument = await File.create({
        path: uploaded.url,
        fileID: uploaded.fileID,
      });

      savedDocuments.push(fileDocument);
    }

    return savedDocuments;
  } catch (error) {
    await Promise.allSettled(
      uploadedPublicIds.map((publicId) =>
        deleteCloudinary(publicId)
      )
    );

    if (savedDocuments.length) {
      await File.deleteMany({
        _id: {
          $in: savedDocuments.map((file) => file._id),
        },
      });
    }

    throw error;
  }
};

// --------------------------------------------------
// DELETE CLOUDINARY IMAGES AND THEIR FILE DOCUMENTS
// Keep a File document if Cloudinary deletion fails.
// --------------------------------------------------

const removeFiles = async (fileIds = []) => {
  if (!fileIds.length) return;

  const files = await File.find({
    _id: { $in: fileIds },
  });

  const results = await Promise.allSettled(
    files.map(async (file) => {
      await deleteCloudinary(file.fileID);

      await File.deleteOne({
        _id: file._id,
      });
    })
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        `Failed to remove Cloudinary image ${files[index].fileID}:`,
        result.reason?.message || result.reason
      );
    }
  });
};

// --------------------------------------------------
// 1. CREATE REPORT
// POST /api/reports
// --------------------------------------------------

const createReport = async (req, res) => {
  let savedFiles = [];

  try {
    const { description, title, category } = req.body;
    const coordinates = parseCoordinates(req.body.coordinates);

    if (typeof description !== "string" || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    if (!isValidCoordinates(coordinates)) {
      return res.status(400).json({
        success: false,
        message: "Coordinates must be [longitude, latitude]",
      });
    }

    const files = getUploadedFiles(req);
    const imageError = validateImages(files);

    if (imageError) {
      return res.status(400).json({
        success: false,
        message: imageError,
      });
    }

    savedFiles = await saveFiles(files);

    const report = await Report.create({
      user: req.user._id,
      title: typeof title === "string" ? title.trim() : "",
      description: description.trim(),
      category:
        typeof category === "string" ? category.trim() : "",
      files: savedFiles.map((file) => file._id),
      location: {
        type: "Point",
        coordinates,
      },
    });

    const populatedReport = await populateReport(
      Report.findById(report._id)
    );

    return res.status(201).json({
      success: true,
      message: "Report created successfully",
      report: populatedReport,
    });
  } catch (error) {
    if (savedFiles.length) {
      await removeFiles(savedFiles.map((file) => file._id));
    }

    console.error("Create report error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create report",
    });
  }
};

// --------------------------------------------------
// 2. GET ALL REPORTS
// GET /api/reports?page=1&limit=10&status=pending
// --------------------------------------------------

const getAllReports = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const filter = {};

    if (req.query.status) {
      const allowedStatuses = [
        "pending",
        "in_progress",
        "resolved",
      ];

      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid report status",
        });
      }

      filter.status = req.query.status;
    }

    const [reports, total] = await Promise.all([
      populateReport(
        Report.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
      ),
      Report.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      reports,
    });
  } catch (error) {
    console.error("Get reports error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
    });
  }
};

// --------------------------------------------------
// 3. GET ONE REPORT
// GET /api/reports/:id
// --------------------------------------------------

const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const report = await populateReport(
      Report.findById(id)
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Get report error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch report",
    });
  }
};

// --------------------------------------------------
// 4. GET LOGGED-IN USER'S REPORTS
// GET /api/reports/my
// --------------------------------------------------

const getMyReports = async (req, res) => {
  try {
    const reports = await populateReport(
      Report.find({ user: req.user._id }).sort({
        createdAt: -1,
      })
    );

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error("Get my reports error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your reports",
    });
  }
};

// --------------------------------------------------
// 5. GET NEARBY UNRESOLVED REPORTS
// GET /api/reports/nearby?longitude=...&latitude=...&distance=1000
// Distance is in meters.
// --------------------------------------------------

const getNearbyReports = async (req, res) => {
  try {
    const longitude = Number(req.query.longitude);
    const latitude = Number(req.query.latitude);
    const distance =
      req.query.distance === undefined
        ? 1000
        : Number(req.query.distance);

    if (
      req.query.longitude === undefined ||
      req.query.latitude === undefined ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(distance) ||
      distance <= 0 ||
      distance > 100000
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide valid coordinates and distance in meters",
      });
    }

    console.log(longitude , latitude);

    const reports = await populateReport(
      Report.find({
        status: { $ne: "resolved" },
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
            $maxDistance: distance,
          },
        },
      }).limit(100)
    );

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error("Nearby reports error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch nearby reports",
    });
  }
};


// --------------------------------------------------
// 6. UPDATE REPORT AND ADD/REMOVE IMAGES
// PATCH /api/reports/:id
//
// removeFileIds must contain MongoDB File document IDs,
// not Cloudinary public IDs.
// --------------------------------------------------

const updateReport = async (req, res) => {
  let newFiles = [];

  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    if (report.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own reports",
      });
    }

    if (report.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending reports can be edited",
      });
    }

    if (req.body.title !== undefined) {
      if (
        typeof req.body.title !== "string" ||
        !req.body.title.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Title cannot be empty",
        });
      }

      report.title = req.body.title.trim();
    }

    if (req.body.description !== undefined) {
      if (
        typeof req.body.description !== "string" ||
        !req.body.description.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Description cannot be empty",
        });
      }

      report.description = req.body.description.trim();
    }

    if (req.body.category !== undefined) {
      if (
        typeof req.body.category !== "string" ||
        !req.body.category.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Category cannot be empty",
        });
      }

      report.category = req.body.category.trim();
    }

    if (req.body.coordinates !== undefined) {
      const coordinates = parseCoordinates(
        req.body.coordinates
      );

      if (!isValidCoordinates(coordinates)) {
        return res.status(400).json({
          success: false,
          message: "Coordinates must be [longitude, latitude]",
        });
      }

      report.location.coordinates = coordinates;
    }

    // Parse the IDs of images the user wants to remove.
    let removeFileIds = req.body.removeFileIds ?? [];

    if (typeof removeFileIds === "string") {
      try {
        removeFileIds = JSON.parse(removeFileIds);
      } catch {
        return res.status(400).json({
          success: false,
          message: "removeFileIds must be a JSON array",
        });
      }
    }

    if (
      !Array.isArray(removeFileIds) ||
      !removeFileIds.every(
        (fileId) =>
          typeof fileId === "string" && isValidId(fileId)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid removeFileIds",
      });
    }

    const uniqueRemoveIds = [...new Set(removeFileIds)];

    const existingIds = report.files.map((fileId) =>
      fileId.toString()
    );

    if (
      uniqueRemoveIds.some(
        (fileId) => !existingIds.includes(fileId)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more files do not belong to this report",
      });
    }

    const files = getUploadedFiles(req);
    const imageError = validateImages(files);

    if (imageError) {
      return res.status(400).json({
        success: false,
        message: imageError,
      });
    }

    const remainingCount =
      report.files.length -
      uniqueRemoveIds.length +
      files.length;

    if (remainingCount > MAX_IMAGES) {
      return res.status(400).json({
        success: false,
        message: `A report can have a maximum of ${MAX_IMAGES} images`,
      });
    }

    // Upload new images to Cloudinary.
    newFiles = await saveFiles(files);

    report.files = report.files.filter(
      (fileId) =>
        !uniqueRemoveIds.includes(fileId.toString())
    );

    report.files.push(
      ...newFiles.map((file) => file._id)
    );

    await report.save();

    // Delete removed Cloudinary assets after saving the report.
    await removeFiles(uniqueRemoveIds);

    // Populate user, cleanedBy, and files in the response.
    const updatedReport = await populateReport(
      Report.findById(report._id)
    );

    return res.status(200).json({
      success: true,
      message: "Report updated successfully",
      report: updatedReport,
    });
  } catch (error) {
    // Only clean up new images that are not referenced by the report.
    if (newFiles.length) {
      try {
        const currentReport = await Report.findById(
          req.params.id
        );

        const referencedIds = new Set(
          (currentReport?.files || []).map((fileId) =>
            fileId.toString()
          )
        );

        const unreferencedFiles = newFiles
          .filter(
            (file) => !referencedIds.has(file._id.toString())
          )
          .map((file) => file._id);

        if (unreferencedFiles.length) {
          await removeFiles(unreferencedFiles);
        }
      } catch (cleanupError) {
        console.error(
          "New image cleanup error:",
          cleanupError.message
        );
      }
    }

    console.error("Update report error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update report",
    });
  }
};

// --------------------------------------------------
// 7. DELETE REPORT AND ITS IMAGES
// DELETE /api/reports/:id
// --------------------------------------------------

const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    const isOwner =
      report.user.toString() === req.user._id.toString();

    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete this report",
      });
    }

    if (report.status === "in_progress" && !isAdmin) {
      return res.status(400).json({
        success: false,
        message: "Reports in progress cannot be deleted",
      });
    }

    await Report.findByIdAndDelete(id);

    // Failed Cloudinary deletions are logged; their File records
    // remain available for a later cleanup retry.
    await removeFiles(report.files);

    return res.status(200).json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Delete report error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete report",
    });
  }
};

// --------------------------------------------------
// 8. JOIN A CLEANUP
// POST /api/reports/:id/join
// --------------------------------------------------

const joinCleanup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const report = await Report.findOneAndUpdate(
      {
        _id: id,
        user: { $ne: req.user._id },
        status: { $ne: "resolved" },
        cleanedBy: { $ne: req.user._id },
      },
      {
        $addToSet: {
          cleanedBy: req.user._id,
        },
        $set: {
          status: "in_progress",
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!report) {
      return res.status(400).json({
        success: false,
        message:
          "Report unavailable, already joined, or you cannot join your own report",
      });
    }

    // Populate user, cleanedBy, and files.
    const populatedReport = await populateReport(
      Report.findById(report._id)
    );

    return res.status(200).json({
      success: true,
      message: "You joined the cleanup successfully",
      report: populatedReport,
    });
  } catch (error) {
    console.error("Join cleanup error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to join cleanup",
    });
  }
};

// --------------------------------------------------
// 9. LEAVE A CLEANUP
// POST /api/reports/:id/leave
// --------------------------------------------------

const leaveCleanup = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const report = await Report.findOneAndUpdate(
      {
        _id: id,
        status: "in_progress",
        cleanedBy: req.user._id,
      },
      {
        $pull: {
          cleanedBy: req.user._id,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!report) {
      return res.status(400).json({
        success: false,
        message: "You have not joined this active cleanup",
      });
    }

    // Return the report to pending if nobody remains.
    if (report.cleanedBy.length === 0) {
      await Report.updateOne(
        {
          _id: id,
          status: "in_progress",
          cleanedBy: { $size: 0 },
        },
        {
          $set: {
            status: "pending",
          },
        }
      );

      report.status = "pending";
    }

    // Populate user, cleanedBy, and files.
    const populatedReport = await populateReport(
      Report.findById(report._id)
    );

    return res.status(200).json({
      success: true,
      message: "You left the cleanup",
      report: populatedReport,
    });
  } catch (error) {
    console.error("Leave cleanup error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to leave cleanup",
    });
  }
};

// --------------------------------------------------
// 10. UPDATE REPORT STATUS (ADMIN ONLY)
// PATCH /api/reports/:id/status
// --------------------------------------------------

const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    if (
      !["pending", "in_progress", "resolved"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid report status",
      });
    }

    if (req.user.role !== "ngo") {
      return res.status(403).json({
        success: false,
        message: "Only admins can change report status",
      });
    }

    const report = await Report.findByIdAndUpdate(
      id,
      {
        $set: { status },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Populate user, cleanedBy, and files.
    const populatedReport = await populateReport(
      Report.findById(report._id)
    );

    return res.status(200).json({
      success: true,
      message: "Report status updated successfully",
      report: populatedReport,
    });
  } catch (error) {
    console.error("Update status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update report status",
    });
  }
};

// --------------------------------------------------
// EXPORT CONTROLLER FUNCTIONS
// --------------------------------------------------
// Get all reports the logged-in user has joined for cleanup
const getReportsThatIJoined = async (req, res) => {
  try {
    const userId = req.user._id;

    // console.log('here');

    const reports = await Report.find({
      cleanedBy: userId,
    })
      .populate("user", "name email")
      .populate("cleanedBy", "name")
      .populate("files")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error("Get joined reports error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch reports you have joined.",
    });
  }
};
module.exports = {
  createReport,
  getAllReports,
  getReportById,
  getNearbyReports,
  getMyReports,
  updateReport,
  deleteReport,
  joinCleanup,
  leaveCleanup,
  updateReportStatus,
  getReportsThatIJoined
};