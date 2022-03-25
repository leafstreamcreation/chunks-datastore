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
        const req = MockReq({ update }, { _id: 2, userModel: instance.userModel }, 1, { "2": { res: loginRes, payload: mockLoginPayload } });
        const res = MockRes();
        
        const user2Data = [];
        expect(instance.userModel.users["2"].updateKey).toBe(1);
        expect(instance.userModel.users["2"].data).toBe(user2Data);
        expect(req.app.locals.waitingUsers["2"]).toBe({ res: loginRes, payload: mockLoginPayload });


        await updateHandler(req, res, null, instance);
        expect(instance.userModel.users["2"].updateKey).toBe(2);
        expect(instance.userModel.users["2"].data).toEqual([update[0].val]);

        const updateResult = { updateKey: 2 };
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(updateResult);

        expect(req.ciphers.reveal).toHaveBeenCalledWith(instance.userModel.users["2"]);
        expect(req.ciphers.obscure).toHaveBeenCalledWith([update[0].val]);
        expect(req.user.push).toHaveBeenCalledWith([], update);
        expect(req.app.locals.waitingUsers["2"]).toBe(undefined);
        
        expect(loginRes.status).toHaveBeenCalledWith(200);
        expect(loginRes.json).toHaveBeenCalledWith(mockLoginPayload);

    });
});