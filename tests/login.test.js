const { MockDB, MockReq, MockRes } = require("./remote-storage-utilities");
const { loginHandler: login } = require("../src/routes/index");
const { ERRORMSG } = require("../src/errors");

describe("Spec for login route", () => {
  
    test("login with valid credentials returns userId, json data, and nextUpdateKey", async () => {
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const instance =  MockDB({ users });
        const req = MockReq({ name, password });
        const res = MockRes();
        
        const user2 = { _id: 2, name, credentials: name + password, data: [], updateKey: 1 };
        expect(instance.userModel.users["2"]).toEqual(user2);
        expect(Object.values(instance.userModel.users).length).toBe(2);
    
        await login(req, res, null, instance);
        const loginResponse = { _id: 2, activities: [], updateKey: 1 };
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(loginResponse);

        expect(req.ciphers.credentials).toHaveBeenCalledWith(name, password);
        expect(req.ciphers.compare).toHaveBeenCalled();
        expect(req.ciphers.reveal).toHaveBeenCalled();
    });

    test("login with invalid credentials returns errors", async () => {
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const instance =  MockDB({ users });

        const noname = MockReq({ name: null, password });
        const nonameRes = MockRes();
        await login(noname, nonameRes, null, instance);
        expect(nonameRes.status).toHaveBeenCalledWith(400);
        expect(nonameRes.json).toHaveBeenCalledWith(ERRORMSG.MISSINGUSERNAME);

        const nopass = MockReq({ name, password: null });
        const nopassRes = MockRes();
        await login(nopass, nopassRes, null, instance);
        expect(nopassRes.status).toHaveBeenCalledWith(400);
        expect(nopassRes.json).toHaveBeenCalledWith(ERRORMSG.MISSINGPASSWORD);

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

        const req = MockReq({ name, password }, { "2": true });
        const res = MockRes();
        await login(req, res, null, instance);
        expect(req.app.locals.waitingUsers).toEqual({ "2": { res, payload: { _id: 2, activities: [], updateKey: 1 }}})
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();

    });
});