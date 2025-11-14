require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

// Load DB (auto-run)
require("./db");

const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

// SOCKET.IO SETUP
const io = new Server(server, {
  cors: {
    origin: [/localhost/, /127\.0\.0\.1/],
    credentials: true,
  },
});

// Map user → socket list
const userSockets = new Map();
function addSocketForUser(userId, socketId) {
  const set = userSockets.get(userId) || new Set();
  set.add(socketId);
  userSockets.set(userId, set);
}
function removeSocketForUser(userId, socketId) {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(userId);
}
function emitToUser(userId, event, payload) {
  const set = userSockets.get(userId);
  if (!set) return;
  for (const sid of set) io.to(sid).emit(event, payload);
}

// ------------------------------------

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        origin.startsWith("http://localhost") ||
        origin.startsWith("http://127.0.0.1")
      ) {
        return callback(null, true);
      }
      callback(new Error("Blocked by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

// ROUTES (Fix: include .js extensions)
app.use("/api/auth", require("./routes/auth.js"));
app.use("/api/menu", require("./routes/menu.js"));

const orderRoutes = require("./routes/orders.js");
orderRoutes.setSocketIO(io);
app.use("/api/orders", orderRoutes);

// SOCKET.IO LISTENER
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("register", (payload) => {
    try {
      if (!payload?.token) return;

      const decoded = jwt.verify(
        payload.token,
        process.env.JWT_ACCESS_SECRET
      );

      addSocketForUser(decoded.id, socket.id);

      if (decoded.role === "barista" || decoded.role === "admin") {
        socket.join("baristas");
      }

      socket.emit("registered", { ok: true });
    } catch (e) {
      console.log("Invalid token at socket.register");
    }
  });

  socket.on("disconnect", () => {
    for (const [uid, set] of userSockets.entries()) {
      if (set.has(socket.id)) {
        removeSocketForUser(uid, socket.id);
      }
    }
  });
});

// START SERVER
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("🔥 Server + Socket.io running on PORT", PORT);
});
