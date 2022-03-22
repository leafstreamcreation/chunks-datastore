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
                return Promise.resolve([...inv]);
            }
        }
        return Promise.resolve(null);
      }
    };
  }
}



class UserModel {

  constructor(users) {
    // this._id = session?.id ? session.id : null;
    // this.expires = session?.expires ? session.expires : null;
  }

  create({ expires }) {
    // this._id = 1;
    // this.expires = expires;
    // return Promise.resolve({ ...this });
  }

  findOne() {
    return {
      exec: () => {
        // return Promise.resolve(this._id ? { ...this } : null);
      }
    };
  }

  findOneAndDelete() {
    return {
      exec: () => {
        // if (!this._id) return Promise.resolve(null);
        // const copy = { ...this }
        // this._id = null;
        // this.expires = null;
        // return Promise.resolve(copy);
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