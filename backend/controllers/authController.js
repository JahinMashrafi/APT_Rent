// Define the functions
const register = async (req, res) => {
  res.status(200).json({ message: "Register route hit successfully" });
};

const login = async (req, res) => {
  res.status(200).json({ message: "Login route hit successfully" });
};

// You MUST export them like this at the bottom
module.exports = {
  register,
  login
};
