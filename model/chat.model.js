const mongoose = require('mongoose');
const chatschema = mongoose.Schema({
  userToken: {
    type: String,
    required: true
  },
  messages: [
    {
      from: {
        type: String,
        required: true
      },
      message: {
        type: String,
        required: true
      },
      time: {
        type: String,
        required: true
      }
    }
  ]
});

const chatmodel = mongoose.model("socket-chat-tokens", chatschema);
module.exports = {chatmodel};