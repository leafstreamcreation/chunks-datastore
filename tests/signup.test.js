const { MockDB, MockReq, MockRes } = require("./remote-storage-utilities");
const { signupHandler: signup } = require("../src/routes/index");
const { ERRORMSG } = require("../src/errors");

describe("Spec for signup route", () => {
  
    test("signup with valid invitation and credentials returns userId, json data, and nextUpdateKey", async () => {
        const expires = new Date(Date.now() + 1000 * 60 * 30);
        const ticket = "ABCD";
        const invitations = [
            { ticket: "WXYZ", expires  },
            { ticket, expires }
        ];
        const instance =  MockDB({ invitations });
        const name = "RacquelettaMoss";
        const password = "secret123";
        const req = MockReq({ ticket, name, password });
        const res = MockRes();
        
        const invitation2 = { _id: 2, codeHash: ticket, expires };
        expect(instance.invitationModel.invitations[1]).toEqual(invitation2);
        expect(instance.invitationModel.invitations.length).toBe(2);
        expect(Object.values(instance.userModel.users).length).toBe(0);
    
        await signup(req, res, null, instance);
        const signupResponse = { _id: 1, activities: [], updateKey: 1 };
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(signupResponse);

        const newUser = { _id: 1, name, credentials: name + password, data: [], updateKey: 1 };
        expect(instance.userModel.users["1"]).toEqual(newUser);
        expect(instance.invitationModel.invitations[0]).toEqual({ _id: 1, codeHash: "WXYZ", expires });
        expect(instance.invitationModel.invitations.length).toBe(1);

        expect(req.ciphers.compare).toHaveBeenCalled();
        expect(req.ciphers.credentials).toHaveBeenCalledWith(name, password);
        expect(req.ciphers.obscure).toHaveBeenCalledWith([], { name, updateKey: 1 });
    });

    test("signup with invalid credentials returns errors", async () => {
        const expires = new Date(Date.now() + 1000 * 60 * 30);
        const ticket = "ABCD";
        const invitations = [
            { ticket: "WXYZ", expires  },
            { ticket, expires }
        ];
        const name = "RacquelettaMoss";
        const password = "secret123";
        const users = [ { name, password }];
        
        const instance =  MockDB({ invitations, users });

        const nohash = MockReq({ ticket: null, name, password });
        const nohashRes = MockRes();
        await signup(nohash, nohashRes, null, instance);
        expect(nohashRes.status).toHaveBeenCalledWith(400);
        expect(nohashRes.json).toHaveBeenCalledWith(ERRORMSG.MISSINGTICKET);


        const noname = MockReq({ ticket, name: null, password });
        const nonameRes = MockRes();
        await signup(noname, nonameRes, null, instance);
        expect(nonameRes.status).toHaveBeenCalledWith(400);
        expect(nonameRes.json).toHaveBeenCalledWith(ERRORMSG.MISSINGUSERNAME);


        const nopass = MockReq({ ticket, name, password: null });
        const nopassRes = MockRes();
        await signup(nopass, nopassRes, null, instance);
        expect(nopassRes.status).toHaveBeenCalledWith(400);
        expect(nopassRes.json).toHaveBeenCalledWith(ERRORMSG.MISSINGPASSWORD);


        const badhash = MockReq({ ticket: "BEEF", name, password });
        const badhashRes = MockRes();
        await signup(badhash, badhashRes, null, instance);
        expect(badhashRes.status).toHaveBeenCalledWith(403);
        expect(badhashRes.json).toHaveBeenCalledWith(ERRORMSG.INVALIDTICKET);


        const badcreds = MockReq({ ticket, name, password });
        const badcredsRes = MockRes();
        await signup(badcreds, badcredsRes, null, instance);
        expect(badcredsRes.status).toHaveBeenCalledWith(403);
        expect(badcredsRes.json).toHaveBeenCalledWith({ ...ERRORMSG.INVALIDCREDENTIALS, ticketRefund: ticket });


        const dbInvitations = [
            { _id:1, codeHash: "WXYZ", expires  },
            { _id:2, codeHash: ticket, expires }
        ];
        expect(instance.invitationModel.invitations).toEqual(dbInvitations);
        expect(Object.values(instance.userModel.users).length).toBe(1);
    });
});