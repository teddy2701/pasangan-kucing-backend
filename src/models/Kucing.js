const mongoose = require("mongoose");

const KucingSchema = new mongoose.Schema(
  {
    userRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nama: {
      type: String,
      required: true,
    },
    ras: {
      type: String,
      required: true,
    },
    jenisKelamin: {
      type: String,
      enum: ["jantan", "betina"],
      required: true,
    },
    tglLahir: {
      type: Date,
      required: true,
    },
    warna: {
      type: String,
      required: true,
    },
    deskripsi: {
      type: String,
      required: true,
    },
    foto: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Kucing", KucingSchema);
