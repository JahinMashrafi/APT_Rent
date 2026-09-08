require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
// const propertyRoutes = require('./routes/propertyRoutes');

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
// app.use('/api/properties',propertyRoutes);
//app,use(cors());

app.get("/", (req, res) => {
  res.status(200).json({ message: "API is running sucessfullyy," });
});
app.use((req, res, next) => {
  res.status(404).json({ statusCode: 404, message: "Endpoint not found" });
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ sucess: false, message: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});
