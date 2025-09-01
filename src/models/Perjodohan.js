const mongoose = require("mongoose");

const PerjodohanSchema = new mongoose.Schema(
  {
    kucing1: {
      type: mongoose.Types.ObjectId,
      ref: "Kucing",
      require: true,
    },

    kucing2: {
      type: mongoose.Types.ObjectId,
      ref: "Kucing",
      require: true,
    },
    status: {
      type: String,
      enum: ["berhasil", "gagal", "pending"],
      default: "pending",
    },

    tanggal: {
      type: Date,
      default: Date.now,
    },
    catatan: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Perjodohan", PerjodohanSchema);
