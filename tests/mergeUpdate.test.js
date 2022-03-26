const mergeUpdate = require("../src/routes/middleware/mergeUpdate");

const { MockDB, MockReq, MockRes } = require("./remote-storage-utilities");
const { loginHandler: login } = require("../src/routes/index");
const { ERRORMSG } = require("../src/errors");

describe("Spec for parsing updates from clients", () => {
  
    test("create", async () => {
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
    });
  
    test("update", async () => {
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
    });
  
    test("delete", async () => {
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
    });
  
    test("combinations", async () => {
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
    });
  
    test("errors", async () => {
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
    });


});