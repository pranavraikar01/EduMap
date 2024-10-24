const Mindmap = require("./../models/mindmapModels");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const jwt = require("jsonwebtoken");
const User = require("./../models/userModels");

exports.getMyProfileById = catchAsync(async (req, res, next) => {
  const token = req.headers["x-access-token"];

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`ride controller ${data}`);
    req.user = data.id;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ status: "error", error: "Invalid token" });
  }
});
exports.createMindmap = catchAsync(async (req, res, next) => {
  console.log(`This is req.user: ${req.user}`); // Should print the user ID
  console.log(`This is req.body: ${req.body.description}`); // Should print the user ID

  const mindmap = await Mindmap.create({
    user: req.user, // This should now have the authenticated user ID
    date: req.body.date,
    mindmapObject: req.body.mindmapObject,
    description: req.body.description,
  });

  res.status(201).json({
    success: true,
    mindmap,
  });
});
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params; // Assuming you pass the userId as a parameter
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      status: "ok",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
// exports.getAllMindmaps = catchAsync(async (req, res, next) => {
//   const mindmaps = await Mindmap.find(); // Fetch all mind maps from the database

//   res.status(200).json({
//     success: true,
//     results: mindmaps.length, // Number of mind maps retrieved
//     data: {
//       mindmaps,
//     },
//   });
// });

exports.getMyMindmaps = async (req, res) => {
  try {
    const userId = req.user; // Assuming the authenticated user's ID is available in req.user
    const mindmaps = await Mindmap.find({ user: userId }).exec(); // Fetch all mind maps by the user

    // Define a function to fetch user details by user ID
    const getUserDetails = async (userId) => {
      const user = await User.findById(userId);
      return user;
    };

    // Iterate through each mind map and fetch user details
    for (const mindmap of mindmaps) {
      const userDetails = await getUserDetails(mindmap.user); // Fetch user details for each mind map
      mindmap.userDetails = userDetails; // Append user details to the mind map
    }

    res.json({
      status: "ok",
      data: {
        mindmaps, // Return mind maps with appended user details
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
