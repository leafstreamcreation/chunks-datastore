const MockDB = require("./SchedulerTestUtilities");

const Scheduler = require("../../modules/scheduler/Scheduler");

const LinearSchedule = require("../../modules/scheduler/LinearSchedule");

describe("Scheduler tests; depends on LinearSchedule tests", () => {
  
    test("login with valid credentials creates a session", async () => {
        const password = "DEADBEEF";
        const instance = await MockDB({password});
        const req = MockReq(password);
        const res = MockRes();
    
        expect(instance.sessionModel.findOne().exec()).resolves.toBe(null);
    
        await loginHandler(req, res, null, instance);
        const approxExpireTime = Date.now() + 1000 * 60 * 60 * 24;
    
        const newSession = await instance.sessionModel.findOne().exec();
        expect(newSession).not.toBe(null);
        expect(newSession._id).toBe(1);
        const deviation = Math.abs(1 - (newSession.expires.getTime() / approxExpireTime));
        expect(deviation).toBeCloseTo(0, 0);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ session: newSession, leaseId: null });
    
      });
});