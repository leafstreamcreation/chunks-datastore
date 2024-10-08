const router = require("express").Router();

const mongoose = require("mongoose");
const State = require("../models/State.model");
const Invitation = require("../models/Invitation.model");
const User = require("../models/User.model");
const UserData = require("../models/UserData.model");

const ciphers = require("./middleware/ciphers");
router.use(ciphers);

const mergeUpdate = require("./mergeUpdate");
const { ERRORMSG } = require("../errors");


router.get("/", (req, res, next) => {
  res.status(200).end();
});

const sendMessage = (req, res, status, message, details) => {
  return res.status(status).json(req.ciphers.exportMessage(message, details));
}

const loginOk = (res, payload) => res.status(200).json(payload);

const loginHandler = async (req, res, next, { userModel = User, userDataModel = UserData }) => {
  const { credentials:cCred } = req.body;
  
  if (!cCred) return sendMessage(req, res, 400, ERRORMSG.MISSINGCREDENTIALS);
  const inCreds = req.ciphers.revealInbound(cCred, process.env.CREDENTIAL_KEY); 
  const users = await userModel.find().exec().catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  let user;
  for ( const [index, u] of users.entries()) {
    const match = await req.ciphers.compare(inCreds, u.credentials);
    if (match) {
      user = users[index];
      break;
    }
  }
  if (!user) return sendMessage(req, res, 403, ERRORMSG.INVALIDCREDENTIALS);

  const { data } = await userDataModel.findById(user.data).exec().catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  if (!data) return sendMessage(req, res, 500, ERRORMSG.CTD);
  
  const userUpdating = req.app.locals.waitingUsers?.[user._id];
  if (userUpdating) {
    if ("login" in userUpdating) {
      const { res:oldRes, expireId:expire } = userUpdating.login;
      sendMessage(req, oldRes, 403, ERRORMSG.EXPIREDLOGIN);
      clearTimeout(expire);
    }
    const rUserData = req.ciphers.revealUserData(inCreds, user, data);
    const rUpdateKey = req.ciphers.revealUpdateKey(inCreds, user);
    const { iv, salt, updateKey, userData } = req.ciphers.exportUserData(rUpdateKey, rUserData);
    const expireId = setTimeout((req, res, id) => {
      sendMessage(req, res, 403, ERRORMSG.EXPIREDLOGIN);
      delete req.app.locals.waitingUsers[id].login;
    }, 1000 * 10, req, res, user._id);
    req.app.locals.waitingUsers[user._id].login = {
      res, 
      payload: { 
        iv,
        salt,
        updateKey,
        userData, 
      },
      expireId
    };
  }
  else {
    const rUserData = req.ciphers.revealUserData(inCreds, user, data);
    const rUpdateKey = req.ciphers.revealUpdateKey(inCreds, user);
    const { iv, salt, updateKey, userData } = req.ciphers.exportUserData(rUpdateKey, rUserData);
    return loginOk(res, { iv, salt, updateKey, userData });
  }
};
router.post("/login", (req, res, next) => {
  loginHandler(req, res, next, { userModel: User, userDataModel: UserData });
});
  

const signupHandler = async (req, res, next, { userModel = User, userDataModel = UserData, invitationModel = Invitation }) => {
  const { ticket:cTicket, credentials:cCred } = req.body;
  if (!cCred) return sendMessage(req, res, 400, ERRORMSG.MISSINGCREDENTIALS);
  if (!cTicket) return sendMessage(req, res, 400, ERRORMSG.MISSINGTICKET);
  const ticket = req.ciphers.revealInbound(cTicket, process.env.TICKET_KEY);
  let invitation = null;
  const pending = await invitationModel.find().exec().catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  for ( const i of pending) {
    const match = await req.ciphers.compare(ticket, i.codeHash).catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
    if (match) {
      invitation = i;
      break;
    }
  }
  if (!invitation) return sendMessage(req, res, 403, ERRORMSG.INVALIDTICKET);
  const inCreds = req.ciphers.revealInbound(cCred, process.env.CREDENTIAL_KEY);
  const users = await userModel.find().exec().catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  for ( const u of users) {
    const match = await req.ciphers.compare(inCreds, u.credentials);
    if (match) return sendMessage(req, res, 403, ERRORMSG.CREDENTIALSTAKEN);
  }
  const credentials = await req.ciphers.credentials(inCreds).catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  const initialEntropy = await req.ciphers.generateEntropy();
  const initialUserData = ["{}", [], []];
  const data = req.ciphers.obscureUserData(inCreds, initialEntropy, initialUserData);
  const cUpdateKey = req.ciphers.obscureUpdateKey(inCreds, initialEntropy, 1);
  const newUserData = await userDataModel.create({ data }).catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  await userModel.create({ credentials, data: newUserData._id, iv: initialEntropy.iv, salt: initialEntropy.salt, updateKey: cUpdateKey }).catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  await invitationModel.findByIdAndDelete(invitation._id).exec().catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  const { iv, salt, updateKey, userData } = req.ciphers.exportUserData(1, initialUserData);
  return res.status(200).json({ iv, salt, updateKey, userData });
};
router.post("/signup", (req, res, next) => {
  signupHandler(req, res, next, { userModel: User, userDataModel: UserData, invitationModel: Invitation });
});

const inviteHandler = async (req, res, next, { stateModel = State, invitationModel = Invitation }) => {
  const { password: cPassword, ticket: cTicket } = req.body;
  if (!cTicket) return sendMessage(req, res, 400, ERRORMSG.MISSINGTICKET);
  if (!cPassword) return sendMessage(req, res, 400, ERRORMSG.MISSINGPASSWORD);

  const state = await stateModel.findOne().exec().catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  const password = req.ciphers.revealInbound(cPassword, process.env.PASSWORD_KEY);
  const match = await req.ciphers.compare(password, state.adminHash).catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  if (!match) return sendMessage(req, res, 403, ERRORMSG.INVALIDCREDENTIALS);

  const ticket = req.ciphers.revealInbound(cTicket, process.env.TICKET_KEY);
  let invitation = null;
  const pending = await invitationModel.find().exec().catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  for ( const i of pending) {
    const match = await req.ciphers.compare(ticket, i.codeHash).catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
    if (match) {
      invitation = i;
      break;
    }
  }
  if (invitation) return sendMessage(req, res, 403, ERRORMSG.TICKETEXISTS);
  const codeHash = await req.ciphers.credentials(ticket).catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  invitationModel.create({ codeHash, expires: new Date(Date.now() + 1000 * 60 * 30) }).catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  return res.status(200).end();
};
router.post("/invite", (req, res, next) => {
  inviteHandler(req, res, next, { stateModel: State, invitationModel: Invitation });
});

const updateHandler = async (req, res, next, { userModel = User, userDataModel = UserData }) => {
  const { credentials: cCred, updateKey: cUpdateKey, update: cUpdate } = req.body;
  if (!cCred) return sendMessage(req, res, 400, ERRORMSG.MISSINGCREDENTIALS);
  if (!cUpdateKey) return sendMessage(req, res, 400, ERRORMSG.MISSINGKEY);
  const inCreds = req.ciphers.revealInbound(cCred, process.env.CREDENTIAL_KEY);
  const users = await userModel.find().exec().catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  let user;
  for ( const [index, u] of users.entries()) {
    const match = await req.ciphers.compare(inCreds, u.credentials);
    if (match) {
      user = users[index];
      break;
    }
  }
  if (!user) return sendMessage(req, res, 403, ERRORMSG.INVALIDCREDENTIALS);
  
  const inUpdateKey = req.ciphers.revealInbound(cUpdateKey, process.env.UPDATE_KEY);
  const rUpdateKey = req.ciphers.revealUpdateKey(inCreds, user);
  if (inUpdateKey !== rUpdateKey) return sendMessage(req, res, 403, "selfDestruct");

  const id = `${user._id}`;
  const listeningForUpdates = id in req.app.locals.waitingUsers;
  if (!cUpdate) {
    if (listeningForUpdates) return sendMessage(req, res, 200, "defer");
    req.app.locals.waitingUsers[id] = {};
    req.app.locals.waitingUsers[id].expireId = setTimeout((r, i) => {
      delete r.app.locals.waitingUsers[i];
    }, 1000 * 60 * 60 * 2.5, req, id);
    return sendMessage(req, res, 200, "listening");
  }
  if (!listeningForUpdates) return sendMessage(req, res, 200, "defer");

  const { data: oldData } = await userDataModel.findById(user.data).exec().catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  if (!oldData) return sendMessage(req, res, 500, ERRORMSG.CTD);

  const update = req.ciphers.revealInbound(cUpdate, process.env.DATA_KEY);
  const rUserData = req.ciphers.revealUserData(inCreds, user, oldData);
  const newUserData = mergeUpdate(rUserData, update);
  const newUpdateKey = rUpdateKey + 1;

  const newEntropy = req.ciphers.generateEntropy();
  const localData = req.ciphers.obscureUserData(inCreds, newEntropy, newUserData);
  const localKey = req.ciphers.obscureUpdateKey(inCreds, newEntropy, newUpdateKey);

  const writeNewKey = userModel.findByIdAndUpdate(user._id, { iv: newEntropy.iv, salt: newEntropy.salt, updateKey: localKey }).exec().catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  const writeNewData = userDataModel.findByIdAndUpdate(user.data, { data: localData }).exec().catch((error) => sendMessage(req, res, 500, ERRORMSG.CTD, error));
  const [ updatedKey, updatedData ] = await Promise.all([writeNewKey, writeNewData]);
  if (!updatedKey || !updatedData) return sendMessage(req, res, 500, ERRORMSG.CTD);

  const userWaiting = req.app.locals.waitingUsers[id].login;
  if (userWaiting) {
    const { res: loginRes } = req.app.locals.waitingUsers[id].login;
    const { iv, salt, updateKey, userData } = req.ciphers.exportUserData(newUpdateKey, newUserData);
    loginOk(loginRes, { iv, salt, updateKey, userData });
    clearTimeout(req.app.locals.waitingUsers[id].login.expireId);
    delete req.app.locals.waitingUsers[id].login;
  }
  clearTimeout(req.app.locals.waitingUsers[id].expireId);
  delete req.app.locals.waitingUsers[id];
  const { iv, salt, updateKey } = req.ciphers.exportUserData(newUpdateKey);
  return res.status(200).json({ iv, salt, updateKey });
};
router.post("/update", (req, res, next) => {
  updateHandler(req, res, next, { userModel: User, userDataModel: UserData });
});

module.exports = { router, loginHandler, signupHandler, inviteHandler, updateHandler };