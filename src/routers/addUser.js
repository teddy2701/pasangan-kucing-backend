const express = require("express");
const addUser = require("../controllers/addUser.js");
const uploadImage = require("../middleware/uploadImage");

const router = express.Router();

router.post("/add", uploadImage, addUser.tambahUser);

module.exports = router;
