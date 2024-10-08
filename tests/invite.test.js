require("dotenv/config");
const { MockDB, MockReq, MockRes } = require("./remote-storage-utilities");
const { inviteHandler: invite } = require("../src/routes/index");
const { ERRORMSG } = require("../src/errors");

describe("Spec for invite route", () => {
  
    test("invite with ticket text and valid password creates an invitation", async () => {
        const iv = 1;
        const salt = 1;
        const expires = new Date(Date.now() + 1000 * 60 * 30);
        const x = "ABCD";
        const invitations = [
            { ticket:x, expires }
        ];
        const password = "secret123"
        const instance =  MockDB({ state:password, invitations });
        
        const ticket = "PIGS";

        const req = MockReq({ iv, salt, password, ticket });
        const res = MockRes();
        
        expect(instance.invitationModel.invitations.length).toBe(1);
        expect(instance.invitationModel.invitations[0]).toEqual({ _id: 1, codeHash: x, expires });
        
        await invite(req, res, null, instance);
        const endTime = Date.now();
        expect(res.status).toHaveBeenCalledWith(200);
        
        expect(instance.invitationModel.invitations.length).toBe(2);
        const expected = { _id: 2, codeHash: ticket };
        const { _id, codeHash, expires:expire } = instance.invitationModel.invitations[1];
        expect(_id).toBe(expected._id);
        expect(codeHash).toBe(expected.codeHash);
        const deviation = Math.abs(1 - (expire.getTime() / endTime));
        expect(deviation).toBeCloseTo(0, 0);

        expect(req.ciphers.revealInbound).toHaveBeenCalledWith(password, process.env.PASSWORD_KEY);
        expect(req.ciphers.revealInbound).toHaveBeenCalledWith(ticket, process.env.TICKET_KEY);
        expect(req.ciphers.credentials).toHaveBeenCalledWith(ticket);
    });

    test("invite with invalid credentials returns errors", async () => {
      const iv = 1;
      const salt = 1;
      const expires = new Date(Date.now() + 1000 * 60 * 30);
      const ticket = "PIGS";
      const invitations = [
          { ticket, expires }
      ];
      const password = "secret123"
      const instance =  MockDB({ state:password, invitations });

      const nopass = MockReq({ iv, salt, password: null, ticket });
      const noPassRes = MockRes();
      await invite(nopass, noPassRes, null, instance);
      expect(noPassRes.status).toHaveBeenCalledWith(400);
      expect(noPassRes.json).toHaveBeenCalledWith({ iv: 1, salt: 1, message: ERRORMSG.MISSINGPASSWORD });
      
      const noticket = MockReq({ iv, salt, password, ticket: null });
      const noticketRes = MockRes();
      await invite(noticket, noticketRes, null, instance);
      expect(noticketRes.status).toHaveBeenCalledWith(400);
      expect(noticketRes.json).toHaveBeenCalledWith({ iv: 1, salt: 1, message: ERRORMSG.MISSINGTICKET });
      
      const badcreds = MockReq({ iv, salt, password: "mistake", ticket });
      const badcredsRes = MockRes();
      await invite(badcreds, badcredsRes, null, instance);
      expect(badcredsRes.status).toHaveBeenCalledWith(403);
      expect(badcredsRes.json).toHaveBeenCalledWith({ iv: 1, salt: 1, message: ERRORMSG.INVALIDCREDENTIALS });
      
      const ticketexists = MockReq({ iv, salt, password, ticket });
      const ticketexistsRes = MockRes();
      await invite(ticketexists, ticketexistsRes, null, instance);
      expect(ticketexistsRes.status).toHaveBeenCalledWith(403);
      expect(ticketexistsRes.json).toHaveBeenCalledWith({ iv: 1, salt: 1, message: ERRORMSG.TICKETEXISTS });

        const dbInvitations = [
            { _id:1, codeHash: ticket, expires },
        ];
        expect(instance.invitationModel.invitations).toEqual(dbInvitations);
    });
});