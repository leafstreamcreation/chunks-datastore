const mergeUpdate = require("../src/routes/middleware/mergeUpdate");

const { ERRORMSG } = require("../src/errors");

describe("Spec for parsing updates from clients", () => {
  
    test("create activity", () => {
        const emptyActivities = [];
        const notEmptyData = [ { id: 1 } ];
        const command = [
            { op: 3, val: { id: 3 } },
            { op: 3, val: { id: 2 } }
        ];
        const generateData = (activities) => ["foo", [], activities];

        const createEmpty = mergeUpdate(generateData(emptyActivities), command);
        expect(createEmpty).toEqual(generateData([
            { id: 2 },
            { id: 3 }
        ]));
        const createNotEmpty = mergeUpdate(generateData(notEmptyData), command);
        expect(createNotEmpty).toEqual(generateData([
            { id: 1 },
            { id: 2 },
            { id: 3 }
        ]));
    });
  //todo write and pass remaining tests
    test("delete activity", () => {
        const data = [
            { id: 1 },
            { id: 2 },
            { id: 3 },
        ];
        const command = [
            { op: 1, id: 3 },
            { op: 1, id: 1 }
        ];

        const deletedData = mergeUpdate(data, command);
        expect(deletedData).toEqual([
            { id: 2 },
        ]);
    });
  
    test("update activity", () => {
        const data = [
            { id: 1, name: "sleep", history: [{}], group: 0 },
            { id: 2, name: "eat", history: [{}], group: 0 },
            { id: 3, name: "fuck", history: [{ startDate: 6 }], group: 0 },
        ];
        const command = [
            { op: 2, id: 3, val: { name: "fuuuuck", history: [1,2,3,4,5] } },
            { op: 2, id: 1, val: { name: "snooze" } },
            { op: 2, id: 2, val: { history: [1,2,3,4,5] } }
        ];

        const updatedData = mergeUpdate(data, command);
        expect(updatedData).toEqual([
            { id: 1, name: "snooze", history: [{}], group: 0 },
            { id: 2, name: "eat", history: [
                { startDate: 1, endDate: 2 },
                { startDate: 3, endDate: 4 },
                { startDate: 5 }
            ], group: 0 },
            { id: 3, name: "fuuuuck", history: [
                { startDate: 6, endDate: 1 },
                { startDate: 2, endDate: 3 },
                { startDate: 4, endDate: 5 },
                {}
            ], group: 0 }
        ]);
    });

    test("create group", () => {
        // const emptyData = [];
        // const notEmptyData = [ { id: 1 } ];
        // const command = [
        //     { op: 3, val: { id: 3 } },
        //     { op: 3, val: { id: 2 } }
        // ];

        // const createEmpty = mergeUpdate(emptyData, command);
        // expect(createEmpty).toEqual([
        //     { id: 2 },
        //     { id: 3 }
        // ]);
        // const createNotEmpty = mergeUpdate(notEmptyData, command);
        // expect(createNotEmpty).toEqual([
        //     { id: 1 },
        //     { id: 2 },
        //     { id: 3 }
        // ]);
    });

    test("delete group", () => {

    });

    test("update group", () => {

    });

    test("update settings", () => {

    });
});