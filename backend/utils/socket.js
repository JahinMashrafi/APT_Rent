const { Server } = require("socket.io");
const cookie = require("cookie");
const jwtService = require("../config/JWT.js");

let io = null;
// userId -> Set of connected socket ids (a user can have multiple tabs/devices open)
const onlineUsers = new Map();

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true, // required for the browser to send the accessToken cookie on the socket handshake
    },
  });

  // Same auth as requireAuth — reads the accessToken cookie, verifies it with
  // the same JWT secret, and attaches the decoded payload as socket.user.
  io.use(async (socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      if (!rawCookie) return next(new Error("Unauthorized"));
      const parsed = cookie.parse(rawCookie);
      const token = parsed.accessToken;
      if (!token) return next(new Error("Unauthorized"));
      socket.user = await jwtService.verifyToken(token);
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.user_id;

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    socket.join(`user:${userId}`); // lets emitToUser() reach every tab this user has open

    // Only announce online on the FIRST connection for this user (second tab
    // opening shouldn't re-broadcast). Broadcasts to all connected clients —
    // simplest option for now; scoping to just conversation partners would
    // need a DB lookup of this user's conversations on every connect.
    if (onlineUsers.get(userId).size === 1) {
      io.emit("presence:update", { user_id: userId, is_online: true });
    }

    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(userId);
      if (!sockets) return;
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit("presence:update", { user_id: userId, is_online: false });
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized — call initSocket(httpServer) first");
  return io;
};

const isUserOnline = (userId) => onlineUsers.has(userId);

const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

module.exports = { initSocket, getIO, isUserOnline, emitToUser };