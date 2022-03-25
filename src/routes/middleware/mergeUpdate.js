module.exports = (activities, update) => {
    const newActivities = JSON.parse(JSON.stringify(activities));
    update.forEach(command => {
        const { op, id, val } = command;
        if (op === 1) newActivities.push(val);
    });
    return newActivities;
}