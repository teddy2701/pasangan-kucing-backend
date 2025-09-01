const express = require("express");
const {
  getRecommendedCats,
  getCatOwner,
  getAllCats,
  getCatById,
  addCat,
  getPerjodohan,
  addPerjodohan,
  updatePerjodohanStatus,
} = require("../controllers/cat.js");
const uploadImage = require("../middleware/uploadImage");

const router = express.Router();

router.get("/recommended/:id", getRecommendedCats);
router.get("/owner/:userID", getCatOwner);
router.get("/", getAllCats);
router.get("/:id", getCatById);
router.get("/perjodohan/get/:kucingId", getPerjodohan);

router.post("/perjodohan/add", addPerjodohan);
router.post("/perjodohan/update", updatePerjodohanStatus);
router.post("/add", uploadImage, addCat);

module.exports = router;
