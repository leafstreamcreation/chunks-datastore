const router = require("express").Router();

const mongoose = require("mongoose");
const State = require("../models/State.model");
const Invitation = require("../models/Invitation.model");
const User = require("../models/User.model");
const UserData = require("../models/UserData.model");

const ciphers = require("./middleware/ciphers");
router.use(ciphers);
const { CIPHERS } = require("./middleware/cipherEnums");

const mergeUpdate = require("./mergeUpdate");
const { ERRORMSG } = require("../errors");


router.get("/", (req, res, next) => {
  res.status(200).send("Chonk");
});

const loginOk = (res, payload) => res.status(200).json(payload);

const loginHandler = async (req, res, next, { userModel = User, userDataModel = UserData }) => {
  const { credentials:cCred } = req.body;
  
  if (!cCred) return res.status(400).json(ERRORMSG.MISSINGCREDENTIALS);
  const inCreds = req.ciphers.revealInbound(cCred, CIPHERS.CREDENTIALS); 
  const users = await userModel.find().exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  let user;
  for ( const [index, u] of users.entries()) {
    const match = await req.ciphers.compare(inCreds, u.credentials);
    if (match) {
      user = users[index];
      break;
    }
  }
  if (!user) return res.status(403).json(ERRORMSG.INVALIDCREDENTIALS);

  const { data } = await userDataModel.findById(user.data).exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  if (!data) return res.status(500).json(ERRORMSG.CTD);
  
  const userUpdating = req.app.locals.waitingUsers?.[user._id];
  if (userUpdating) {
    //handle prior login attempt
    if ("login" in userUpdating) {
      const { res:oldRes, expireId:expire } = userUpdating.login;
      oldRes.status(403).json(ERRORMSG.EXPIREDLOGIN);
      clearTimeout(expire);
    }
    const rUserData = req.ciphers.revealUserData(inCreds, user, data);
    const rUpdateKey = req.ciphers.revealUpdateKey(inCreds, user);
    const { iv, updateKey, userData } = req.ciphers.exportUserData(rUpdateKey, rUserData);
    const expireId = setTimeout((req, res, id) => {
      res.status(403).json(ERRORMSG.EXPIREDLOGIN);
      delete req.app.locals.waitingUsers[id].login;
    }, 1000 * 10, req, res, user._id);
    req.app.locals.waitingUsers[user._id].login = {
      res, 
      payload: { 
        iv,
        updateKey,
        userData, 
      },
      expireId
    };
  }
  else {
    const rUserData = req.ciphers.revealUserData(inCreds, user, data);
    const rUpdateKey = req.ciphers.revealUpdateKey(inCreds, user);
    const { iv, updateKey, userData } = req.ciphers.exportUserData(rUpdateKey, rUserData);
    return loginOk(res, { iv, updateKey, userData });
  }
};
router.post("/login", (req, res, next) => {
  loginHandler(req, res, next, { userModel: User, userDataModel: UserData });
});
  

const signupHandler = async (req, res, next, { userModel = User, userDataModel = UserData, invitationModel = Invitation }) => {
  const { ticket:cTicket, credentials:cCred } = req.body;
  if (!cCred) return res.status(400).json(ERRORMSG.MISSINGCREDENTIALS);
  if (!cTicket) return res.status(400).json(ERRORMSG.MISSINGTICKET);
  const ticket = req.ciphers.revealInbound(cTicket, CIPHERS.TICKET);
  let invitation = null;
  const pending = await invitationModel.find().exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  for ( const i of pending) {
    const match = await req.ciphers.compare(ticket, i.codeHash).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
    if (match) {
      invitation = i;
      break;
    }
  }
  if (!invitation) return res.status(403).json(ERRORMSG.INVALIDTICKET);
  const inCreds = req.ciphers.revealInbound(cCred, CIPHERS.CREDENTIALS);
  const users = await userModel.find().exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  for ( const u of users) {
    const match = await req.ciphers.compare(inCreds, u.credentials);
    if (match) return res.status(403).json({ ticketRefund: cTicket });
  }
  const credentials = await req.ciphers.credentials(inCreds).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  const initialIV = await req.ciphers.generateIV();
  const initialUserData = ["{}", [], []];
  const data = req.ciphers.obscureUserData(inCreds, initialIV, initialUserData);
  const cUpdateKey = req.ciphers.obscureUpdateKey(inCreds, initialIV, 1);
  const newUserData = await userDataModel.create({ data }).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  await userModel.create({ credentials, data: newUserData._id, iv: initialIV, updateKey: cUpdateKey }).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  await invitationModel.findByIdAndDelete(invitation._id).exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  const { iv, updateKey, userData } = req.ciphers.exportUserData(1, initialUserData);
  return res.status(200).json({ iv, updateKey, userData });
};
router.post("/signup", (req, res, next) => {
  signupHandler(req, res, next, { userModel: User, userDataModel: UserData, invitationModel: Invitation });
});

const inviteHandler = async (req, res, next, { stateModel = State, invitationModel = Invitation }) => {
  const { password: cPassword, ticket: cTicket } = req.body;
  if (!cTicket) return res.status(400).json(ERRORMSG.MISSINGTICKET);
  if (!cPassword) return res.status(400).json(ERRORMSG.MISSINGPASSWORD);

  const state = await stateModel.findOne().exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  const password = req.ciphers.revealInbound(cPassword, CIPHERS.CREDENTIALS);
  const match = await req.ciphers.compare(password, state.adminHash).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  if (!match) return res.status(403).json(ERRORMSG.INVALIDCREDENTIALS);

  const ticket = req.ciphers.revealInbound(cTicket, CIPHERS.TICKET);
  let invitation = null;
  const pending = await invitationModel.find().exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  for ( const i of pending) {
    const match = await req.ciphers.compare(ticket, i.codeHash).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
    if (match) {
      invitation = i;
      break;
    }
  }
  if (invitation) return res.status(403).json(ERRORMSG.TICKETEXISTS);
  const codeHash = await req.ciphers.credentials(ticket).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  invitationModel.create({ codeHash, expires: new Date(Date.now() + 1000 * 60 * 30) }).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  return res.status(200).json({ ticket: cTicket });
};
router.post("/invite", (req, res, next) => {
  inviteHandler(req, res, next, { stateModel: State, invitationModel: Invitation });
});

const updateHandler = async (req, res, next, { userModel = User, userDataModel = UserData }) => {
  const { credentials: cCred, updateKey: cUpdateKey, update: cUpdate } = req.body;
  const inCreds = req.ciphers.revealInbound(cCred, CIPHERS.CREDENTIALS);
  const users = await userModel.find().exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  let user;
  for ( const [index, u] of users.entries()) {
    const match = await req.ciphers.compare(inCreds, u.credentials);
    if (match) {
      user = users[index];
      break;
    }
  }
  if (!user) return res.status(403).json(ERRORMSG.INVALIDCREDENTIALS);
  
  //ok so we have the user
  //next check the update
  const inUpdateKey = req.ciphers.revealInbound(cUpdateKey, CIPHERS.UPDATEKEY);
  const rUpdateKey = req.ciphers.revealUpdateKey(inCreds, user);
  if (inUpdateKey !== rUpdateKey) return res.status(403).json({ selfDestruct: true });

//update keys match
//now assess whether the server will begin listening for update delivery
  const id = `${user._id}`;
  const listeningForUpdates = id in req.app.locals.waitingUsers;
  if (!cUpdate) {
    if (listeningForUpdates) return res.status(200).json({ defer: true });
    req.app.locals.waitingUsers[id] = {};
    req.app.locals.waitingUsers[id].expireId = setTimeout((r, i) => {
      delete r.app.locals.waitingUsers[i];
    }, 1000 * 60 * 60 * 2.5, req, id);
    return res.status(200).json({ listening: true });
  }
  if (!listeningForUpdates) return res.status(200).json({ defer: true });

  //there is a delivery and the server was listening for updates; process the data
  const { data: oldData } = await userDataModel.findById(user.data).exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  if (!oldData) return res.status(500).json(ERRORMSG.CTD);

  const update = req.ciphers.revealInbound(cUpdate, CIPHERS.DATA);
  const rUserData = req.ciphers.revealUserData(inCreds, user, oldData);
  const newUserData = mergeUpdate(rUserData, update);
  const newUpdateKey = rUpdateKey + 1;

  //there is now a new update key and new user data; write them to the db
  const newIV = req.ciphers.generateIV();
  const localData = req.ciphers.obscureUserData(inCreds, newIV, newUserData);
  const localKey = req.ciphers.obscureUpdateKey(inCreds, newIV, newUpdateKey);

  //update data and updatekey
  const writeNewKey = userModel.findByIdAndUpdate(user._id, { iv: newIV, updateKey: localKey }).exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  const writeNewData = userDataModel.findByIdAndUpdate(user.data, { data: localData }).exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  const [ updatedKey, updatedData ] = await Promise.all([writeNewKey, writeNewData]);
  if (!updatedKey || !updatedData) return res.status(500).json(ERRORMSG.CTD);

  //release a user that's waiting for an update before login
  const userWaiting = req.app.locals.waitingUsers[id].login;
  if (userWaiting) {
    const { res: loginRes } = req.app.locals.waitingUsers[id].login;
    const { iv, updateKey, userData } = req.ciphers.exportUserData(newUpdateKey, newUserData);
    loginOk(loginRes, { iv, updateKey, userData });
    clearTimeout(req.app.locals.waitingUsers[id].login.expireId);
    delete req.app.locals.waitingUsers[id].login;
  }
  clearTimeout(req.app.locals.waitingUsers[id].expireId);
  delete req.app.locals.waitingUsers[id];
  const { iv, updateKey } = req.ciphers.exportUserData(newUpdateKey);
  return res.status(200).json({ iv, updateKey });
};
router.post("/update", (req, res, next) => {
  updateHandler(req, res, next, { userModel: User, userDataModel: UserData });
});

module.exports = { router, loginHandler, signupHandler, inviteHandler, updateHandler };