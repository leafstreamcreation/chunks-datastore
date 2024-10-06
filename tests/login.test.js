require("dotenv/config");
const { MockDB, MockReq, MockRes } = require("./remote-storage-utilities");
const { loginHandler: login } = require("../src/routes/index");
const { ERRORMSG } = require("../src/errors");
const { CIPHERS } = require("../src/routes/middleware/cipherEnums");
const SEPARATOR = process.env.CRED_SEPARATOR;

describe("Spec for login route", () => {
  
    test("login with valid credentials returns json data, and nextUpdateKey", async () => {
        const iv = 1;
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const instance =  MockDB({ users });
        const req = MockReq({ iv, name, password });
        const res = MockRes();
        
        const u2Creds = name + SEPARATOR + password
        const user2 = { _id: 2, credentials: u2Creds, data: 2, updateKey: 1, iv: 1 };
        expect(instance.userModel.users["2"]).toEqual(user2);
        expect(instance.userDataModel.entries["2"].data).toEqual(["{}", [], []]);
        expect(Object.values(instance.userModel.users).length).toBe(2);
    
        await login(req, res, null, instance);
        const loginResponse = { iv: 1, updateKey: 1, userData: ["{}", [], []] };
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(loginResponse);

        expect(req.ciphers.revealInbound).toHaveBeenCalledWith(u2Creds, CIPHERS.CREDENTIALS);
        expect(req.ciphers.compare).toHaveBeenCalledWith(u2Creds, instance.userModel.users["1"].credentials);
        expect(req.ciphers.compare).toHaveBeenCalledWith(u2Creds, instance.userModel.users["2"].credentials);
        expect(req.ciphers.revealUserData).toHaveBeenCalledWith(u2Creds, user2, instance.userDataModel.entries["2"].data);
        expect(req.ciphers.revealUpdateKey).toHaveBeenCalledWith(u2Creds, user2);
        expect(req.ciphers.exportUserData).toHaveBeenCalledWith(1, ["{}", [], []]);
    });

    test("login with invalid credentials returns errors", async () => {
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const instance =  MockDB({ users });

        const noCred = MockReq({ name, password: null });
        const noCredRes = MockRes();
        await login(noCred, noCredRes, null, instance);
        expect(noCredRes.status).toHaveBeenCalledWith(400);
        expect(noCredRes.json).toHaveBeenCalledWith(ERRORMSG.MISSINGCREDENTIALS);

        const badPass = MockReq({ name, password: "foobar" });
        const badPassRes = MockRes();
        await login(badPass, badPassRes, null, instance);
        expect(badPassRes.status).toHaveBeenCalledWith(403);
        expect(badPassRes.json).toHaveBeenCalledWith(ERRORMSG.INVALIDCREDENTIALS);
    });

    test("login waits for updates to complete", async () => {
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const instance =  MockDB({ users });

        const u2Creds = name + SEPARATOR + password
        const req = MockReq({ name, password }, {}, null, { "2": {} });
        const res = MockRes();

        expect("login" in req.app.locals.waitingUsers["2"]).toBe(false);

        await login(req, res, null, instance);

        expect("login" in req.app.locals.waitingUsers["2"]).toBe(true);
        expect(req.app.locals.waitingUsers["2"].login.res).toEqual(res);
        expect(req.app.locals.waitingUsers["2"].login.payload).toEqual({ iv: 1, updateKey: 1, userData: ["{}", [], []] });
        expect("expireId" in req.app.locals.waitingUsers["2"].login).toBe(true);

        clearInterval(req.app.locals.waitingUsers["2"].login.expireId);
        
        expect(res.json).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});