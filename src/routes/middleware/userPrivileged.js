const User = require("../../models/User.model");
const mergeUpdate = require("./mergeUpdate");

module.exports = async (req, res, next) => {
  // checks if the user is logged in when trying to access a specific page
  if (!req.headers.token || req.headers.token === "null") {
    return res.status(403).json({ errorMessage: "You are not logged in" });
  }
  const { token: literal } = req.headers;
  const { name } = JSON.parse(literal);
  const users = await User.find().exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  let user;
  const [ match ] = users.map(u => req.ciphers.revealToken(u, name)).filter((token, index) => {
    if (token === literal) {
      user = users[index];
      return true;
    }
    return false;
  });
  if (!match) return res.status(403).json({ errorMessage: "invalid token" });
  req.user = user;
  req.user.push = (activities, update) => mergeUpdate(activities, update);
  next();
};