const router = require("express").Router();

const mongoose = require("mongoose");
const State = require("../models/State.model");
const Invitation = require("../models/Invitation.model");
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
  if (req.headers.update !== req.user.updateKey) return res.status(403).json({ selfDestruct: true });
  const update = req.body?.update;
  const id = `${req.user._id}`;
  const listeningForUpdates = id in req.app.locals.waitingUsers;
  if (!update) {
    if (listeningForUpdates) return res.status(200).json({ defer: true });
    req.app.locals.waitingUsers[id] = {};
    req.app.locals.waitingUsers[id].expireId = setTimeout((r, i) => {
      delete r.app.locals.waitingUsers[i];
    }, 1000 * 60 * 60 * 2.5, req, id);
    return res.status(200).json({ listening: true });
  }
  if (!listeningForUpdates) return res.status(200).json({ defer: true });
  const activities = await req.ciphers.reveal(req.user).catch((error) => res.status(500).json(ERRORMSG.CTD));
  const newActivities = req.user.push(activities, update);
  const data = await req.ciphers.obscure(newActivities, req.user).catch((error) => res.status(500).json(ERRORMSG.CTD));
  const updateKey = req.user.updateKey + 1;
  const updated = await userModel.findByIdAndUpdate(req.user._id, { data, updateKey }).exec().catch((error) => res.status(500).json(ERRORMSG.CTD));
  if (!updated) return res.status(500).json(ERRORMSG.CTD);
  const userWaiting = req.app.locals.waitingUsers[id].login;
  if (userWaiting) {
    const { res: loginRes, payload } = req.app.locals.waitingUsers[id].login;
    loginOk(loginRes, payload);
    clearTimeout(req.app.locals.waitingUsers[id].login.expireId);
    delete req.app.locals.waitingUsers[id].login;
  }
  clearTimeout(req.app.locals.waitingUsers[id].expireId);
  delete req.app.locals.waitingUsers[id];
  return res.status(200).json({ updateKey: updated.updateKey });
};
router.post("/update", userPrivileged, updateHandler);

module.exports = { router, loginHandler, signupHandler, inviteHandler, updateHandler };