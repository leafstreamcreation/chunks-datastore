const { keyBy } = require("lodash");
const mergeUpdate = require("../src/routes/middleware/mergeUpdate");

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

  findOne({ codeHash }) {
      return {
        exec: () => {
            for (let i = 0; i < this.invitations.length; i++) {
                const invHash = this.invitations[i].codeHash;
                if (invHash === codeHash) {
                    const inv = this.invitations[i];
                    return Promise.resolve({...inv});
                }
            }
            return Promise.resolve(null);
        }
      };
  }

  findOneAndDelete({ codeHash }) {
    return {
      exec: () => {
        for (let i = 0; i < this.invitations.length; i++) {
            const invHash = this.invitations[i].codeHash;
            if (invHash === codeHash) {
                const inv = this.invitations[i];
                this.invitations.splice(i, 1);
                return Promise.resolve({...inv});
            }
        }
        return Promise.resolve(null);
      }
    };
  }
}



class UserModel {

  constructor(users = []) {
    this.currentId = 1;
    const userArray = [];
    users.forEach(({ name = "RaquelettaMoss", password = "secret123" }) => {
        const credentials = name + password;
        userArray.push({ _id: this.currentId, name, credentials, updateKey: 1, data: [] });
        this.currentId += 1;
    });
    this.users = keyBy(userArray, "_id");
  }

  create({ name = "RaquelettaMoss", credentials = "RaquelettaMosssecret123" }) {
      const newUser = { _id: this.currentId, name, credentials, updateKey: 1, data: [] };
      this.users[`${this.currentId}`] = newUser;
      this.currentId += 1;
    return Promise.resolve({ ...newUser });
  }

  findOne({ credentials }) {
    return {
      exec: () => {
        const users = Object.values(this.users);
        for (let i = 0; i < users.length; i++) {
            const uCred = users[i].credentials;
            if (uCred === credentials) {
                const u = users[i];
                return Promise.resolve({...u});
            }
        }
        return Promise.resolve(null);
      }
    };
  }

  findByIdAndUpdate(id, { data, updateKey }) {
    return {
      exec: () => {
        const user = this.users[`${id}`];
        if (!user) return Promise.resolve(null);
        user.data = data || user.data;
        user.updateKey = updateKey || user.updateKey;
        this.users[`${id}`] = user;
        return Promise.resolve({...user});
      }
    };
  }

}

const MockDB = (seed = {}) => {
  const { state, invitations, users } = seed;
  const stateModel = new StateModel(state);
  const invitationModel = new InvitationModel(invitations);
  const userModel = new UserModel(users);
  return { stateModel, invitationModel, userModel };
};

const MockReq = ({ ticket = "ABCD", name = "friend", password = "secret123", update }, user = {}, updateKey = null, waitlist = {}) => {
  const { _id, userModel } = user;  
  const req = { 
        headers: {},
        ciphers: {
            obscure: jest.fn((x,y) => Promise.resolve(x)),
            reveal: jest.fn(({ data }) => Promise.resolve(data)),
            credentials: jest.fn((x,y = "") => Promise.resolve(x+y)),
            compare: jest.fn((x,y) => Promise.resolve(x===y)),
        },
        app: { locals: { waitingUsers: waitlist }}
    };
    if (name || password || ticket || update) req.body = {};
    if (ticket) req.body.ticket = ticket;
    if (name) req.body.name = name;
    if (password) req.body.password = password;
    if (update) req.body.update = update;
    if (_id && userModel) { 
      req.user = { ...userModel.users[`${_id}`] };
      req.user.push = jest.fn((x, y) => mergeUpdate(x, y));
    }
    if (updateKey !== null) req.headers.update = updateKey;
    return req;
};

const MockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

module.exports = { MockDB, MockReq, MockRes };