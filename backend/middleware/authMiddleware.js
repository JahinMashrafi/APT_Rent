const jwtService = require("../config/JWT.js");
const pool = require("../config/db.js");

const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized access. please log in",
      });
    }

    const decodePayload = await jwtService.verifyToken(token);

    req.user = decodePayload;

    next();
  } catch (error) {
    console.error("JWT Verification Error", error.message);
    return res.status(403).json({
      status: "error",
      message: "Session expired or invalid token. please logi in again.",
    });
  }

};

const requireLandlord = (req, res, next) => {
  if (!req.user || !req.user.is_landlord) {
    return res.status(403).json({
      status: "error",
      message: "Access denied. Only landlords can perform this action",
    });
  }

  next();
};

const requireTenant = (req, res, next) => {
  if (!req.user || !req.user.is_tenant) {
    return res.status(403).json({
      status: "error",
      message: "Access denied. Only tenants can perform this action",
    });
  }
  next();
};

const requireAdmin = async (req, res, next) => {
  if (!req.user?.user_id) {
    return res.status(403).json({
      status: "error",
      message: "Access denied. Admins only",
    });
  }

  try {
    // Check the current database value instead of trusting a potentially
    // stale JWT claim after an account is promoted or demoted.
    const result = await pool.query(
      "SELECT is_admin FROM users WHERE user_id = $1",
      [req.user.user_id],
    );

    if (!result.rows[0]?.is_admin) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Admins only",
      });
    }

    next();
  } catch (error) {
    console.error("Admin authorization lookup error", error.message);
    next(error);
  }
};

module.exports = { requireAuth, requireLandlord, requireTenant, requireAdmin };