const bcrypt = require("bcryptjs");
const { ERRORMSG } = require("../../errors");
const saltRounds = 13;


module.exports = (req, res, next) => {
  if (!req.body || !req.body.iv || !req.body.salt) return res.status(400).json({ message: ERRORMSG.UNSECUREREQUEST });

  const credentials = async (creds) => {
    const salt = await bcrypt.genSalt(saltRounds);
    return bcrypt.hash(creds, salt);
  };
  
  const compare = (pass, hash) => {
    return bcrypt.compare(pass, hash);
  };
  
  const revealInbound = async (cString, keyType) => {
    //replace with webcrypto 

    // if (!update) return CryptoJS.AES.decrypt(cString, `${process.env.CLIENT_SIGNATURE}`).toString(CryptoJS.enc.Utf8);
    // const decData = CryptoJS.enc.Base64.parse(cString).toString(CryptoJS.enc.Utf8);
    // const bytes = CryptoJS.AES.decrypt(decData, `${process.env.CLIENT_SIGNATURE}`).toString(CryptoJS.enc.Utf8);
    // return (!bytes || bytes === "") ? "" : JSON.parse(bytes);
  };

  const generateEntropy = () => {
    //implement
  };
  
  const obscureUserData = async (creds, entropy, userData) => {
    //replace with webcrypto

    // const key = `${name}${outbound ? process.env.OUTBOUND_ACTIVITIES : process.env.APP_SIGNATURE}${updateKey}`;
    // if (!userData) return "";
    // const jsonString = JSON.stringify(userData);
    // const encJson = CryptoJS.AES.encrypt(jsonString, key);
    // const encData = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(encJson.toString()));
    // return encData;
  };

  const obscureUpdateKey = async (creds, entropy, updateKey) => {

  };
  
  const revealUpdateKey = async (credentials, user) => {

  };

  const revealUserData = async (credentials, user, data) => {
    //replace with webcrypto

    // const key = `${name}${process.env.APP_SIGNATURE}${user.updateArg}`;
    // const decData = CryptoJS.enc.Base64.parse(user.data).toString(CryptoJS.enc.Utf8);
    // const bytes = CryptoJS.AES.decrypt(decData, key).toString(CryptoJS.enc.Utf8);
    // return (!bytes || bytes === "") ? "" : JSON.parse(bytes);
  };

  const exportUserData = async (updateKey, data) => {

  };

  const exportMessage = async (message, details) => {
    //return a stringified JSON object with a message field and details field
  };

  req.ciphers = { 
    generateEntropy,
    obscureUserData,
    obscureUpdateKey,
    exportUserData,
    exportMessage,
    revealUserData,
    revealUpdateKey,
    revealInbound, 
    credentials, 
    compare,
   };
  next();
};