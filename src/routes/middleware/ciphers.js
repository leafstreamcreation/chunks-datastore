const User = require("../../models/User.model");

module.exports = (req, res, next) => {
  const credentials = async (name, password = "") => {
    //wrap bcrypt
    return Promise.resolve(name + password);
  };

  const compare = async (hash1, hash2) => {
    //wrap bcrypt
    return Promise.resolve(true);
  };

  const obscure = async (activities, user) => {
    //activities (json) in user
    //unhash credentials
    //stringify activities
    //AES encryption with credentials/updatekey string
    //respond with data
    return Promise.resolve(user);
  };

  const reveal = async (user) => {
    //data (string) in user
    //unhash credentials
    //AES decryption with credentials/updatekey string
    //respond with json
    return Promise.resolve(user);
  };

  req.ciphers = { obscure, reveal, credentials, compare };
  next();
};