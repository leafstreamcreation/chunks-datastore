const {Schema, model} = require("mongoose");

const userSchema = new Schema({
    name: { type: String, required: true, unique: true },
    credentials: { type: String, required: true },
    updateKey: { type: Number, default: 1 },
    data: { type: String, default: "" },
});

const User = model("User", userSchema);

module.exports = User;