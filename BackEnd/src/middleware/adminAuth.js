// const adminAuth = (req, resp, next) => {
//   console.log("Check authh");
//   const token = "xyz";
//   const isauthorised = token === "xyz";
//   if (!isauthorised) {
//     req.send("ERROR");
//   } else {
//     console.log("Passing to next");
//     next();
//   }
// };
const jwt = require("jsonwebtoken");

const User = require("../models/user");

const userAuth = async (req, resp, next) => {
  try {
    const { token } = req.cookies || {};
    if (!token) {
      return resp.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // validate the token
    const decodedMessage = jwt.verify(token, "Arpitttt");
    const { _id } = decodedMessage;

    const userbyid = await User.findById(_id).select("-password");
    if (!userbyid) {
      return resp.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    req.user = userbyid;
    // console.log(userbyid);
    next();
    // resp.send(userbyid);
  } catch (err) {
    return resp.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};
module.exports = {
  // adminAuth,
  userAuth,
};
