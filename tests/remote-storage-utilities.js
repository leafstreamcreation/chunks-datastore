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

  constructor(invitations) {
    this.currentId = 1;
    this.invitations = [];
    invitations.forEach(({ codeHash = "ABCD", expires = new Date(Date.now() + 1000 * 60 * 30) }) => {
        this.invitations.push({ _id: this.currentId, codeHash: codeHash, expires: expires });
        this.currentId += 1;
    });
  }

  create({ codeHash = "ABCD", expires = new Date(Date.now() + 1000 * 60 * 30) }) {
        const newInvitation = { _id: this.currentId, codeHash: codeHash, expires: expires }
        this.currentId += 1;
        this.invitations.push(newInvitation);
        return Promise.resolve({ ...newInvitation });
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

  constructor(users) {
    this.currentId = 1;
    const userArray = [];
    users.forEach(({ name = "RaquelettaMoss", credentials = "RaquelettaMosssecret123"}) => {
        userArray.push({ _id: this.currentId, name, credentials, updateKey: 1, data: [] });
        this.currentId += 1;
    });
    this.users = keyBy(userArray, "_id");
  }

  create({ name = "RaquelettaMoss", credentials = "RaquelettaMosssecret123" }) {
    this.currentId += 1;
    const newUser = { _id: this.currentId, name, credentials, updateKey: 1, data: [] };
    this.users[`${this.currentId}`] = newUser;
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

  findByIdAndUpdate(id, { data }) {
    return {
      exec: () => {
        const user = this.users[`${id}`];
        if (!user) return Promise.resolve(null);
        user.data = data;
        this.users[`${id}`] = user;
        return Promise.resolve({...user});
      }
    };
  }

}

const MockDB = async (seed = {}) => {
  const { state, invitations, users } = seed;
  const stateModel = new StateModel(state);
  const invitationModel = new InvitationModel(invitations);
  const userModel = new UserModel(users);
  return Promise.resolve({ stateModel, invitationModel, userModel });
};

const MockReq = ({ username = "friend", password = "secret123" }, userId = 1, updateKey = 1) => {
    const req = { 
        headers: {},
    };
    if (username !== null && password !== null) req.body = { username, password };
    if (userId !== null) {
        req.headers.user = userId;
        //encoding and JSONifying are abstracted into the request user
        req.user = { 
            pack: jest.fn(x => Promise.resolve(x)),
            unpack: jest.fn(x => Promise.resolve(x)),
        };
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