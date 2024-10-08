module.exports = {
  ERRORMSG: {
    CTD: "Unexpected error; investigation required",
    UNSECUREREQUEST: "unencrypted request",
    MISSINGCREDENTIALS: "missing credentials",
    MISSINGTICKET: "missing ticket",
    MISSINGPASSWORD: "missing password",
    MISSINGKEY: "missing update key",
    INVALIDCREDENTIALS: "invalid credentials",
    INVALIDTICKET: "invalid ticket",
    TICKETEXISTS: "ticket already exists",
    EXPIREDLOGIN: "login request expired",
    CREDENTIALSTAKEN: "username and password already exist",
  },
  handleErrors: (app) => {
    app.use((req, res, next) => {
      // this middleware runs whenever requested page is not available
      res.status(404).json({errorMessage: "Endpoint not found"});
    });
  
    app.use((err, req, res, next) => {
      // whenever you call next(err), this middleware will handle the error
      // always logs the error
      console.error("ERROR: ", req.method, req.path, err);
  
      // only render if the error ocurred before sending the response
      if (!res.headersSent) {
        res.status(500).res.json({ errorMessage: err.message });
      }
    });
  }
};