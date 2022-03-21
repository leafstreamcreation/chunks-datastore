const {Schema, model} = require("mongoose");

const userSchema = new Schema({
    name: { type: String, required: true },
    credentials: { type: String, required: true, unique: true },
    data: { type: String, required: true },
});

const User = model("User", userSchema);

module.exports = User;