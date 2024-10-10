require("dotenv/config");
const { MockDB, MockReq, MockRes } = require("./remote-storage-utilities");
const { updateHandler } = require("../src/routes/index");
const { ERRORMSG } = require("../src/errors");
const SEPARATOR = process.env.CRED_SEPARATOR;

describe("Spec for update route", () => {
  
    test("authenticated update request with payload and valid updateKey writes new data, empties the login waitlist, and server stops listening for updates for authenticated user", async () => {
        const iv = 1;
        const salt = 1;
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const credentials = name + SEPARATOR + password;
        const instance =  MockDB({ users });

        const update = [
            { op: 3, val: { id: 1, name: "squashing", history: [{}], group: 0 }}
        ];

        const loginRes = MockRes();
        const req = MockReq({ iv, salt, name, password, updateKey: 1, update }, { "2": { login: { res: loginRes, payload: {}, expireId: 1 }, expireId: 2 } });
        const res = MockRes();
        
        const user2 = instance.userModel.users["2"];
        const user2Data = ["{}", [], []];
        expect(instance.userModel.users["2"].updateKey).toBe(1);
        expect(instance.userDataModel.entries["2"].data).toEqual(user2Data);
        expect(req.app.locals.waitingUsers["2"].login).toEqual({ res: loginRes, payload: {}, expireId: 1 });
        
        await updateHandler(req, res, null, instance);
        const updateResult = { iv: 1, salt: 1, updateKey: 2 };
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(updateResult);

        expect(req.ciphers.revealInbound).toHaveBeenCalledWith(credentials, process.env.CREDENTIAL_KEY);
        expect(req.ciphers.compare).toHaveBeenCalledWith(credentials, instance.userModel.users["1"].credentials);
        expect(req.ciphers.compare).toHaveBeenCalledWith(credentials, instance.userModel.users["2"].credentials);
        expect(req.ciphers.compare).toHaveBeenCalledTimes(2);
        expect(req.ciphers.revealInbound).toHaveBeenCalledWith(1, process.env.UPDATE_KEY);
        expect(req.ciphers.revealUpdateKey).toHaveBeenCalledWith(credentials, user2);
        expect(req.ciphers.revealInbound).toHaveBeenCalledWith(update, process.env.DATA_KEY);
        expect(req.ciphers.revealUserData).toHaveBeenCalledWith(credentials, user2, user2Data);
        expect(req.ciphers.generateEntropy).toHaveBeenCalled();
        expect(req.ciphers.obscureUserData).toHaveBeenCalledWith(credentials, { iv: 1, salt: 1 }, JSON.stringify(["{}", [], [{ id: 1, name: "squashing", history: [{}], group: 0 }]]));
        expect(req.ciphers.obscureUpdateKey).toHaveBeenCalledWith(credentials, { iv: 1, salt: 1 }, '2');
        expect(req.ciphers.exportUserData).toHaveBeenCalledWith('2');

        expect("2" in req.app.locals.waitingUsers).toBe(false);
        
        expect(instance.userModel.users["2"].updateKey).toBe(2);
        expect(instance.userDataModel.entries["2"].data).toEqual(["{}", [], [update[0].val]]);
        
        const mockLoginPayload = { iv: 1, salt: 1, updateKey: 2, userData: ["{}", [], [{ id: 1, name: "squashing", history: [{}], group: 0 }]] };
        expect(req.ciphers.exportUserData).toHaveBeenCalledWith('2', JSON.stringify(["{}", [], [{ id: 1, name: "squashing", history: [{}], group: 0 }]]));
        expect(loginRes.status).toHaveBeenCalledWith(200);
        expect(loginRes.json).toHaveBeenCalledWith(mockLoginPayload);

    });
  
    test("initial authenticated update request (with valid update key and no update payload) blocks logins for authenticated user; server begins listening for the payload update", async () => {
        const iv = 1;
        const salt = 1;
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const credentials = name + SEPARATOR + password;
        const instance =  MockDB({ users });

        const req = MockReq({ iv, salt, name, password, updateKey: 1 }, {});
        const res = MockRes();

        const user2 = instance.userModel.users["2"];
        
        expect("2" in req.app.locals.waitingUsers).toBe(false);
        
        await updateHandler(req, res, null, instance);
        
        expect("2" in req.app.locals.waitingUsers).toBe(true);
        expect("expireId" in req.app.locals.waitingUsers["2"]).toBe(true);
        expect("login" in req.app.locals.waitingUsers["2"]).toBe(false);
        clearTimeout(req.app.locals.waitingUsers["2"].expireId);

        expect(instance.userModel.users["2"].updateKey).toBe(1);
        
        const updateResult = { iv: 1, salt: 1, message: "listening" };
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(updateResult);

        expect(req.ciphers.revealInbound).toHaveBeenCalledWith(credentials, process.env.CREDENTIAL_KEY);
        expect(req.ciphers.compare).toHaveBeenCalledWith(credentials, instance.userModel.users["1"].credentials);
        expect(req.ciphers.compare).toHaveBeenCalledWith(credentials, instance.userModel.users["2"].credentials);
        expect(req.ciphers.compare).toHaveBeenCalledTimes(2);
        expect(req.ciphers.revealInbound).toHaveBeenCalledWith(1, process.env.UPDATE_KEY);
        expect(req.ciphers.revealUpdateKey).toHaveBeenCalledWith(credentials, user2);

        expect(req.ciphers.revealUserData).not.toHaveBeenCalled();
        expect(req.ciphers.obscureUserData).not.toHaveBeenCalled();
        expect(req.ciphers.obscureUpdateKey).not.toHaveBeenCalled();
        expect(req.ciphers.exportUserData).not.toHaveBeenCalled();
    });

    test("authenticated update request without payload while db is listening is deferred", async () => {
        const iv = 1;
        const salt = 1;
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const instance =  MockDB({ users });

        const req = MockReq({ iv, salt, name, password, updateKey: 1 }, { "2": {}});
        const res = MockRes();
        
        expect("2" in req.app.locals.waitingUsers).toBe(true);
        
        await updateHandler(req, res, null, instance);
        
        expect("2" in req.app.locals.waitingUsers).toBe(true);
        const updateResult = { iv: 1, salt: 1, message: "defer" };
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(updateResult);

        expect(req.ciphers.revealUserData).not.toHaveBeenCalled();
        expect(req.ciphers.obscureUserData).not.toHaveBeenCalled();
        expect(req.ciphers.obscureUpdateKey).not.toHaveBeenCalled();
        expect(req.ciphers.exportUserData).not.toHaveBeenCalled();
    });

    test("authenticated update request with payload while db not listening is deferred", async () => {
        const iv = 1;
        const salt = 1;
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const instance =  MockDB({ users });

        const update = [
            { op: 3, val: { _id: 1, name: "squashing", history: [{}], group: 0 }}
        ];

        const req = MockReq({ iv, salt, name, password, updateKey: 1, update });
        const res = MockRes();
        
        expect("2" in req.app.locals.waitingUsers).toBe(false);
        
        await updateHandler(req, res, null, instance);
        
        expect("2" in req.app.locals.waitingUsers).toBe(false);
        const updateResult = { iv: 1, salt: 1, message: "defer" };
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(updateResult);

        expect(req.ciphers.revealUserData).not.toHaveBeenCalled();
        expect(req.ciphers.obscureUserData).not.toHaveBeenCalled();
        expect(req.ciphers.obscureUpdateKey).not.toHaveBeenCalled();
        expect(req.ciphers.exportUserData).not.toHaveBeenCalled();
    });

    test("update (signed in) with invalid updateKey returns self destruct", async () => {
        const iv = 1;
        const salt = 1;
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const instance =  MockDB({ users });

        const req = MockReq({ iv, salt, name, password, updateKey: 2 });
        const res = MockRes();
        
        expect(instance.userModel.users["2"].updateKey).toBe(1);
        
        await updateHandler(req, res, null, instance);

        expect(instance.userModel.users["2"].updateKey).toBe(1);
        
        const updateResult = { iv: 1, salt: 1, message: "selfDestruct" };
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(updateResult);

        expect(req.ciphers.revealUserData).not.toHaveBeenCalled();
        expect(req.ciphers.obscureUserData).not.toHaveBeenCalled();
        expect(req.ciphers.obscureUpdateKey).not.toHaveBeenCalled();
        expect(req.ciphers.exportUserData).not.toHaveBeenCalled();
    });

    test("unauthenticated update requests or requests missing keys or requests containing updates with invalid JSON returns errors", async () => {
        const iv = 1;
        const salt = 1;
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const instance =  MockDB({ users });

        const noCred = MockReq({ iv, salt, name, password: null, updateKey: 1 });
        const noCredRes = MockRes();
        await updateHandler(noCred, noCredRes, null, instance);
        expect(noCredRes.status).toHaveBeenCalledWith(400);
        expect(noCredRes.json).toHaveBeenCalledWith({ iv: 1, salt: 1, message: ERRORMSG.MISSINGCREDENTIALS });

        const noUpdateKey = MockReq({ iv, salt, name, password });
        const noUpdateKeyRes = MockRes();
        await updateHandler(noUpdateKey, noUpdateKeyRes, null, instance);
        expect(noUpdateKeyRes.status).toHaveBeenCalledWith(400);
        expect(noUpdateKeyRes.json).toHaveBeenCalledWith({ iv: 1, salt: 1, message: ERRORMSG.MISSINGKEY });

        const badPass = MockReq({ iv, salt, name, password: "foobar", updateKey: 1 });
        const badPassRes = MockRes();
        await updateHandler(badPass, badPassRes, null, instance);
        expect(badPassRes.status).toHaveBeenCalledWith(403);
        expect(badPassRes.json).toHaveBeenCalledWith({ iv: 1, salt: 1, message: ERRORMSG.INVALIDCREDENTIALS });

        //add invalid json test
    });
});