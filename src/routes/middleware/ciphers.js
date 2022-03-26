const User = require("../../models/User.model");

const bcrypt = require("bcryptjs");
const saltRounds = 13;

const AES = require("crypto-js/aes");


module.exports = (req, res, next) => {
  const credentials = async (name, password = "") => {
    const salt = await bcrypt.genSalt(saltRounds);
    const creds = name + password;
    return bcrypt.hash(creds, salt);
  };
  
  const compare = (pass, hash) => {
    return bcrypt.compare(pass, hash);
  };
  
  const obscure = (activities, user) => {
    const key = `${user.credentials}SHOOBEEDOOBOP${user.updateKey};`
    const jsonString = JSON.stringify(activities);
    const data = AES.encrypt(jsonString, key);
    return Promise.resolve(data);
  };

  const reveal = (user) => {
    const key = `${user.credentials}SHOOBEEDOOBOP${user.updateKey};`
    const json = AES.decrypt(user.data, key);
    const activities = JSON.parse(json);
    return Promise.resolve(activities);
  };

  req.ciphers = { obscure, reveal, credentials, compare };
  next();
};