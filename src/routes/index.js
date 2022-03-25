const router = require("express").Router();

const mongoose = require("mongoose");
const State = require("../models/State.model");
const Invitation = require("../models/Invitation.model");
const INVITATION_EXPIRATION = 1000 * 60 * 60 * 24;
const User = require("../models/User.model");

const ciphers = require("./middleware/ciphers");
router.use(ciphers);

const userPrivileged = require("./middleware/userPrivileged");
const { ERRORMSG } = require("../errors");


router.get("/", (req, res, next) => {
  res.status(200).send("Chonk");
});

const loginOk = (res, payload) => res.status(200).json(payload);

const loginHandler = async (req, res, next, { userModel = User }) => {
    const { name, password } = req.body;
  
    if (!password) return res.status(400).json(ERRORMSG.MISSINGPASSWORD);
    if (!name) return res.status(400).json(ERRORMSG.MISSINGUSERNAME);
    
    const credentials = await req.ciphers.credentials(name, password).catch((error) => res.status(500).json(ERRORMSG.CTD));
    const user = await userModel.findOne({ credentials }).exec().catch((error) => res.status(500).json(ERRORMSG.CTD));
    if (!user) return res.status(403).json(ERRORMSG.INVALIDCREDENTIALS);
    const passCompare = await req.ciphers.compare(credentials, user.credentials).catch((error) => res.status(500).json(ERRORMSG.CTD));
    if (!passCompare) return res.status(403).json(ERRORMSG.INVALIDCREDENTIALS);
    const userUpdating = req.app.locals.waitingUsers[user._id];
    if (userUpdating) {
      //handle prior login attempt
      if ("login" in userUpdating) {
        const { res:oldRes, expireId:expire } = userUpdating.login;
        oldRes.status(403).json(ERRORMSG.EXPIREDLOGIN);
        clearTimeout(expire);
      }
      const activities = await req.ciphers.reveal(user).catch((error) => res.status(500).json(ERRORMSG.CTD));
      const expireId = setTimeout((req, res, id) => {
        res.status(403).json(ERRORMSG.EXPIREDLOGIN);
        delete req.app.locals.waitingUsers[id].login;
      }, 1000 * 10, req, res, user._id);
      req.app.locals.waitingUsers[user._id].login = {
        res, 
        payload: {
          _id: user._id, 
          activities, 
          updateKey: user.updateKey
        },
        expireId
      };
    }
    else {
      const activities = await req.ciphers.reveal(user).catch((error) => res.status(500).json(ERRORMSG.CTD));
      return loginOk(res, { _id: user._id, activities, updateKey: user.updateKey });
    }
  };
  router.post("/login", loginHandler);
  
  
  const signupHandler = async (req, res, next, { userModel = User, invitationModel = Invitation }) => {
    const { ticket, name, password } = req.body;
    if (!password) return res.status(400).json(ERRORMSG.MISSINGPASSWORD);
    if (!name) return res.status(400).json(ERRORMSG.MISSINGUSERNAME);
    if (!ticket) return res.status(400).json(ERRORMSG.MISSINGTICKET);
    
    const codeHash = await req.ciphers.credentials(ticket).catch((error) => res.status(500).json(ERRORMSG.CTD));
    const invitation = await invitationModel.findOne({ codeHash }).exec().catch((error) => res.status(500).json(ERRORMSG.CTD));
    if (!invitation) return res.status(403).json(ERRORMSG.INVALIDTICKET);

    const credentials = await req.ciphers.credentials(name, password).catch((error) => res.status(500).json(ERRORMSG.CTD));
    const existingCredentials = await userModel.findOne({ credentials }).exec().catch((error) => res.status(500).json(ERRORMSG.CTD));
    if (existingCredentials) return res.status(403).json({ ...ERRORMSG.INVALIDCREDENTIALS, ticketRefund:ticket });
    const data = await req.ciphers.obscure({ activities: [], credentials, updateKey: 1 });
    const newUser = await userModel.create({ name, credentials }).catch((error) => res.status(500).json(ERRORMSG.CTD));
    invitationModel.findOneAndDelete({ codeHash }).exec().catch((error) => res.status(500).json(ERRORMSG.CTD));
    return res.status(200).json({ _id: newUser._id, activities: [], updateKey: newUser.updateKey });
  };
  router.post("/signup", signupHandler);
  
    const inviteHandler = async (req, res, next, { stateModel = State, invitationModel = Invitation }) => {
      const { password, ticket } = req.body;
      if (!password) return res.status(400).json(ERRORMSG.MISSINGPASSWORD);
      if (!ticket) return res.status(400).json(ERRORMSG.MISSINGTICKET);

      const adminHashCreate = req.ciphers.credentials(password).catch((error) => res.status(500).json(ERRORMSG.CTD));
      const stateFetch = stateModel.findOne().exec().catch((error) => res.status(500).json(ERRORMSG.CTD));
      const [ adminHash, state ] = await Promise.all([ adminHashCreate, stateFetch ]);
      const match = await req.ciphers.compare(adminHash, state.adminHash).catch((error) => res.status(500).json(ERRORMSG.CTD));
      if (!match) return res.status(403).json(ERRORMSG.INVALIDCREDENTIALS);

      const codeHash = await req.ciphers.credentials(ticket)
      const alreadyExists = await invitationModel.findOne({ codeHash }).exec().catch((error) => res.status(500).json(ERRORMSG.CTD));
      if (alreadyExists) return res.status(403).json(ERRORMSG.TICKETEXISTS);
      invitationModel.create({ codeHash, expires: new Date(Date.now() + 1000 * 60 * 30) }).catch((error) => res.status(500).json(ERRORMSG.CTD));
      return res.status(200).json({ ticket });
  };
  router.post("/invite", inviteHandler);
  
    const updateHandler = async (req, res, next, { userModel = User }) => {
      //Update:
      // update key, update in
      // if no user id && update key match -> re login
      // generate next update key and save
      // Decrypt user data
      // JSON.parse decrypted file
      // Now we have an array of activities which we can keyBy id
      // Perform updates and deletes
      // Back to array and push created items
      // Stringify
      // Encrypt
      // Save user data -> next update key
      // If user waiting for update, login user
      return res.status(200).json(responseData);
  };
  router.post("/update", userPrivileged, updateHandler);
  
  module.exports = { router, loginHandler, signupHandler, inviteHandler, updateHandler };