const mongoose = require("mongoose");
const { Schema } = mongoose;

const mindmapSchema = new Schema({
  user: {
    type: mongoose.Types.ObjectId,
    ref: "users",
  },
  mindmapObject: {
    type: Object, // This will store the actual mindmap as a JavaScript object
    required: true,
  },

  description: {
    type: String, // A brief description of the mindmap
    required: true, // This can be optional
  },
  date: {
    // data: Buffer,       // Store the image binary data
    // contentType: String, // Store the content type of the image (e.g., 'image/jpeg')
    type: String,
    required: false,
  },
});

const Mindmap = mongoose.model("Mindmap", mindmapSchema);

module.exports = Mindmap;
// module.exports = mongoose.model("rides", RideSchema);
