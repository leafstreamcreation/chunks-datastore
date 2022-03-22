const bcrypt = require("bcryptjs");

class StateModel {
  constructor(state) {
    this.schedulerEngaged = state?.engaged ? true : false;
    this.leaseId = state?.leaseId ? state.leaseId : 1;
  }

  findOne() {
    return {
      exec: () => {
        return Promise.resolve(this);
      }
    };
  }

  save() {
    return Promise.resolve();
  }
}



class PassModel {
  static async init(password) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    return new PassModel(hash);
  }

  constructor(hash) {
    this.hash = hash;
  }

  findOne() {
    return {
      exec: () => {
        return Promise.resolve({ ...this });
      }
    };
  }

}



class SessionModel {
  constructor(session) {
    this._id = session?.id ? session.id : null;
    this.expires = session?.expires ? session.expires : null;
  }

  create({ expires }) {
    this._id = 1;
    this.expires = expires;
    return Promise.resolve({ ...this });
  }

  findOne() {
    return {
      exec: () => {
        return Promise.resolve(this._id ? { ...this } : null);
      }
    };
  }

  findOneAndDelete() {
    return {
      exec: () => {
        if (!this._id) return Promise.resolve(null);
        const copy = { ...this }
        this._id = null;
        this.expires = null;
        return Promise.resolve(copy);
      }
    };
  }

}

const MockDB = async (seed = {}) => {
  const { session, state, password } = seed;
  const passModel = await PassModel.init(password || "secret123");
  const stateModel = new StateModel(state);
  const sessionModel = new SessionModel(session);
  return Promise.resolve({ passModel, stateModel, sessionModel });
};

const MockReq = (password = "secret123", lease = 1, clientSide = true) => {
  return {
    body:{ password },
    headers: {
      "lease-id":lease,
      "client-delegation": clientSide,
    },
    app: {
      locals: {
        scheduler: {
          engage: jest.fn().mockResolvedValue(true)
        }
      }
    }
  };
};

const MockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

module.exports = { MockDB, MockReq, MockRes };