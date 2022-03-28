const bcrypt = require("bcryptjs");
const saltRounds = 13;

const CryptoJS = require("crypto-js");

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
    const key = `${user.name}${process.env.SIGNATURE}${user.updateKey}`;
    const jsonString = JSON.stringify(activities);
    const encJson = CryptoJS.AES.encrypt(jsonString, key);
    const encData = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(encJson.toString()));
    return encData;
  };
  
  const reveal = (user) => {
    const key = `${user.name}${process.env.SIGNATURE}${user.updateKey}`;
    const decData = CryptoJS.enc.Base64.parse(user.data).toString(CryptoJS.enc.Utf8);
    const bytes = CryptoJS.AES.decrypt(decData, key).toString(CryptoJS.enc.Utf8);
    return JSON.parse(bytes);
  };

  req.ciphers = { obscure, reveal, credentials, compare };
  next();
};