const User = require("../src/models/User.model");

const addCryptoFunctions = require("../src/routes/middleware/ciphers");
const { ERRORMSG } = require("../src/errors");


describe("Spec for crypto functions", () => {
    
    test("reveal and obscure reverse each other", async () => {
        const x = await require("../src/db");
        const req = {};
        const next = () => {};
        addCryptoFunctions(req, null, next);

        const TESTUSER = { name: "Test", credentials: "TestPass", updateKey: 1 };

        const copy1 = {...TESTUSER};
        const emptyData = req.ciphers.obscure([], copy1);
        copy1.data = emptyData;
        const emptyActsUser = await User.create(copy1);
        const later = await User.findById(emptyActsUser._id).exec();
        const emptyActsResult = req.ciphers.reveal(later);
        await User.findByIdAndDelete(emptyActsUser._id).exec();
        expect(emptyActsResult).toEqual([]);
        
        
        const activities = [
            { id: 1, name: "running", history: [{}], group: 0 },
            { id: 2, name: "biking", history: [{}], group: 0 }
        ];
        const copy2 = {...TESTUSER};
        const data = req.ciphers.obscure(activities, copy2);
        copy2.data = data;
        const user = await User.create(copy2);
        const after = await User.findById(user._id).exec();
        const result = req.ciphers.reveal(after);
        await User.findByIdAndDelete(user._id).exec();
        x.connections[0].close();

        expect(result).toEqual(activities);
    });

});