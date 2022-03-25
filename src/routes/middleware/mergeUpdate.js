module.exports = (activities, update) => {
    update.forEach(command => {
        const { op, id, value } = command;
        if (op === 1) activities.push(value);
    });
    return activities;
}