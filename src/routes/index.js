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
  
  const user = await userModel.findOne({ name }).exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  if (!user) return res.status(403).json(ERRORMSG.INVALIDCREDENTIALS);
  const match = await req.ciphers.compare(name + password, user.credentials).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  if (!match) return res.status(403).json(ERRORMSG.INVALIDCREDENTIALS);

  const userUpdating = req.app.locals.waitingUsers?.[user._id];
  if (userUpdating) {
    //handle prior login attempt
    if ("login" in userUpdating) {
      const { res:oldRes, expireId:expire } = userUpdating.login;
      oldRes.status(403).json(ERRORMSG.EXPIREDLOGIN);
      clearTimeout(expire);
    }
    const activities = req.ciphers.revealActivities(user);
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
    const activities = req.ciphers.revealActivities(user);
    return loginOk(res, { token: req.ciphers.revealToken(user), activities, updateKey: user.updateKey });
  }
};
router.post("/login", (req, res, next) => {
  loginHandler(req, res, next, { userModel: User });
});
  

const signupHandler = async (req, res, next, { userModel = User, invitationModel = Invitation }) => {
  const { ticket, name, password } = req.body;
  if (!password) return res.status(400).json(ERRORMSG.MISSINGPASSWORD);
  if (!name) return res.status(400).json(ERRORMSG.MISSINGUSERNAME);
  if (!ticket) return res.status(400).json(ERRORMSG.MISSINGTICKET);
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
  const existingCredentials = await userModel.findOne({ name }).exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  if (existingCredentials !== null) return res.status(403).json({ ...ERRORMSG.INVALIDCREDENTIALS, ticketRefund:ticket });
  const credentials = await req.ciphers.credentials(name, password).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  const [literal, token] = req.ciphers.tokenGen(name);
  const data = req.ciphers.obscureActivities([], { name, updateKey: 1 });
  const newUser = await userModel.create({ name, credentials, token, data, updateKey: 1 }).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  await invitationModel.findByIdAndDelete(invitation._id).exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  return res.status(200).json({ token: literal, activities: [], updateKey: newUser.updateKey });
};
router.post("/signup", (req, res, next) => {
  signupHandler(req, res, next, { userModel: User, invitationModel: Invitation });
});

const inviteHandler = async (req, res, next, { stateModel = State, invitationModel = Invitation }) => {
  const { password, ticket } = req.body;
  if (!password) return res.status(400).json(ERRORMSG.MISSINGPASSWORD);
  if (!ticket) return res.status(400).json(ERRORMSG.MISSINGTICKET);

  const state = await stateModel.findOne().exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  const match = await req.ciphers.compare(password, state.adminHash).catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  if (!match) return res.status(403).json(ERRORMSG.INVALIDCREDENTIALS);

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
  return res.status(200).json({ ticket });
};
router.post("/invite", (req, res, next) => {
  inviteHandler(req, res, next, { stateModel: State, invitationModel: Invitation });
});

const updateHandler = async (req, res, next, { userModel = User }) => {
  if (req.headers.update !== `${req.user.updateKey}`) return res.status(403).json({ selfDestruct: true });
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
  const activities = req.ciphers.revealActivities(req.user);
  const newActivities = req.user.push(activities, update);
  const updateKey = req.user.updateKey + 1;
  const data = req.ciphers.obscureActivities(newActivities, { name: req.user.name, updateKey });
  const updated = await userModel.findByIdAndUpdate(req.user._id, { data, updateKey }).exec().catch((error) => res.status(500).json({ ...ERRORMSG.CTD, error }));
  if (!updated) return res.status(500).json(ERRORMSG.CTD);
  const userWaiting = req.app.locals.waitingUsers[id].login;
  if (userWaiting) {
    const { res: loginRes } = req.app.locals.waitingUsers[id].login;
    loginOk(loginRes, { token: req.ciphers.revealToken(req.user), activities: newActivities, updateKey });
    clearTimeout(req.app.locals.waitingUsers[id].login.expireId);
    delete req.app.locals.waitingUsers[id].login;
  }
  clearTimeout(req.app.locals.waitingUsers[id].expireId);
  delete req.app.locals.waitingUsers[id];
  return res.status(200).json({ updateKey });
};
router.post("/update", userPrivileged, (req, res, next) => {
  updateHandler(req, res, next, { userModel: User });
});

module.exports = { router, loginHandler, signupHandler, inviteHandler, updateHandler };