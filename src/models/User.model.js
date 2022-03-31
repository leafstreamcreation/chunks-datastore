const {Schema, model} = require("mongoose");

const userSchema = new Schema({
    credentials: { type: String, required: true, unique: true },
    token: { type: String, required: true, unique: true },
    updateKey: { type: Number, default: 1 },
    data: { type: String, default: "" },
});

const User = model("User", userSchema);

module.exports = User;