const jwt = require("jsonwebtoken");

const authenticateJWT = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .json({ error: "Unauthorized: Token invalid or expired" });
    }

    if (!decoded.email) {
      return res.status(400).json({ error: "Invalid token: Email is missing" });
    }

    req.user = {
      email: decoded.email,
      id: decoded.id,
      username: decoded.username,
    };
    next();
  });
};

module.exports = authenticateJWT;
