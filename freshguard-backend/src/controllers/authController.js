const bcrypt = require("bcrypt");

const User = require("../models/User");
const {
  registerSchema,
  loginSchema,
} = require("../validations/authValidation");
const generateToken = require("../utils/generateToken");
const createHttpError = require("../utils/httpError");

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const sendError = (res, error) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: error.message || "Something went wrong.",
  });
};

const register = async (req, res) => {
  try {
    const payload = await registerSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const existingUser = await User.findOne({ email: payload.email.toLowerCase() });

    if (existingUser) {
      throw createHttpError(409, "A user with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await User.create({
      name: payload.name,
      email: payload.email.toLowerCase(),
      passwordHash,
      role: payload.role ?? "STAFF",
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: sanitizeUser(user),
      },
      message: "User registered successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const login = async (req, res) => {
  try {
    const payload = await loginSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const user = await User.findOne({ email: payload.email.toLowerCase() });

    if (!user || !user.isActive) {
      throw createHttpError(401, "Invalid email or password.");
    }

    const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);

    if (!isPasswordValid) {
      throw createHttpError(401, "Invalid email or password.");
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: sanitizeUser(user),
      },
      message: "Login successful.",
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const me = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
    message: "Current user fetched successfully.",
  });
};

const listSalesUsers = async (_req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select("name email role isActive createdAt updatedAt")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      data: {
        users: users.map(sanitizeUser),
      },
      message: "Sales users fetched successfully.",
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  register,
  login,
  me,
  listSalesUsers,
};
