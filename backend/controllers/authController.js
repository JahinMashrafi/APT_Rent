const pool = require("../config/db.js");
const jwtService = require("../config/JWT.js");
const bcrypt = require("bcrypt");

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const getTokenFromRequest = (req) =>
  req.cookies?.accessToken || req.cookies?.token || null;

const registerUser = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    password,
    is_landlord,
    is_tenant,
    address,
    occupation,
  } = req.body;
  let errors = [];

  if (!firstName || firstName.length === 0) {
    errors.push({ field: "firstName", message: "First name is invalid" });
  }
  if (!password || password.length === 0) {
    errors.push({ field: "password", message: "password is invalid" });
  }
  if (
    !email ||
    email.length === 0 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.push({ field: "email", message: "Email is invalid" });
  }
  if (!phone || phone.length === 0) {
    errors.push({ field: "phone", message: "Phone is invalid" });
  }

  if (!is_landlord && !is_tenant) {
    errors.push({
      field: "role",
      message: "You must register as a tenant or a landlord",
    });
  }

  if (errors.length > 0) {
    return res.status(422).json({ errors: errors });
  }

  try {
    const saltRound = 10;
    const hashedPassword = await bcrypt.hash(password, saltRound);
    const fullName = lastName && lastName.trim()
      ? `${firstName.trim()} ${lastName.trim()}`
      : firstName.trim();
    const isAdmin = false;

    const userResult = await pool.query(
      `
      insert into users (name, email, password_hash, contact_number, is_landlord, is_tenant, is_admin, address, occupation)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      returning user_id, name, email, contact_number, is_landlord, is_tenant, is_admin, address, occupation
      `,
      [
        fullName,
        email,
        hashedPassword,
        phone,
        Boolean(is_landlord),
        Boolean(is_tenant),
        isAdmin,
        address,
        occupation,
      ],
    );
    const newUser = userResult.rows[0];

    const token = await jwtService.generateToken({
      user_id: newUser.user_id,
      is_tenant: newUser.is_tenant,
      is_landlord: newUser.is_landlord,
      is_admin: newUser.is_admin,
    });
    const cookieOptions = getCookieOptions();
    res.cookie("accessToken", token, cookieOptions);

    return res.status(201).json({
      status: "success",
      message: "registration successful",
      data: {
        accessToken: token,
        user: {
          userId: newUser.user_id,
          name: newUser.name,
          email: newUser.email,
          contact_number: newUser.contact_number,
          is_tenant: newUser.is_tenant,
          is_landlord: newUser.is_landlord,
          is_admin: newUser.is_admin,
          address: newUser.address,
          occupation: newUser.occupation,
        },
      },
    });
  } catch (error) {
    console.error("Registration error: ", error);
    if (error.code === "23505") {
      return res.status(409).json({
        status: "error",
        message: "Email or phone number is already registered",
        statusCode: 409,
      });
    }
    return res.status(400).json({
      status: "Bad request",
      message: "Registration unsuccessful",
      statusCode: 400,
    });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length === 0
  ) {
    return res.status(401).json({
      status: "Bad request",
      message: "Authentication failed",
      statusCode: 401,
    });
  }

  try {
    const result = await pool.query("select * from users where email = $1", [
      email,
    ]);
    const user = result.rows[0];

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const payload = {
      user_id: user.user_id,
      is_landlord: user.is_landlord,
      is_tenant: user.is_tenant,
      is_admin: user.is_admin,
    };
    const token = await jwtService.generateToken(payload);

    const cookieOptions = getCookieOptions();
    res.cookie("accessToken", token, cookieOptions);

    res.status(200).json({
      success: true,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        islandlord: user.is_landlord,
        istenant: user.is_tenant,
        isadmin: user.is_admin,
      },
    });
  } catch (err) {
    console.error("Login Error: ", err);
    res.status(500).json({ success: false, message: "Tnternal server error" });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized access. please log in" });
    }

    const decoded = await jwtService.verifyToken(token);
    const userId = decoded.user_id || decoded.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Invalid auth token" });
    }

    const userResult = await pool.query(
      `select user_id, name, email, contact_number, address, occupation, profile_picture_url, is_landlord, is_tenant, is_admin
       from users
       where user_id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Authenticated user not found" });
    }

    const user = userResult.rows[0];
    return res.status(200).json({
      success: true,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        contact_number: user.contact_number,
        address: user.address,
        occupation: user.occupation,
        profile_picture_url: user.profile_picture_url,
        is_landlord: user.is_landlord,
        is_tenant: user.is_tenant,
        is_admin: user.is_admin,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(403).json({ success: false, message: "Session expired or invalid token" });
  }
};

const logoutUser = async (req, res) => {
  const cookieOptions = getCookieOptions();
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("token", cookieOptions);
  return res.status(200).json({ success: true, message: "Logged out successfully" });
};

module.exports = { loginUser, registerUser, getCurrentUser, logoutUser };