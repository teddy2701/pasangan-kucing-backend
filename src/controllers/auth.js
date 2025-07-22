const modelUser = require("../models/Users.js");

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await modelUser.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Username tidak ditemukan" });
    }
    if (user.password !== password) {
      return res.status(400).json({ message: "Password salah" });
    }
    res.status(200).json({
      message: "Login berhasil",
      user: {
        id: user._id,
        name: user.name,
        noTelp: user.noTelp,
        alamat: user.alamat,
        username: user.username,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};
