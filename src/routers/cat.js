const express = require("express");
const {
  getRecommendedCats,
  getCatOwner,
  getAllCats,
  getCatById,
  addCat,
} = require("../controllers/cat.js");
const uploadImage = require("../middleware/uploadImage");

const router = express.Router();

router.get("/recommended/:id", getRecommendedCats);
router.get("/owner/:userID", getCatOwner);
router.get("/", getAllCats);
router.get("/:id", getCatById);
router.post("/add", uploadImage, addCat);

module.exports = router;
