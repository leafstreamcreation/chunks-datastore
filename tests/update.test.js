const { MockDB, MockReq, MockRes } = require("./remote-storage-utilities");
const { updateHandler } = require("../src/routes/index");
const { ERRORMSG } = require("../src/errors");

describe("Spec for update route", () => {
  
    test("update (signed in) with valid updateKey and update writes to user data, clears waitlist", async () => {
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const instance =  MockDB({ users });

        const update = [
            { op: 1, val: { _id: 1, name: "squashing", history: [{}], group: 0 }}
        ];

        const loginRes = MockRes();
        const mockLoginPayload = {};
        const req = MockReq({ update }, { _id: 2, userModel: instance.userModel }, 1, { "2": { res: loginRes, payload: mockLoginPayload, expireId: 1 } });
        const res = MockRes();
        
        const user2Data = [];
        expect(instance.userModel.users["2"].updateKey).toBe(1);
        expect(instance.userModel.users["2"].data).toEqual(user2Data);
        expect(req.app.locals.waitingUsers["2"].login).toEqual({ res: loginRes, payload: mockLoginPayload, expireId: 1 });


        await updateHandler(req, res, null, instance);
        expect(instance.userModel.users["2"].updateKey).toBe(2);
        expect(instance.userModel.users["2"].data).toEqual([update[0].val]);

        const updateResult = { updateKey: 2 };
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(updateResult);

        expect(req.ciphers.reveal).not.toHaveBeenCalled();
        expect(req.ciphers.obscure).toHaveBeenCalledWith(instance.userModel.users["2"]);
        expect(req.user.push).toHaveBeenCalledWith([], update);
        expect("2" in req.app.locals.waitingUsers).toBe(false);
        
        expect(loginRes.status).toHaveBeenCalledWith(200);
        expect(loginRes.json).toHaveBeenCalledWith(mockLoginPayload);

    });
  
    test("update (signed in) without body blocks logins", async () => {
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const instance =  MockDB({ users });

        const req = MockReq({}, { _id: 2, userModel: instance.userModel }, 1, {});
        const res = MockRes();
        
        expect("2" in req.app.locals.waitingUsers).toBe(false);
        
        await updateHandler(req, res, null, instance);
        
        expect("2" in req.app.locals.waitingUsers).toBe(true);
        expect("expireId" in req.app.locals.waitingUsers["2"]).toBe(true);
        expect("login" in req.app.locals.waitingUsers["2"]).toBe(false);

        expect(instance.userModel.users["2"].updateKey).toBe(1);
        
        const updateResult = { listening: true };
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(updateResult);

        expect(req.ciphers.reveal).not.toHaveBeenCalled();
        expect(req.ciphers.obscure).not.toHaveBeenCalled();
        expect(req.user.push).not.toHaveBeenCalled();
    });

    test("update (signed in) without body while awaiting update returns cache update", async () => {
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const instance =  MockDB({ users });

        const req = MockReq({}, { _id: 2, userModel: instance.userModel }, 1, { "2": {}});
        const res = MockRes();
        
        expect("2" in req.app.locals.waitingUsers).toBe(true);
        
        await updateHandler(req, res, null, instance);
        
        const updateResult = { tryLater: true };
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(updateResult);

        expect(req.ciphers.reveal).not.toHaveBeenCalled();
        expect(req.ciphers.obscure).not.toHaveBeenCalled();
        expect(req.user.push).not.toHaveBeenCalled();
    });

    test("update (signed in) with invalid updateKey returns self destruct", async () => {
        const password = "foo";
        const name = "user2";
        const users = [
            { name: "user1", password },
            { name, password }
        ];
        const instance =  MockDB({ users });

        const req = MockReq({}, { _id: 2, userModel: instance.userModel }, 2, {});
        const res = MockRes();
        
        expect(instance.userModel.users["2"].updateKey).toBe(1);
        
        await updateHandler(req, res, null, instance);

        expect(instance.userModel.users["2"].updateKey).toBe(1);
        
        const updateResult = { selfDestruct: true };
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(updateResult);

        expect(req.ciphers.reveal).not.toHaveBeenCalled();
        expect(req.ciphers.obscure).not.toHaveBeenCalled();
        expect(req.user.push).not.toHaveBeenCalled();
    });
});