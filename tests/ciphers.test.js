require("dotenv/config");
const User = require("../src/models/User.model");
const UserData = require("../src/models/UserData.model");

const addCryptoFunctions = require("../src/routes/middleware/ciphers");
const { ERRORMSG } = require("../src/errors");

const req = { body: { iv: 1, salt: 1 }};
const next = () => {};
addCryptoFunctions(req, null, next);

describe("Spec for crypto functions", () => {

    test("inbound request without iv and salt returns unsecure request message", () => {
        const unsecureReq = {};
        const standardRes = { 
            status: jest.fn((s) => standardRes),
            json: jest.fn((j) => standardRes),
        }
        addCryptoFunctions(unsecureReq, standardRes, next);
        expect(standardRes.status).toHaveBeenCalledWith(400);
        expect(standardRes.json).toHaveBeenCalledWith({ message: ERRORMSG.UNSECUREREQUEST });
    });
    
    test("generateEntropy provides an IV and salt", () => {
        const entropy = req.ciphers.generateEntropy();
        expect(entropy).toHaveProperty('iv');
        expect(entropy).toHaveProperty('salt');
        expect(entropy.iv).toBeDefined();
        expect(entropy.salt).toBeDefined();
    });

    test("obscureUserData uses AES GCM", () => {

    });

    test("obscureUpdateKey uses AES GCM", () => {

    });

    test("exportUserData uses AES GCM", () => {

    });

    test("exportMessage uses AES GCM", () => {

    });

    test("revealInbound uses AES GCM", () => {

    });
    
    test("revealUserData and obscureUserData reverse each other", async () => {
        const x = await require("../src/db");

        const emptyData = req.ciphers.obscureUserData([], "Test1", 1);
        const newEmptyData = await UserData.create({ data: emptyData });
        const newUser = { token: "Test1", credentials: "TestPass1", data: newEmptyData._id, updateKey: 1 };
        const emptyActsUser = await User.create(newUser);
        const later = await User.findById(emptyActsUser._id).exec();
        const emptyId = later.data;
        const { data:laterEmptyData } = await UserData.findById(emptyId).exec();
        const popEmpty = { _id: later._id, credentials: later.credentials, token: later.token, data: laterEmptyData, updateArg: later.updateKey }
        const emptyActsResult = req.ciphers.revealUserData("Test1", popEmpty);
        await User.findByIdAndDelete(emptyActsUser._id).exec();
        await UserData.findByIdAndDelete(emptyId).exec();
        expect(emptyActsResult).toEqual([]);
        
        
        const startingData = [ "foo", [], [
            { id: 1, name: "running", history: [{}], group: 0 },
            { id: 2, name: "biking", history: [{}], group: 0 }
        ]];
        const data = req.ciphers.obscureUserData(startingData, "Test", 1);
        const newData = await UserData.create({ data });
        const newUser2 = { token: "Test", credentials: "TestPass", data:newData._id, updateKey: 1 };
        const user = await User.create(newUser2);
        const after = await User.findById(user._id).exec();
        const id = after.data;
        const { data:afterData } = await UserData.findById(id).exec();
        const pop = { _id: after._id, credentials: after.credentials, token: after.token, data: afterData, updateArg: after.updateKey }
        const result = req.ciphers.revealUserData("Test", pop);
        await User.findByIdAndDelete(user._id).exec();
        await UserData.findByIdAndDelete(id).exec();
        x.connections[0].close();

        expect(result).toEqual(startingData);
    });
    
    test("revealUpdateKey and obscureUpdateKey reverse each other", async () => {
        const x = await require("../src/db");

        const name = "Derek";
        const literal = 1;
        const { out } = req.ciphers.updateKeyGen(literal, name);
        const value = req.ciphers.revealKey(out, name);
        expect(value).toBe(1);
    });
});