////// THIS IS FOR THE CODE THAT IS SPECIFIC FOR THE EXPRESS.

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const mindmapRouter = require("./routes/mindmapRoutes");

const app = express();
app.use(cors());

//*** MIDDLEWARES FROM EXPRESS ***//
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
app.use(express.json());
app.use(express.static(`${__dirname}/public`));

// CUSTOM MIDDLEWARES :
app.use((req, res, next) => {
  console.log("Hello World from the middleware 👋🏻");
  next();
});

app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/mindmaps", mindmapRouter);

// Handling all the routes other then the defined one's :
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} in this server !!`, 404));
});

// GLOBAL ERROR HANDLING FUNCTION :
app.use(globalErrorHandler);

module.exports = app;
