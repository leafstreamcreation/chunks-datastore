const {Schema, model} = require("mongoose");
const ObjectId = Schema.Types.ObjectId;

const invitationSchema = new Schema({
    codeHash: { type: String, required: true },
    expires: { type: Date, required: true },
});
invitationSchema.index({expires: 1}, { expireAfterSeconds: 0 });

const Invitation = model("Invitation", invitationSchema);

module.exports = Invitation;