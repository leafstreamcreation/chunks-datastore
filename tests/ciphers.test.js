require("dotenv/config");
const User = require("../src/models/User.model");

const addCryptoFunctions = require("../src/routes/middleware/ciphers");
const { ERRORMSG } = require("../src/errors");


describe("Spec for crypto functions", () => {
    
    test("revealActivities and obscureActivities reverse each other", async () => {
        const x = await require("../src/db");
        const req = {};
        const next = () => {};
        addCryptoFunctions(req, null, next);

        const newUser = { token: "Test1", credentials: "TestPass1", updateKey: 1 };
        const emptyData = req.ciphers.obscureActivities([], "Test1", 1);
        newUser.data = emptyData;
        const emptyActsUser = await User.create(newUser);
        const later = await User.findById(emptyActsUser._id).exec();
        const emptyActsResult = req.ciphers.revealActivities("Test1", later);
        await User.findByIdAndDelete(emptyActsUser._id).exec();
        expect(emptyActsResult).toEqual([]);
        
        
        const activities = [
            { id: 1, name: "running", history: [{}], group: 0 },
            { id: 2, name: "biking", history: [{}], group: 0 }
        ];
        const newUser2 = { token: "Test", credentials: "TestPass", updateKey: 1 };
        const data = req.ciphers.obscureActivities(activities, "Test", 1);
        newUser2.data = data;
        const user = await User.create(newUser2);
        const after = await User.findById(user._id).exec();
        const result = req.ciphers.revealActivities("Test", after);
        await User.findByIdAndDelete(user._id).exec();
        x.connections[0].close();

        expect(result).toEqual(activities);
    });
    
    test("revealToken decrypts a token encrypted by tokenGen; tokenGen also returns the literal token", () => {
        const req = {};
        const next = () => {};
        addCryptoFunctions(req, null, next);
        const mutator = (x) => x;

        const name = "Derek";
        const [literal, token] = req.ciphers.tokenGen(name, mutator);
        expect(literal).toBe(name);
        const tokenOut = req.ciphers.revealToken({ token }, name );
        expect(tokenOut).toBe(name);

    });

});