const jwtService = require("../config/JWT.js");

const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookie.acessToken;
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

  const requireLandlord = (req, res, next) => {
    if (!req.user || !re.user.is_landlord) {
      return res.staus(403).json({
        staus: "error",
        message: "Acess denied. Only landlords can perform this action",
      });
    }
  };

  nest();
};
module.exports = { requreAuth, requireLandlord };
