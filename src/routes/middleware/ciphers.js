const bcrypt = require("bcryptjs");
const { ERRORMSG } = require("../../errors");
const { CIPHERS } = require("./cipherEnums");
const saltRounds = 13;


module.exports = (req, res, next) => {
  if (!req.body && !req.body.iv) return res.status(400).json(ERRORMSG.MISSINGIV);

  const credentials = async (creds) => {
    const salt = await bcrypt.genSalt(saltRounds);
    return bcrypt.hash(creds, salt);
  };
  
  const compare = (pass, hash) => {
    return bcrypt.compare(pass, hash);
  };
  
  const revealInbound = (cString, keyType) => {
    //replace with webcrypto 

    // if (!update) return CryptoJS.AES.decrypt(cString, `${process.env.CLIENT_SIGNATURE}`).toString(CryptoJS.enc.Utf8);
    // const decData = CryptoJS.enc.Base64.parse(cString).toString(CryptoJS.enc.Utf8);
    // const bytes = CryptoJS.AES.decrypt(decData, `${process.env.CLIENT_SIGNATURE}`).toString(CryptoJS.enc.Utf8);
    // return (!bytes || bytes === "") ? "" : JSON.parse(bytes);
  };

  const generateIV = () => {
    //implement
  };
  
  const obscureUserData = (creds, iv, userData) => {
    //replace with webcrypto

    // const key = `${name}${outbound ? process.env.OUTBOUND_ACTIVITIES : process.env.APP_SIGNATURE}${updateKey}`;
    // if (!userData) return "";
    // const jsonString = JSON.stringify(userData);
    // const encJson = CryptoJS.AES.encrypt(jsonString, key);
    // const encData = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(encJson.toString()));
    // return encData;
  };

  const obscureUpdateKey = (creds, iv, updateKey) => {

  };
  
  const revealUpdateKey = (credentials, user) => {

  };

  const revealUserData = (credentials, user, data) => {
    //replace with webcrypto

    // const key = `${name}${process.env.APP_SIGNATURE}${user.updateArg}`;
    // const decData = CryptoJS.enc.Base64.parse(user.data).toString(CryptoJS.enc.Utf8);
    // const bytes = CryptoJS.AES.decrypt(decData, key).toString(CryptoJS.enc.Utf8);
    // return (!bytes || bytes === "") ? "" : JSON.parse(bytes);
  };

  const exportUserData = (updateKey, data) => {

  };

  req.ciphers = { 
    generateIV,
    obscureUserData,
    obscureUpdateKey,
    exportUserData,
    revealUserData,
    revealUpdateKey,
    revealInbound, 
    credentials, 
    compare,
   };
  next();
};