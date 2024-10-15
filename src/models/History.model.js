const {Schema, model} = require("mongoose");

const historySchema = new Schema({
    details: { type: Buffer, required: true },
});

const History = model("History", historySchema);

module.exports = History;