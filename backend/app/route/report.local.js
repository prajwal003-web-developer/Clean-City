const express = require("express");
const router = express.Router();

const {
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
} = require("../controller/report.controller.js");

const ngoMiddleware = require("../middleWare/ngo.middleware.js");
const userMiddleware = require("../middleWare/user.middleware.js");

const upload = require("../middleWare/uploadMiddleWare.js");

// Public routes
router.get("/", getAllReports);
router.get("/nearby", getNearbyReports);

// Protected routes — place before /:id
router.get("/my-reports", userMiddleware, getMyReports);

router.post(
  "/",
  userMiddleware,
  upload.array("files", 3),
  createReport
);

router.patch(
  "/:id",
  userMiddleware,
  upload.array("files", 3),
  updateReport
);

router.post("/:id/join", ngoMiddleware, joinCleanup);
router.post("/:id/leave", userMiddleware, leaveCleanup);

// Admin authorization must be checked inside the controller
router.patch("/:id/status", ngoMiddleware, updateReportStatus);

router.delete("/:id", userMiddleware, deleteReport);

// Keep the dynamic ID route last
router.get("/:id", getReportById);

module.exports = router;
