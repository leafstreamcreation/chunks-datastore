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

  const json = (name) => {
    const obj = { name:name, padding:`${process.env.TOKEN_PADDING}` };
    return JSON.stringify(obj);
  };
  
  const tokenGen = (name, mutator = json) => {
    const literal = mutator(name);
    console.log(literal);
    console.log(process.env.TOKEN_PADDING);
    console.log(process.env.APP_SIGNATURE);
    const encJson = CryptoJS.AES.encrypt(literal, name + `${process.env.APP_SIGNATURE}`);
    const encData = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(encJson.toString()));
    return [ literal, encData ];
  }

  const revealToken = (user, name) => {
    const decData = CryptoJS.enc.Base64.parse(user.token).toString(CryptoJS.enc.Utf8);
    const bytes = CryptoJS.AES.decrypt(decData, name + `${process.env.APP_SIGNATURE}`).toString(CryptoJS.enc.Utf8);
    return bytes;
  };
  
  const obscureActivities = (activities, name, updateKey) => {
    const key = `${name}${process.env.APP_SIGNATURE}${updateKey}`;
    if (!activities) return "";
    const jsonString = JSON.stringify(activities);
    const encJson = CryptoJS.AES.encrypt(jsonString, key);
    const encData = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(encJson.toString()));
    return encData;
  };
  
  const revealActivities = (name, user) => {
    const key = `${name}${process.env.APP_SIGNATURE}${user.updateKey}`;
    const decData = CryptoJS.enc.Base64.parse(user.data).toString(CryptoJS.enc.Utf8);
    const bytes = CryptoJS.AES.decrypt(decData, key).toString(CryptoJS.enc.Utf8);
    return (!bytes || bytes === "") ? "" : JSON.parse(bytes);
  };

  req.ciphers = { obscureActivities, revealActivities, tokenGen, revealToken, credentials, compare };
  next();
};