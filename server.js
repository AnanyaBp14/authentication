// server.js
require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const initializePostgres = require("./init_pg_auto");

initializePostgres(); // ensure tables + defaults

const app = express();
const server = http.createServer(app);

/* ---------------- SOCKET.IO ---------------- */
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

/* ---------------- MIDDLEWARE ---------------- */
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://mochamist.onrender.com"
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

/* ---------------- ROUTES ---------------- */
app.use("/api/auth", require("./routes/auth_pg"));
app.use("/api/menu", require("./routes/menu_pg"));

const orderRoutes = require("./routes/orders_pg");
orderRoutes.setSocketIO(io);
app.use("/api/orders", orderRoutes);

/* ---------------- SOCKET.IO EVENTS ---------------- */
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("register", ({ token }) => {
    try {
      if (!token) return;
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      // join rooms:
      socket.join(`user_${decoded.id}`);
      if (decoded.role === "barista") socket.join("baristas");
      console.log("Socket registered for user", decoded.id);
    } catch (err) {
      console.log("Invalid WS token from client");
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

/* ---------------- START ---------------- */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🔥 Server running on PORT ${PORT}`));
const menuRoutes = require("./routes/menu_pg");
menuRoutes.setSocket(io);
app.use("/api/menu", menuRoutes);

