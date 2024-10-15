const {Schema, model} = require("mongoose");
const ObjectId = Schema.Types.ObjectId;

const userDataSchema = new Schema({
    details: { type: Buffer, required: true },
    groups: { type: [Buffer], required: true },
    activities: { type: [ObjectId], required: true }
});

const UserData = model("UserData", userDataSchema);

module.exports = UserData;