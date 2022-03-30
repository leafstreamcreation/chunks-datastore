const bcrypt = require("bcryptjs");
const saltRounds = 13;

const CryptoJS = require("crypto-js");
const { token } = require("morgan");

class Shuffler {
  constructor(array) {
    this.elements = array ? [...array] : [];
    let remainingElements = this.elements.length,
      elementToSwap,
      nextElementIndex;

    while (remainingElements > 0) {
      nextElementIndex = Math.floor(Math.random() * remainingElements--);
      elementToSwap = this.elements[remainingElements];
      this.elements[remainingElements] = this.elements[nextElementIndex];
      this.elements[nextElementIndex] = elementToSwap;
    }
  }

  drawNext() {
    return this.elements.pop();
  }

  values() {
    return [...this.elements];
  }
}

module.exports = (req, res, next) => {
  const credentials = async (name, password = "") => {
    const salt = await bcrypt.genSalt(saltRounds);
    const creds = name + password;
    return bcrypt.hash(creds, salt);
  };
  
  const compare = (pass, hash) => {
    return bcrypt.compare(pass, hash);
  };

  const scramble = (key, padding) => {
    const letters = key + padding;
    const scrambled = new Shuffler(letters.split("")).values();
    return scrambled.join("");
  }

  const tokenGen = (name, mutator = scramble) => {
    const literal = mutator(name, `${process.env.TOKEN}`);
    const encJson = CryptoJS.AES.encrypt(literal, name + `${process.env.SIGNATURE}`);
    const encData = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(encJson.toString()));
    return [ literal, encData ];
  }

  const revealToken = (user) => {
    const decData = CryptoJS.enc.Base64.parse(user.token).toString(CryptoJS.enc.Utf8);
    const bytes = CryptoJS.AES.decrypt(decData, user.name + `${process.env.SIGNATURE}`).toString(CryptoJS.enc.Utf8);
    return bytes;
  }
  
  const obscureActivities = (activities, user) => {
    const key = `${user.name}${process.env.SIGNATURE}${user.updateKey}`;
    if (!activities) return "";
    const jsonString = JSON.stringify(activities);
    const encJson = CryptoJS.AES.encrypt(jsonString, key);
    const encData = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(encJson.toString()));
    return encData;
  };
  
  const revealActivities = (user) => {
    const key = `${user.name}${process.env.SIGNATURE}${user.updateKey}`;
    const decData = CryptoJS.enc.Base64.parse(user.data).toString(CryptoJS.enc.Utf8);
    const bytes = CryptoJS.AES.decrypt(decData, key).toString(CryptoJS.enc.Utf8);
    return (!bytes || bytes === "") ? "" : JSON.parse(bytes);
  };

  req.ciphers = { obscureActivities, revealActivities, tokenGen, revealToken, credentials, compare };
  next();
};