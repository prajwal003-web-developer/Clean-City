const mongoose = require("mongoose");

const Report = require("../model/report.js");
const File = require("../model/file.js");
const { uploadLocal, deleteLocal } = require("../../lib/fileupload.js");

const isValidId = (id) => mongoose.isValidObjectId(id);

const parseCoordinates = (coordinates) => {
  console.log(coordinates);
  if (typeof coordinates === "string") {
    try {
      return coordinates.split(",").map((value) => parseFloat(value.trim()));
    } catch {
      return null;
    }
  }

  return coordinates;
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

const validateImages = (files = []) => {
  if (!Array.isArray(files)) {
    return "Invalid file upload format";
  }

  if (files.length > 3) {
    return "You can upload a maximum of 3 images";
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (files.some((file) => !allowedTypes.includes(file.mimetype))) {
    return "Only JPEG, PNG, WEBP and GIF images are allowed";
  }

  if (files.some((file) => file.truncated || file.size > 5 * 1024 * 1024)) {
    return "Each image must be 5 MB or smaller";
  }

  return null;
};

// Populate report references.
const populateReport = (query) =>
  query
    .populate("user", "name email") 
    .populate("cleanedBy", "name")
    .populate("files");

// Save uploaded images locally and create File documents.
const saveFiles = async (files = []) => {
  const saved = [];

  try {
    for (const file of files) {
      const uploaded = await uploadLocal(file, "reports");

      // Save the complete URL and the local filename.
      const fileDocument = await File.create({
        path: uploaded.path,
        fileID: uploaded.fileID,
      });

      saved.push(fileDocument);
    }

    return saved;
  } catch (error) {
    await removeFiles(saved.map((file) => file._id));
    throw error;
  }
};

// Delete local files and their File documents.
const removeFiles = async (fileIds = []) => {
  if (!fileIds.length) return;

  const files = await File.find({
    _id: { $in: fileIds },
  });

  await Promise.all(
    files.map(async (file) => {
      try {
        await deleteLocal(file.fileID, "reports");
      } catch (error) {
        console.error(
          `Failed to delete local image ${file.fileID}:`,
          error.message
        );
      }
    })
  );

  await File.deleteMany({
    _id: { $in: fileIds },
  });
};


const getUploadedFiles = (req) => {
  const incoming = req.files?.files;

  if (!incoming) return [];

  return Array.isArray(incoming) ? incoming : [incoming];
};

// 1. Create a report
const createReport = async (req, res) => {
  let savedFiles = [];

  try {
    const { description ,title , category} = req.body;
    const coordinates = parseCoordinates(req.body.coordinates);

    console.log(coordinates);

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
      description: description.trim(),
      title: title?.trim() || "",
      category: category?.trim() || "",
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

// 2. Get all reports with pagination and status filter
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

// 3. Get one report
const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const report = await populateReport(Report.findById(id));

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

// 4. Get reports belonging to the logged-in user
const getMyReports = async (req, res) => {
  try {
    const reports = await populateReport(
      Report.find({ user: req.user._id }).sort({ createdAt: -1 })
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

// 5. Get nearby unresolved reports
// Distance is measured in meters.
const getNearbyReports = async (req, res) => {
  try {
    const longitude = Number(req.query.longitude);
    const latitude = Number(req.query.latitude);
    const distance = Number(req.query.distance || 1000);

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

// 6. Update a report and optionally add/remove images

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

    // Only the report owner can update it.
    if (report.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own reports",
      });
    }

    // Only pending reports can be edited.
    if (report.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending reports can be edited",
      });
    }

    // Update title.
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

    // Update description.
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

    // Update category.
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

    // Update coordinates.
    if (req.body.coordinates !== undefined) {
      const coordinates = parseCoordinates(req.body.coordinates);

      if (!isValidCoordinates(coordinates)) {
        return res.status(400).json({
          success: false,
          message: "Coordinates must be [longitude, latitude]",
        });
      }

      report.location.coordinates = coordinates;
    }

    // Parse image IDs to remove.
    let removeFileIds = req.body.removeFileIds || [];

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
      !removeFileIds.every(isValidId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid removeFileIds",
      });
    }

    const existingIds = report.files.map((fileId) =>
      fileId.toString()
    );

    if (
      removeFileIds.some((fileId) => !existingIds.includes(fileId))
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more files do not belong to this report",
      });
    }

    // Validate newly uploaded images.
    const files = getUploadedFiles(req);
    const imageError = validateImages(files);

    if (imageError) {
      return res.status(400).json({
        success: false,
        message: imageError,
      });
    }

    const uniqueRemoveIds = [...new Set(removeFileIds)];

    const remainingCount =
      report.files.length -
      uniqueRemoveIds.length +
      files.length;

    if (remainingCount > 3) {
      return res.status(400).json({
        success: false,
        message: "A report can have a maximum of 3 images",
      });
    }

    // Save newly uploaded images locally.
    newFiles = await saveFiles(files);

    report.files = report.files.filter(
      (fileId) => !uniqueRemoveIds.includes(fileId.toString())
    );

    report.files.push(...newFiles.map((file) => file._id));

    await report.save();

    // Delete removed images after the report is saved.
    await removeFiles(uniqueRemoveIds);

    const updatedReport = await populateReport(
      Report.findById(report._id)
    );

    return res.status(200).json({
      success: true,
      message: "Report updated successfully",
      report: updatedReport,
    });
  } catch (error) {
    if (newFiles.length) {
      try {
        // Avoid deleting newly uploaded images if the report
        // was already saved successfully.
        const currentReport = await Report.findById(req.params.id);

        const referencedIds = new Set(
          (currentReport?.files || []).map((fileId) =>
            fileId.toString()
          )
        );

        const unreferencedFiles = newFiles
          .filter((file) => !referencedIds.has(file._id.toString()))
          .map((file) => file._id);

        if (unreferencedFiles.length) {
          await removeFiles(unreferencedFiles);
        }
      } catch (cleanupError) {
        console.error("New file cleanup error:", cleanupError.message);
      }
    }

    console.error("Update report error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update report",
    });
  }
};


// 7. Delete a report and its images
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

    const isOwner = report.user.toString() === req.user._id.toString();
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

// 8. Join a cleanup
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
        $addToSet: { cleanedBy: req.user._id },
        $set: { status: "in_progress" },
      },
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(400).json({
        success: false,
        message:
          "Report unavailable, already joined, or you cannot join your own report",
      });
    }

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

// 9. Leave a cleanup
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
        $pull: { cleanedBy: req.user._id },
      },
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(400).json({
        success: false,
        message: "You have not joined this active cleanup",
      });
    }

    if (report.cleanedBy.length === 0) {
      await Report.updateOne(
        {
          _id: id,
          status: "in_progress",
          cleanedBy: { $size: 0 },
        },
        { $set: { status: "pending" } }
      );

      report.status = "pending";
    }

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

// 10. Update report status (admin only)
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

    if (!["pending", "in_progress", "resolved"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report status",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can change report status",
      });
    }

    const report = await Report.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

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
};