const User = require("../../models/User.model");

module.exports = (req, res, next) => {
  const obscure = async (json) => {
    return Promise.resolve(json);
  };

  const reveal = async (encryptedData) => {
    return Promise.resolve(encryptedData);
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