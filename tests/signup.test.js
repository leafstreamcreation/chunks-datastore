const { MockDB, MockReq, MockRes } = require("./remote-storage-utilities");
const { signupHandler: signup } = require("../src/routes/index");
const { ERRORMSG } = require("../src/errors");

describe("Spec for signup route", () => {
  
    test("signup with valid invitation and credentials returns userId, json data, and nextUpdateKey", async () => {
        const expires = new Date(Date.now() + 1000 * 60 * 30);
        const codeHash = "ABCD";
        const invitations = [
            { codeHash: "WXYZ", expires  },
            { codeHash, expires }
        ];
        const instance =  MockDB({ invitations });
        const name = "RacquelettaMoss";
        const password = "secret123";
        const req = MockReq({ codeHash, name, password });
        const res = MockRes();
        
        const invitation2 = { _id: 2, codeHash, expires };
        expect(instance.invitationModel.invitations[1]).toEqual(invitation2);
        expect(instance.invitationModel.invitations.length).toBe(2);
    
        await signup(req, res, null, instance);
        const signupResponse = { _id: 1, activities: [], updateKey: 1 };
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(signupResponse);

        const newUser = { _id: 1, name, credentials: name + password, data: [], updateKey: 1 };
        expect(instance.userModel.users["1"]).toEqual(newUser);
        expect(instance.invitationModel.invitations[0]).toEqual({ _id: 1, codeHash: "WXYZ", expires });
        expect(instance.invitationModel.invitations.length).toBe(1);

        expect(req.ciphers.credentials).toHaveBeenCalledWith(name, password);
        expect(req.ciphers.compare).toHaveBeenCalled();
        expect(req.ciphers.reveal).toHaveBeenCalled();
    });

    test("login with invalid credentials returns errors", async () => {
        const expires = new Date(Date.now() + 1000 * 60 * 30);
        const codeHash = "ABCD";
        const invitations = [
            { codeHash: "WXYZ", expires  },
            { codeHash, expires }
        ];
        const name = "RacquelettaMoss";
        const password = "secret123";
        const users = [ { name, password }];
        
        const instance =  MockDB({ invitations, users });

        const nohash = MockReq({ name, password });
        const nohashRes = MockRes();
        await signup(nohash, nohashRes, null, instance);
        expect(nohashRes.status).toHaveBeenCalledWith(400);
        expect(nohashRes.json).toHaveBeenCalledWith(nohashResult);


        const noname = MockReq({ codeHash, password });
        const nonameRes = MockRes();
        await signup(noname, nonameRes, null, instance);
        expect(nonameRes.status).toHaveBeenCalledWith(400);
        expect(nonameRes.json).toHaveBeenCalledWith(noNameResult);


        const nopass = MockReq({ codeHash, name });
        const nopassRes = MockRes();
        await signup(nopass, nopassRes, null, instance);
        expect(nopassRes.status).toHaveBeenCalledWith(400);
        expect(nopassRes.json).toHaveBeenCalledWith(nohashResult);


        const badhash = MockReq({ codeHash: "BEEF", name, password });
        const badhashRes = MockRes();
        await signup(badhash, badhashRes, null, instance);
        expect(badhashRes.status).toHaveBeenCalledWith(403);
        expect(badhashRes.json).toHaveBeenCalledWith(nohashResult);


        const badcreds = MockReq({ codeHash, name, password });
        const badcredsRes = MockRes();
        await signup(badcreds, badcredsRes, null, instance);
        expect(badcredsRes.status).toHaveBeenCalledWith(403);
        expect(badcredsRes.json).toHaveBeenCalledWith(nohashResult);


        const dbInvitations = [
            { _id:1, codeHash: "WXYZ", expires  },
            { _id:2, codeHash, expires }
        ];
        expect(instance.invitationModel.invitations).toEqual(dbInvitations);
        expect(Object.values(instance.userModel.users).length).toBe(0);
    });
});