const modelUser = require("../models/Users.js");
const modelKucing = require("../models/Kucing.js");
const path = require("path");

exports.tambahUser = async (req, res) => {
  try {
    const {
      ownerName,
      phoneNumber,
      address,
      username,
      password,
      catName,
      catBreed,
      catBirthDate,
      catGender,
      catColor,
      catDescription,
    } = req.body;

    const existingUser = await modelUser.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username sudah terdaftar" });
    }

    if (
      !req.files ||
      !Array.isArray(req.files.catPhoto) ||
      !req.files.catPhoto[0]
    ) {
      return res.status(400).json({ message: "Gambar Dibutuhkan" });
    }

    // 3. Ambil objek file pertama dari masing-masing field
    const fotoKucing = req.files.catPhoto[0];

    const newUser = new modelUser({
      name: ownerName,
      noTelp: phoneNumber,
      alamat: address,
      username,
      password,
    });

    await modelUser.create(newUser);

    const userId = newUser._id;
    const tglLahir = new Date(catBirthDate);
    const baseUrl = `${req.protocol}://${req.get("host")}/uploads/${
      fotoKucing.filename
    }`;

    const newKucing = new modelKucing({
      userRef: userId,
      nama: catName,
      ras: catBreed,
      tglLahir,
      jenisKelamin: catGender,
      warna: catColor,
      deskripsi: catDescription,
      foto: baseUrl,
    });

    await modelKucing.create(newKucing);
    res
      .status(201)
      .json({ message: "User added successfully", gambar: baseUrl });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ message: "Internal server error" });
    if (req.files) {
      for (const field of ["catPhoto"]) {
        if (Array.isArray(req.files[field])) {
          req.files[field].forEach((f) => {
            const p = path.join(process.cwd(), "uploads", f.filename);
            if (fs.existsSync(p)) fs.unlinkSync(p);
          });
        }
      }
    }
    next(error);
  }
};
