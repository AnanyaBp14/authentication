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

/* SOCKET.IO */
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "https://mochamist.onrender.com",
    credentials: true
  }
});

app.use(cors({
  origin: "https://mochamist.onrender.com",
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

/* ROUTES */
app.use("/api/auth", require("./routes/auth_pg"));
app.use("/api/menu", require("./routes/menu_pg"));

const orderRoutes = require("./routes/orders_pg");
orderRoutes.setSocketIO(io);
app.use("/api/orders", orderRoutes);

/* SOCKET AUTH */
io.on("connection", socket => {
  console.log("SOCKET:", socket.id);

  socket.on("register", ({ token }) => {
    try {
      const user = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.join(`user_${user.id}`);
      if (user.role === "barista") socket.join("baristas");
    } catch (e) {
      console.log("Invalid WS token");
    }
  });
});

server.listen(5000, () =>
  console.log("🔥 Server running on port 5000")
);
