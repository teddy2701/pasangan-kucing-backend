const modelKucing = require("../models/Kucing.js");
const path = require("path");
const modelPerjodohan = require("../models/Perjodohan.js");

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

exports.updatePerjodohanStatus = async (req, res, next) => {
  try {
    const { status, kucing1, kucing2 } = req.body;

    const perjodohan = await modelPerjodohan.findOne({
      $or: [
        { kucing1: kucing1, kucing2: kucing2 },
        { kucing1: kucing2, kucing2: kucing1 },
      ],
    });
    if (!perjodohan) {
      return res.status(404).json({ message: "Perjodohan tidak ditemukan" });
    }
    const formatStasus = status ? "berhasil" : "gagal";
    perjodohan.status = formatStasus;
    await perjodohan.save();
    res
      .status(200)
      .json({ message: "Status perjodohan berhasil diperbarui", perjodohan });
  } catch (error) {
    console.error("Error updating perjodohan status:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
    next(error);
  }
};

exports.getPerjodohan = async (req, res, next) => {
  try {
    const { kucingId } = req.params;

    const perjodohan = await modelPerjodohan
      .find({ $or: [{ kucing1: kucingId }, { kucing2: kucingId }] })
      .populate("kucing1")
      .populate("kucing2")
      .exec();

    // Ambil pasangan dan gabungkan dengan status + tanggal
    const pasangan = perjodohan.map((p) => {
      const pasanganKucing =
        p.kucing1._id.toString() === kucingId ? p.kucing2 : p.kucing1;

      // convert mongoose doc jadi object plain
      const pasanganObj = pasanganKucing.toObject();

      // tambahkan status + tanggal dari perjodohan
      return {
        ...pasanganObj,
        status: p.status,
        tanggal: p.tanggal,
      };
    });

    res.status(200).json(pasangan);
  } catch (error) {
    console.error("Error fetching perjodohan:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
    next(error);
  }
};

exports.addPerjodohan = async (req, res) => {
  try {
    const { kucing1Id, kucing2Id, catatan } = req.body;
    if (kucing1Id === kucing2Id) {
      return res
        .status(400)
        .json({ message: "Kucing yang dipilih tidak boleh sama" });
    }

    const kucing1 = await modelKucing.findById(kucing1Id);
    const kucing2 = await modelKucing.findById(kucing2Id);
    if (!kucing1 || !kucing2) {
      return res.status(404).json({ message: "Kucing tidak ditemukan" });
    }
    if (kucing1.userRef.toString() === kucing2.userRef.toString()) {
      return res
        .status(400)
        .json({ message: "Kucing harus berasal dari pemilik yang berbeda" });
    }
    // Cek apakah perjodohan antara kedua kucing sudah ada
    const existingPerjodohan = await modelPerjodohan.findOne({
      $or: [
        { kucing1: kucing1Id, kucing2: kucing2Id },
        { kucing1: kucing2Id, kucing2: kucing1Id },
      ],
    });
    if (existingPerjodohan) {
      return res
        .status(400)
        .json({ message: "Perjodohan antara kedua kucing sudah ada" });
    }

    // Buat entri perjodohan baru
    const newPerjodohan = new modelPerjodohan({
      kucing1: kucing1Id,
      kucing2: kucing2Id,
      catatan,
    });
    await modelPerjodohan.create(newPerjodohan);
    res
      .status(201)
      .json({ message: "Perjodohan berhasil ditambahkan", newPerjodohan });
  } catch (error) {
    console.error("Error adding perjodohan:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
    next(error);
  }
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
    // const topRecommendations = recommendations.slice(0, 6);

    res.status(200).json(recommendations);
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
