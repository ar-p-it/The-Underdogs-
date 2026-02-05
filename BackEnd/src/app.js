require("dotenv").config();

// Debug: Check if env variables loaded
console.log("=== ENV VARIABLES CHECK ===");
console.log("FINTERNET_API_KEY:", process.env.FINTERNET_API_KEY);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("==========================");

const express = require("express");
const app = express();
const connectDB = require("./config/databse");
const cookieParser = require("cookie-parser");
const cors = require("cors");
app.use(express.json());
app.use(cookieParser());
// CORS: allow local dev origins and optional env override
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  "http://localhost:5174",
];

app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow same-origin/non-browser requests
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
  }),
);
// middleware

// root route
app.get("/", (req, res) => {
  res.send("Hello");
});

const authRouter = require("./routes/auth");
const groupsRouter = require("./routes/groups");
const poolsRouter = require("./routes/pools");

app.use("/", authRouter);
app.use("/groups", groupsRouter);
app.use("/pools", poolsRouter);

// connect DB then start server
connectDB()
  .then(() => {
    console.log("DB connection Success");

    const PORT = 7777;
    app.listen(PORT, () => {
      console.log(`Listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err.message);
  });
