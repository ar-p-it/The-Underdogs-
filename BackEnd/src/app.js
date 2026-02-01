const express = require("express");
const app = express();
const connectDB = require("./config/databse");
const cookieParser = require("cookie-parser");
const cors = require("cors");
app.use(express.json());
app.use(cookieParser());
app.use(cors());
// middleware

// root route
app.get("/", (req, res) => {
  res.send("Hello");
});

const authRouter = require("./routes/auth");


app.use("/", authRouter);

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
