require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

// Load SQLite DB initializer
require("./init_db");

const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

// SOCKET.IO SETUP
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://mochamist.onrender.com"
    ],
    credentials: true,
  },
});

// SOCKET USER MAP
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

// GLOBAL CORS
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://mochamist.onrender.com",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

// ROUTES — NOW USING SQLITE
app.use("/api/auth", require("./routes/auth_sqlite.js"));
app.use("/api/menu", require("./routes/menu.js"));

const orderRoutes = require("./routes/orders.js");
orderRoutes.setSocketIO(io);
app.use("/api/orders", orderRoutes);

// SOCKET.IO CONNECTION HANDLER
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
      console.log("Invalid token on socket.register");
    }
  });

  socket.on("disconnect", () => {
    for (const [uid, set] of userSockets.entries()) {
      if (set.has(socket.id)) removeSocketForUser(uid, socket.id);
    }
  });
});

// START
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log("🔥 Server + Socket.io running on PORT", PORT)
);
