const router = require("express").Router();

const mongoose = require("mongoose");
const State = require("../models/State.model");
const Invitation = require("../models/Invitation.model");
const INVITATION_EXPIRATION = 1000 * 60 * 60 * 24;
const User = require("../models/User.model");

const bcrypt = require("bcryptjs");
const saltRounds = 13;

const ciphers = require("./middleware/ciphers");
router.use(ciphers);

const userPrivileged = require("./middleware/userPrivileged");
const { ERRORMSG } = require("../errors");

router.get("/", (req, res, next) => {
  res.status(200).send("Chonk");
});

const loginHandler = async (req, res, next, { userModel = User }) => {
    const { name, password } = req.body;
  
    if (!password) return res.status(400).json(ERRORMSG.MISSINGPASSWORD);
    if (!name) return res.status(400).json(ERRORMSG.MISSINGUSERNAME);

    const credentials = await req.ciphers.credentials(name, password).catch((error) => res.status(500).json(ERRORMSG.CTD));
    const user = await userModel.findOne({ credentials }).exec().catch((error) => res.status(500).json(ERRORMSG.CTD));
    if (!user) return res.status(403).json(ERRORMSG.INVALIDCREDENTIALS);
    const passCompare = await req.ciphers.compare(credentials, user.credentials).catch((error) => res.status(500).json(ERRORMSG.CTD));
    if (!passCompare) return res.status(403).json(ERRORMSG.INVALIDCREDENTIALS);
    
    const activities = await req.ciphers.reveal(user).catch((error) => res.status(500).json(ERRORMSG.CTD));
    return res.status(200).json({ _id: user._id, activities, updateKey: user.updateKey });
  };
  router.post("/login", loginHandler);


    const signupHandler = async (req, res, next, { userModel = User, invitationModel = Invitation }) => {
      //Signup:
      //invitation code, username, and password in
      //bcrypt code hash 
      //get invitation with code hash
      //if no invitation match -> invitation invalid
      //create new user -> user id, nextUpdateKey
      return res.status(200).json(responseData);
  };
  router.post("/signup", signupHandler);
  
    const inviteHandler = async (req, res, next, { stateModel = State, invitationModel = Invitation }) => {
      //Invite:
      //admin password in
      //bcrypt admin password
      //if no password match -> password invalid
      //generate invite code
      //create invitation -> invite code
      return res.status(200).json(responseData);
  };
  router.post("/invite", inviteHandler);
  
    const updateHandler = async (req, res, next, { userModel = User }) => {
      //Update:
      //user id, update key, update in
      //if no user id && update key match -> re login
      // generate next update key and save
      // Decrypt user data
      // JSON.parse decrypted file
      // Now we have an array of activities which we can keyBy id
      // Perform updates and deletes
      // Back to array and push created items
      // Stringify
      // Encrypt
      // Save user data -> next update key
      return res.status(200).json(responseData);
  };
  router.post("/update", userPrivileged, updateHandler);
  
  module.exports = { router, loginHandler, signupHandler, inviteHandler, updateHandler };