require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
// const propertyRoutes = require('./routes/propertyRoutes');

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
// app.use('/api/properties',propertyRoutes);

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
