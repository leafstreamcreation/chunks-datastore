const router = require("express").Router();

const mongoose = require("mongoose");
const State = require("../models/State.model");
const Invitation = require("../models/Invitation.model");
const INVITATION_EXPIRATION = 1000 * 60 * 60 * 24;
const User = require("../models/User.model");

const bcrypt = require("bcryptjs");
const saltRounds = 13;

const userPrivileged = require("./middleware/userPrivileged");

router.get("/", (req, res, next) => {
  res.status(200).send("Chonk");
});

const loginHandler = async (req, res, next, { userModel = User }) => {
    // const { password } = req.body;
  
    // if (!password) return res.status(400).json(ERRORS.LOGIN.MISSING_PASSWORD);
  
    // const savedHash = await userModel.findOne().exec().catch((error) => res.status(500).json(ERRORS.LOGIN.CTD));
    // if (!savedHash?.hash) return res.status(500).json(ERRORS.LOGIN.PASSWORD_UNSET);
  
    // const passCompare = await bcrypt.compare(password, savedHash.hash)
    // if (!passCompare) return res.status(400).json(ERRORS.LOGIN.INCORRECT_PASSWORD);
    
    
    // const currentState = await stateModel.findOne().exec().catch((error) => res.status(500).json(ERRORS.LOGIN.CTD));
    // const responseData = { session: null, leaseId: null };
  
    
    // if (!req.headers["lease-id"]) {
    //   currentState.leaseId = currentState.leaseId + 1;
    //   responseData.leaseId = currentState.leaseId;
    // }
    // else if (parseInt(req.headers["lease-id"]) !== currentState.leaseId) return res.status(409).json({ goDormant: true });
    
  
    // const engageScheduler = req.headers["client-delegation"] ? false : true;
    // req.app.locals.scheduler?.engage(engageScheduler);
    // currentState.schedulerEngaged = engageScheduler;
  
    // await currentState.save().catch((error) => res.status(500).json(ERRORS.LOGIN.CTD));
    
    // const oldSession = await sessionModel.findOne().exec().catch((error) => res.status(500).json(ERRORS.LOGIN.CTD));
    // if (oldSession) sessionModel.findByIdAndDelete(oldSession._id).exec().catch((error) => res.status(500).json(ERRORS.LOGIN.CTD));
  
    // const newSession = await sessionModel.create({ expires: new Date(Date.now() + SESSION_EXPIRATION) });
    // if (newSession) responseData.session = newSession;
  
  
  
    return res.status(200).json(responseData);
  };
  router.post("/login", loginHandler);


    const signupHandler = async (req, res, next, { userModel = User, invitationModel = Invitation }) => {
    return res.status(200).json(responseData);
  };
  router.post("/signup", signupHandler);
  
    const inviteHandler = async (req, res, next, { stateModel = State, invitationModel = Invitation }) => {
    return res.status(200).json(responseData);
  };
  router.post("/invite", inviteHandler);
  
    const updateHandler = async (req, res, next, { userModel = User }) => {
    return res.status(200).json(responseData);
  };
  router.post("/update", userPrivileged, updateHandler);
  
    const indexHandler = async (req, res, next, { userModel = User }) => {
    return res.status(200).json(responseData);
  };
  router.post("/index", userPrivileged, indexHandler);
  
  module.exports = { router, loginHandler, signupHandler, inviteHandler, updateHandler, indexHandler };