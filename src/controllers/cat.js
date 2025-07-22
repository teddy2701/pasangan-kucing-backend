const modelKucing = require("../models/Kucing.js");
const path = require("path");

// Helper function untuk menghitung umur dalam bulan
const calculateAgeInMonths = (birthDate) => {
  const birth = new Date(birthDate);
  const now = new Date();
  const diffMonths =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth());
  return Math.max(diffMonths, 0);
};

function formatTanggalIndonesia(tanggalISO) {
  const tanggal = new Date(tanggalISO);

  const bulanIndo = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const hari = tanggal.getDate();
  const bulan = bulanIndo[tanggal.getMonth()];
  const tahun = tanggal.getFullYear();

  return `${hari} ${bulan} ${tahun}`;
}

// Fungsi untuk menghitung skor kecocokan
const calculateMatchScore = (selectedCat, candidateCat) => {
  let score = 0;

  // 1. Jenis kelamin: harus berbeda untuk kecocokan
  if (selectedCat.jenisKelamin !== candidateCat.jenisKelamin) {
    score += 40; // Bobot tinggi karena penting
  }

  // 2. Ras: ras sama memberikan nilai lebih tinggi
  if (selectedCat.ras === candidateCat.ras) {
    score += 30;
  } else {
    // Ras berbeda tapi masih dalam kategori yang mirip
    const similarBreeds = {
      Persian: ["Himalayan", "Exotic Shorthair"],
      Siamese: ["Balinese", "Oriental Shorthair"],
      "Maine Coon": ["Norwegian Forest", "Siberian"],
      Bengal: ["Savannah", "Egyptian Mau"],
      Ragdoll: ["Birman", "Ragamuffin"],
    };

    if (similarBreeds[selectedCat.ras]?.includes(candidateCat.ras)) {
      score += 20;
    }
  }

  // 3. Umur: selisih umur kecil lebih baik
  const selectedAge = calculateAgeInMonths(selectedCat.tglLahir);
  const candidateAge = calculateAgeInMonths(candidateCat.tglLahir);
  const ageDiff = Math.abs(selectedAge - candidateAge);

  if (ageDiff <= 6) {
    // Dalam 6 bulan
    score += 20;
  } else if (ageDiff <= 12) {
    // Dalam 1 tahun
    score += 10;
  } else if (ageDiff <= 24) {
    // Dalam 2 tahun
    score += 5;
  }

  // 4. Warna: warna sama memberikan nilai tambahan
  if (selectedCat.warna === candidateCat.warna) {
    score += 10;
  }

  return score;
};

exports.getAllCats = async (req, res) => {
  try {
    const cats = await modelKucing.find();
    res.status(200).json(cats);
  } catch (error) {
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};

exports.getCatOwner = async (req, res, next) => {
  try {
    const userID = req.params.userID;

    const cat = await modelKucing.find({ userRef: userID });

    if (!cat) {
      return res.status(404).json({ message: "Kucing tidak ditemukan" });
    }

    res.status(200).json({
      cat,
    });
  } catch (error) {
    console.error("Error fetching cat owner:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
    next(error);
  }
};

exports.getRecommendedCats = async (req, res) => {
  const catId = req.params.id;

  try {
    // 1. Dapatkan kucing yang dipilih
    const selectedCat = await modelKucing.findById(catId).lean();
    if (!selectedCat) {
      return res.status(404).json({ error: "Kucing tidak ditemukan" });
    }

    // 2. Dapatkan semua kucing lain (kecuali milik user sendiri dan kucing yang sama)
    const otherCats = await modelKucing
      .find({
        _id: { $ne: catId },
        userRef: { $ne: selectedCat.userRef },
      })
      .lean();

    // 3. Hitung skor kecocokan untuk setiap kucing
    const recommendations = otherCats.map((candidateCat) => {
      const score = calculateMatchScore(selectedCat, candidateCat);

      // Hitung umur untuk ditampilkan di frontend
      const age = calculateAgeInMonths(candidateCat.tglLahir);

      return {
        ...candidateCat,
        matchScore: score,
        age,
      };
    });

    // 4. Urutkan berdasarkan skor tertinggi
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    // 5. Ambil top 5 rekomendasi
    const topRecommendations = recommendations.slice(0, 6);

    res.status(200).json(topRecommendations);
  } catch (error) {
    console.error("Error fetching recommended cats:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
    next(error);
  }
};

exports.getCatById = async (req, res) => {
  const catId = req.params.id;

  try {
    const dataCat = await modelKucing
      .findById(catId)
      .populate("userRef", "noTelp")
      .lean();
    if (!dataCat) {
      return res.status(404).json({ error: "Kucing tidak ditemukan" });
    }
    console.log("Data Kucing:", dataCat);
    // Hitung umur untuk ditampilkan di frontend
    const age = calculateAgeInMonths(dataCat.tglLahir);

    const formatCat = {
      name: dataCat.nama,
      gender: dataCat.jenisKelamin,
      breed: dataCat.ras,
      color: dataCat.warna,
      description: dataCat.deskripsi,
      birthDate: formatTanggalIndonesia(dataCat.tglLahir),
      image: dataCat.foto,
      age: age,
      ownerPhone: dataCat.userRef.noTelp,
    };

    res.status(200).json({ cat: formatCat });
  } catch (error) {
    console.error("Error fetching cat by ID:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};

exports.addCat = async (req, res) => {
  try {
    const { name, gender, breed, color, description, birthDate, ownerId } =
      req.body;

    const tglLahir = new Date(birthDate);
    if (
      !req.files ||
      !Array.isArray(req.files.catPhoto) ||
      !req.files.catPhoto[0]
    ) {
      return res.status(400).json({ message: "Gambar Dibutuhkan" });
    }

    // 3. Ambil objek file pertama dari masing-masing field
    const fotoKucing = req.files.catPhoto[0];
    const baseUrl = `${req.protocol}://${req.get("host")}/uploads/${
      fotoKucing.filename
    }`;
    console.log("userRef:", ownerId);
    console.log("body", req.body);
    const newCat = new modelKucing({
      userRef: ownerId,
      nama: name,
      jenisKelamin: gender,
      ras: breed,
      warna: color,
      deskripsi: description,
      tglLahir: tglLahir,
      foto: baseUrl, // Simpan path foto jika ada
    });

    await modelKucing.create(newCat);
    res
      .status(201)
      .json({ message: "Kucing berhasil ditambahkan", cat: newCat });
  } catch (error) {
    console.error("Error adding cat:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
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
