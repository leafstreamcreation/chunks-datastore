const User = require("../../models/User.model");
const mergeUpdate = require("./mergeUpdate");

module.exports = async (req, res, next) => {
  // checks if the user is logged in when trying to access a specific page
  if (!req.headers.user || req.headers.user === "null") {
    return res.status(403).json({ errorMessage: "You are not logged in" });
  }

  const user = await User.findById(req.headers.user).exec();
  if (!user) return res.status(403).json({ errorMessage: "User does not exist" });
  req.user = user;
  req.user.push = (activities, update) => mergeUpdate(activities, update);
  next();
};