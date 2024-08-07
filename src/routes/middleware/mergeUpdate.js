const { keyBy } = require("lodash");

module.exports = (userGroupsSettingsAndActivities, update) => {
    const [ settings, groups, activities] = JSON.parse(JSON.stringify(userGroupsSettingsAndActivities))
    const newActivities = keyBy(activities, "id");
    const newGroups = keyBy(groups, "id");
    let newSettings = settings;
    update.forEach(command => {
        const { op, id, val } = command;
        if (op === 3) newActivities[`${val.id}`] = val;
        else if (op === 1) delete newActivities[`${id}`];
        else if (op === 2) {
            let index = newActivities[`${id}`].history.length - 1;
            if ("name" in val) newActivities[`${id}`].name = val.name;
            if ("history" in val && val.history.length > 0) {
                const times = val.history;
                const currentEntry = newActivities[`${id}`].history[index];
                if ("startDate" in currentEntry) {
                    newActivities[`${id}`].history[index].endDate = times.shift();
                    newActivities[`${id}`].history.push({});
                    index += 1;
                }
                times.forEach(time => {
                    const currentEntry = newActivities[`${id}`].history[index];
                    if ("startDate" in currentEntry) {
                        newActivities[`${id}`].history[index].endDate = time;
                        newActivities[`${id}`].history.push({});
                        index += 1;
                    }
                    else newActivities[`${id}`].history[index].startDate = time;
                });
            }
        }
        else if (op === 6) newGroups[`${val.id}`] = val;
        else if (op === 4) {
            for (activity in Object.create(newActivities)) {
                if (activity.group === id) delete newActivities[`${activity.id}`];
            }
            delete newGroups[`${id}`];

        }
        else if (op === 5) {
            if ("name" in val) newGroups[`${id}`].name = val.name;
            if ("properties" in val) newGroups[`${id}`].properties = val.properties;

        }
        else if (op === 7) {
            //update user settings
            newSettings = val;
        }
    });
    return [newSettings, Object.values(newGroups), Object.values(newActivities)];
};