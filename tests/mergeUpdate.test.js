const mergeUpdate = require("../src/routes/middleware/mergeUpdate");

const { ERRORMSG } = require("../src/errors");

describe("Spec for parsing updates from clients", () => {
  
    test("create activity", () => {
        const emptyActivities = [];
        const notEmptyActivities = [ { id: 1 } ];
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
        const createNotEmpty = mergeUpdate(generateData(notEmptyActivities), command);
        expect(createNotEmpty).toEqual(generateData([
            { id: 1 },
            { id: 2 },
            { id: 3 }
        ]));
    });
  //todo write and pass remaining tests
    test("delete activity", () => {
        const someActivities = [
            { id: 1 },
            { id: 2 },
            { id: 3 },
        ];
        const command = [
            { op: 1, id: 3 },
            { op: 1, id: 1 }
        ];
        const generateData = (activities) => ["foo", [], activities];

        const deletedData = mergeUpdate(generateData(someActivities), command);
        expect(deletedData).toEqual(generateData([
            { id: 2 },
        ]));
    });
  
    test("update activity", () => {
        const activitiesToUpdate = [
            { id: 1, name: "sleep", history: [{}], group: 0 },
            { id: 2, name: "eat", history: [{}], group: 0 },
            { id: 3, name: "fuck", history: [{ startDate: 6 }], group: 0 },
        ];
        const command = [
            { op: 2, id: 3, val: { name: "fuuuuck", history: [1,2,3,4,5] } },
            { op: 2, id: 1, val: { name: "snooze" } },
            { op: 2, id: 2, val: { history: [1,2,3,4,5] } }
        ];
        const generateData = (activities) => ["foo", [], activities];

        const updatedData = mergeUpdate(generateData(activitiesToUpdate), command);
        expect(updatedData).toEqual(generateData([
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
        ]));
    });

    test("create group", () => {
        const emptyGroups = [];
        const notEmptyGroups = [ { id: 1 } ];
        const command = [
            { op: 6, val: { id: 3 } },
            { op: 6, val: { id: 2 } }
        ];
        const generateData = (groups) => ["foo", groups, []];

        const createEmpty = mergeUpdate(generateData(emptyGroups), command);
        expect(createEmpty).toEqual(generateData([
            { id: 2 },
            { id: 3 }
        ]));
        const createNotEmpty = mergeUpdate(generateData(notEmptyGroups), command);
        expect(createNotEmpty).toEqual(generateData([
            { id: 1 },
            { id: 2 },
            { id: 3 }
        ]));
    });

    test("delete group", () => {
        const mixedGroups = [
            { id: 1 },
            { id: 2 },
            { id: 3 },
        ];
        const mixedActivities = [
            { id: 1, group: 3 },
            { id: 2, group: 2 },
            { id: 3, group: 3 },
            { id: 4, group: 2 },
        ];
        const command = [
            { op: 4, id: 3 },
            { op: 4, id: 1 }
        ];
        const generateData = (groups, activities) => ["foo", groups, activities];

        const deletedData = mergeUpdate(generateData(mixedGroups, mixedActivities), command);
        expect(deletedData).toEqual(generateData([
            { id: 2 },
        ], [
            { id: 2, group: 2 },
            { id: 4, group: 2 },
        ]));
    });

    test("update group", () => {
        const groupsToUpdate = [
            { id: 1, name: "Home Chores", properties: "foo" },
            { id: 2, name: "Activities in San Diego", properties: "foo" },
            { id: 3, name: "Meals", properties: "foo" },
        ];
        const command = [
            { op: 5, id: 3, val: { name: "Stuff at Home" } },
            { op: 5, id: 2, val: { properties: "bar" } },
            { op: 5, id: 1, val: { name: "FOOOOD", properties: "some JSON" } },
        ];
        const generateData = (groups) => ["foo", groups, []];

        const updatedData = mergeUpdate(generateData(groupsToUpdate), command);
        expect(updatedData).toEqual(generateData([
            { id: 1, name: "FOOOOD", properties: "some JSON" },
            { id: 2, name: "Activities in San Diego", properties: "bar" },
            { id: 3, name: "Stuff at Home", properties: "foo" },
        ]));
    });

    test("update settings", () => {
        const data = ["foo", [], []];
        const command = [
            { op: 7, val: "bar" },
        ];

        const updatedData = mergeUpdate(data, command);
        expect(updatedData).toEqual([
            "bar",
            [],
            [],
        ])
    });
});