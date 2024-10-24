const express = require("express");
const userController = require("../controllers/userController");
const mindmapController = require("./../controllers/mindmapController");

const router = express.Router();
// Middleware to get user's profile by ID
router.use(mindmapController.getMyProfileById);

// Define routes for /Ride
router
  .route("/Mindmap")
  //   .get(mindmapController.getAllMindmaps)
  .post(mindmapController.createMindmap);
//   .patch(userController.updateUser)
//   .delete(userController.deleteUser);

router.route("/my-mindmaps").get(mindmapController.getMyMindmaps);

module.exports = router;
