const User = require("../../models/User.model");

module.exports = (req, res, next) => {
  // checks if the user is logged in when trying to access a specific page
  if (!req.headers.user || req.headers.user === "null") {
    return res.status(403).json({ errorMessage: "You are not logged in" });
  }

  User.findById(req.headers.user)
    .then((user) => {
      if (!user) {
        return res
          .status(403)
          .json({ errorMessage: "User does not exist" });
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      return res.status(500).json({ errorMessage: err.message });
    });
};