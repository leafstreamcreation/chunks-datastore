const {Schema, model} = require("mongoose");
const ObjectId = Schema.Types.ObjectId;

const activitySchema = new Schema({
    details: { type: Buffer, required: true },
    group: { type: Buffer, required: true },
    history: { type: [ObjectId], required: true }
});

const Activity = model("Activity", activitySchema);

module.exports = Activity;