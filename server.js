// server.js
require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const initializePostgres = require("./init_pg_auto");
initializePostgres();

const app = express();
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://mochamist.onrender.com"
    ],
    credentials: true
  }
});

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://mochamist.onrender.com"
    ],
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

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

/* ROUTES */
app.use("/api/auth", require("./routes/auth_pg.js"));
app.use("/api/menu", require("./routes/menu_pg.js"));

const orderRoutes = require("./routes/orders_pg.js");
orderRoutes.setSocketIO(io);
app.use("/api/orders", orderRoutes);

// TEMP
app.use("/api/debug", require("./routes/debug_setpw"));

/* SOCKET.IO */
io.on("connection", (socket) => {
  console.log("Socket:", socket.id);

  socket.on("register", (payload) => {
    try {
      const decoded = jwt.verify(
        payload.token,
        process.env.JWT_ACCESS_SECRET
      );

      addSocketForUser(decoded.id, socket.id);

      if (decoded.role === "barista") {
        socket.join("baristas");
      }
    } catch (e) {
      console.log("Invalid WS token");
    }
  });

  socket.on("disconnect", () => {
    for (const [uid, set] of userSockets.entries()) {
      if (set.has(socket.id)) removeSocketForUser(uid, socket.id);
    }
  });
});

/* START */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log("🔥 Server running on PORT", PORT)
);
