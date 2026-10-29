const express = require("express");
const router = express.Router();
const path = require("path");

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
  getReportsThatIJoined,
} = require("../controller/cloud_report.controller.js");

const ngoMiddleware = require("../middleWare/ngo.middleware.js");
const userMiddleware = require("../middleWare/user.middleware.js");

const upload = require("../middleWare/uploadMiddleWare.js");

// Public routes
router.get("/", getAllReports);
router.get("/nearby", getNearbyReports);

// Protected routes — place before /:id
router.get("/my-reports", userMiddleware, getMyReports);

router.get("/joined", userMiddleware, getReportsThatIJoined);


router.post(
  "/",
  userMiddleware,
  express.static(path.join(process.cwd(), "uploads")),
  createReport
);

router.patch(
  "/:id",
  userMiddleware,
 express.static(path.join(process.cwd(), "uploads")),
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
