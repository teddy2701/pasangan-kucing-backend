const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const port = process.env.PORT || 7863;

dotenv.config();

const addUserRouter = require("./src/routers/addUser.js");
const authRouter = require("./src/routers/auth.js");
const catRouter = require("./src/routers/cat.js");

const app = express();
app.use(cors());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/users", addUserRouter);
app.use("/api/auth", authRouter);
app.use("/api/cat", catRouter);

app.use((error, req, res, next) => {
  const status = error.errorStatus || 500;
  const message = error.message;
  const data = error.data;
  res.status(400).json({
    message: message,
    data: data,
  });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(port, () => console.log("Server listening on port: ", port));
  })
  .catch((err) => console.log(err));
