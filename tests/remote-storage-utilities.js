const { keyBy } = require("lodash");

class StateModel {

  constructor(pass = "admin123") {
    this.adminHash = pass;
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



class InvitationModel {

  constructor(invitations = []) {
    this.currentId = 1;
    this.invitations = [];
    invitations.forEach(({ ticket = "ABCD", expires = new Date(Date.now() + 1000 * 60 * 30) }) => {
        this.invitations.push({ _id: this.currentId, codeHash: ticket, expires: expires });
        this.currentId += 1;
    });
  }

  create({ codeHash = "ABCD", expires = new Date(Date.now() + 1000 * 60 * 30) }) {
        const newInvitation = { _id: this.currentId, codeHash: codeHash, expires: expires }
        this.currentId += 1;
        this.invitations.push(newInvitation);
        return Promise.resolve({ ...newInvitation });
  }

  find() {
      return {
        exec: () => {
            return Promise.resolve([...this.invitations]);
        }
      };
  }

  findByIdAndDelete(id) {
    return {
      exec: () => {
        const invObj = keyBy(this.invitations, "_id");
        delete invObj[`${id}`]
        this.invitations = Object.values(invObj);
        return Promise.resolve(Object.values(invObj));
      }
    };
  }
}



class UserModel {

  constructor(users = [], ) {
    this.currentId = 1;
    const userArray = [];
    users.forEach(({ name, password }) => {
        const credentials = name + "/-/" + password;
        userArray.push({ _id: this.currentId, credentials, iv: 1, salt: 1, updateKey: 1, data: this.currentId });
        this.currentId += 1;
    });
    this.users = keyBy(userArray, "_id");
  }

  create({ credentials, data, updateKey = 1, iv = 1, salt = 1 }) {
      for (const { credentials: oldCredentials } of Object.values(this.users)) {
        if ( oldCredentials === credentials) return Promise.resolve(null);
      }
      const newUser = { _id: this.currentId, credentials, updateKey, iv, salt, data };
      this.users[`${this.currentId}`] = newUser;
      this.currentId += 1;
    return Promise.resolve({ ...newUser });
  }

  find() {
    return {
      exec: () => {
        return Promise.resolve(Object.values(this.users));
      }
    };
  }

  findByIdAndUpdate(id, { updateKey }) {
    return {
      exec: () => {
        const user = this.users[`${id}`];
        if (!user) return Promise.resolve(null);
        user.updateKey = updateKey || user.updateKey;
        this.users[`${id}`] = user;
        return Promise.resolve({...user});
      }
    };
  }

}

class UserDataModel {
  constructor(num) {
    this.currentId = 0;
    if (!num) this.entries = {};
    const dataArray = [];
    for (let i = 0; i < num; i++) {
      this.currentId += 1;
      dataArray.push({ _id: this.currentId, data: ["{}", [], []] });
    }
    this.entries = num ? keyBy(dataArray, "_id") : {};
  }

  create({ data = ["{}", [], []] }) {
    this.currentId += 1;
    this.entries[`${this.currentId}`] = { _id: this.currentId, data };
    return Promise.resolve({ _id: this.currentId, data });
  }

  findById(id) {
    return {
      exec: () => {
        const entry = this.entries[`${id}`];
        if (!entry) return Promise.resolve(null);
        return Promise.resolve({...entry});
      }
    }
  }
  
  findByIdAndUpdate(id, { data }) {
    return {
      exec: () => {
        const entry = this.entries[`${id}`];
        if (!entry) return Promise.resolve(null);
        this.entries[`${id}`].data = data;
        return Promise.resolve({...entry});
      }
    }
  }
}

const MockDB = (seed = {}) => {
  const { state, invitations, users } = seed;
  const stateModel = new StateModel(state);
  const invitationModel = new InvitationModel(invitations);
  const userModel = new UserModel(users);
  const userDataModel = new UserDataModel(users ? users.length : 0);
  return { stateModel, invitationModel, userModel, userDataModel };
};

const MockReq = ({ iv, salt, ticket, name, password, updateKey, update }, waitlist = {}) => {
  const req = { 
        headers: {},
        ciphers: {
            revealInbound: jest.fn((x,y) => { return typeof x === 'string' ? x : JSON.stringify(x); }),
            credentials: jest.fn((x) => Promise.resolve(x)),
            compare: jest.fn((x,y) => Promise.resolve(x===y)),
            generateEntropy: jest.fn(() => { return { iv: 1, salt: 1 }; }),
            wrapEntropyForStorage: jest.fn((x) => x),
            obscureUserData: jest.fn((w,x,y) => JSON.parse(y)),
            obscureUpdateKey: jest.fn((w,x,y) => parseInt(y)),
            exportUserData: jest.fn((x,y) => { 
              return y ? { iv: 1, salt: 1, updateKey: parseInt(x), userData: JSON.parse(y) } : { iv: 1, salt: 1, updateKey: parseInt(x) }; 
            }),
            exportMessage: jest.fn((x,y) => { return { iv: 1, salt: 1, message: x }; }),
            revealUserData: jest.fn((x,y, data) => JSON.stringify(data)),
            revealUpdateKey: jest.fn((x,y) => `${y.updateKey}`),
        },
        app: { locals: { waitingUsers: waitlist }}
    };
    if (iv || salt || name || password || ticket || update) req.body = {};
    if (iv) req.body.iv = iv;
    if (salt) req.body.salt = salt;
    if (ticket) req.body.ticket = ticket;
    if (name && password) req.body.credentials = name + "/-/" + password;
    else if (password) req.body.password = password;
    if (updateKey) req.body.updateKey = updateKey;
    if (update) req.body.update = update;
    return req;
};

const MockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn();
  return res;
}

module.exports = { MockDB, MockReq, MockRes };