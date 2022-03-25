const User = require("../../models/User.model");

module.exports = (req, res, next) => {
  const obscure = async (json) => {
    return Promise.resolve(json);
  };

  const reveal = async (user) => {
    return Promise.resolve(user);
  };

  const credentials = async (name, password = "") => {
    return Promise.resolve(name + password);
  };

  const compare = async (hash1, hash2) => {
    return Promise.resolve(true);
  };

  req.ciphers = { obscure, reveal, credentials, compare };
  next();
};