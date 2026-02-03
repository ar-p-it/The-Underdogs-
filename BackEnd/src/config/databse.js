const URI = "mongodb+srv://mainarpithoon_db_user:acv1e31GwefrJk99@cluster0.budupyw.mongodb.net/UnderDogs";

const mongoose = require("mongoose");
const connectDB = async () => {
  await mongoose.connect(URI);
};
module.exports = connectDB;

// JEUai6JpLj0xsxG3 // mainarpithoon_db_user module.exports = connectDB;
