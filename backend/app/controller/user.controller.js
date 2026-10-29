

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../model/user");

// -------------------- Helpers --------------------

const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidObjectId = (id) => {
  return mongoose.isValidObjectId(id);
};

// Avoid sending sensitive fields to the frontend
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  profileImage: user.profileImage,
  phone: user.phone,
  location: user.location,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const signToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    { id: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const handleControllerError = (res, error) => {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];

    return sendError(
      res,
      409,
      field === "email"
        ? "An account with this email already exists"
        : "A record with this value already exists"
    );
  }

  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map(
      (item) => item.message
    );

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: messages,
    });
  }

  if (error.name === "CastError") {
    return sendError(res, 400, "Invalid ID or field value");
  }

  if (error.name === "MongoServerSelectionError") {
    return sendError(
      res,
      503,
      "Database is temporarily unavailable"
    );
  }

  console.error("User controller error:", error);

  return sendError(res, 500, "Internal server error");
};

// -------------------- Register --------------------

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return sendError(
        res,
        400,
        "Name, email and password are required"
      );
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName) {
      return sendError(res, 400, "Name cannot be empty");
    }

    if (normalizedName.length > 50) {
      return sendError(
        res,
        400,
        "Name cannot exceed 50 characters"
      );
    }

    if (!isValidEmail(normalizedEmail)) {
      return sendError(res, 400, "Please provide a valid email");
    }

    if (normalizedEmail.length > 254) {
      return sendError(res, 400, "Email address is too long");
    }

    if (password.length < 8 || password.length > 128) {
      return sendError(
        res,
        400,
        "Password must be between 8 and 128 characters"
      );
    }

    if (phone !== undefined && typeof phone !== "string") {
      return sendError(res, 400, "Phone must be a string");
    }

    if (phone && phone.trim().length > 25) {
      return sendError(res, 400, "Phone number is too long");
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");
      return sendError(res, 500, "Server configuration error");
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    }).select("_id");

    if (existingUser) {
      return sendError(
        res,
        409,
        "An account with this email already exists"
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Never accept role, isVerified or other privileged
    // fields directly from public registration.
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone?.trim() || "",
      role: "user",
    });

    const token = signToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// -------------------- Login --------------------

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return sendError(res, 400, "Email and password are required");
    }

    if (email.trim().length > 254 || password.length > 128) {
      return sendError(res, 400, "Invalid email or password");
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");
      return sendError(res, 500, "Server configuration error");
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    // Use the same response for unknown emails and wrong passwords.
    if (!user) {
      return sendError(res, 401, "Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return sendError(res, 401, "Invalid email or password");
    }

    const token = signToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// -------------------- Get Current User --------------------

const getMe = async (req, res) => {
  try {
    // userMiddleware has already authenticated the request.
    if (!req.user) {
      return sendError(res, 401, "Please log in to continue");
    }

    return res.status(200).json({
      success: true,
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// -------------------- Update Profile --------------------

const updateProfile = async (req, res) => {
  try {
    if (!req.user?._id || !isValidObjectId(req.user._id)) {
      return sendError(res, 401, "Invalid authenticated user");
    }

    const { name, phone, profileImage } = req.body || {};
    const updates = {};

    // Whitelist editable fields.
    // Never spread req.body directly into a database update.
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return sendError(res, 400, "Name cannot be empty");
      }

      if (name.trim().length > 50) {
        return sendError(
          res,
          400,
          "Name cannot exceed 50 characters"
        );
      }

      updates.name = name.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== "string" || phone.trim().length > 25) {
        return sendError(res, 400, "Invalid phone number");
      }

      updates.phone = phone.trim();
    }

    if (profileImage !== undefined) {
      if (
        typeof profileImage !== "string" ||
        profileImage.length > 2048
      ) {
        return sendError(res, 400, "Invalid profile image URL");
      }

      const imageUrl = profileImage.trim();

      if (
        imageUrl &&
        (!/^https:\/\//i.test(imageUrl) ||
          !/^https:\/\/[^\s]+$/i.test(imageUrl))
      ) {
        return sendError(
          res,
          400,
          "Profile image must be an HTTPS URL"
        );
      }

      updates.profileImage = imageUrl;
    }

    if (Object.keys(updates).length === 0) {
      return sendError(
        res,
        400,
        "Provide at least one valid field to update"
      );
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return sendError(res, 404, "User account not found");
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// -------------------- Update GPS Location --------------------

const updateLocation = async (req, res) => {
  try {
    if (!req.user?._id || !isValidObjectId(req.user._id)) {
      return sendError(res, 401, "Invalid authenticated user");
    }

    const { coordinates } = req.body || {};

    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return sendError(
        res,
        400,
        "Coordinates must be [longitude, latitude]"
      );
    }

    const [longitude, latitude] = coordinates;

    if (
      typeof longitude !== "number" ||
      typeof latitude !== "number" ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      return sendError(
        res,
        400,
        "Invalid longitude or latitude"
      );
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          location: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return sendError(res, 404, "User account not found");
    }

    return res.status(200).json({
      success: true,
      message: "Location updated successfully",
      location: user.location,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// -------------------- Change Password --------------------

const changePassword = async (req, res) => {
  try {
    if (!req.user?._id || !isValidObjectId(req.user._id)) {
      return sendError(res, 401, "Invalid authenticated user");
    }

    const { currentPassword, newPassword } = req.body || {};

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return sendError(
        res,
        400,
        "Current password and new password are required"
      );
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return sendError(
        res,
        400,
        "New password must be between 8 and 128 characters"
      );
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return sendError(res, 404, "User account not found");
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatches) {
      return sendError(res, 401, "Current password is incorrect");
    }

    const samePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (samePassword) {
      return sendError(
        res,
        400,
        "New password must differ from the current password"
      );
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    // Existing JWTs remain valid until they expire unless you
    // implement token revocation or a token-version mechanism.
    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

// -------------------- Delete Account --------------------

const deleteAccount = async (req, res) => {
  try {
    if (!req.user?._id || !isValidObjectId(req.user._id)) {
      return sendError(res, 401, "Invalid authenticated user");
    }

    const { password } = req.body || {};

    if (typeof password !== "string" || !password) {
      return sendError(
        res,
        400,
        "Enter your password to delete your account"
      );
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return sendError(res, 404, "User account not found");
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return sendError(res, 401, "Password is incorrect");
    }

    await User.deleteOne({ _id: user._id });

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  updateLocation,
  changePassword,
  deleteAccount,
};
