
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
require("dotenv").config();

const fileUpload = require("express-fileupload");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

const userRoutes = require("./app/route/user.route.js");
const reportRoutes = require("./app/route/report.local.js");

const userAuth = require("./app/middleWare/middleware.js").userAuth;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
  },
});



app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(process.cwd(), "tmp"),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB per file
      files: 3,                  // Maximum 3 files
    },
    abortOnLimit: true,
    createParentPath: true,
  })
);

// Test route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CleanCity API is running! 🌱",
  });
});

// Test file upload route
app.use('/api/user' , userRoutes)
app.use('/api/reports' ,userAuth ,  reportRoutes)


// Connect MongoDB and start server
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DATABASE_NAME,
    });

    console.log(`MongoDB connected: ${process.env.DATABASE_NAME}`);

    app.listen(PORT,"0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
