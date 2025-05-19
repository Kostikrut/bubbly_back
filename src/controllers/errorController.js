import AppError from "../utils/appError.js";

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;

  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;

  return new AppError(message, 400);
};

const handleJWTError = (err) =>
  new AppError("Invalid token, please log in again.", 401);

const handleExpiredJWTError = (err) =>
  new AppError(
    "Access token has expired, please log in again to get access.",
    401
  );

const sendErrorDev = (err, res) => {
  return res.status(err.statusCode).json({
    status: err.status,
    err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    // console.log(err.message);
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // for unknown errors in production - general error/not operational
  return res.status(500).json({
    status: "error",
    message: "Something went wrong",
  });
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") sendErrorDev(err, res);
  if (process.env.NODE_ENV === "production") {
    // let error = { ...err }; for some reasson i needed the shalow copy but i dont remember why. KEEP IT AS A FLAG COMMENT
    let error = err;

    if (err.code === 11000) error = handleCastErrorDB(error); //handle duplicate keys
    if (err.name === "CastError") error = handleCastErrorDB(error); //handle invalid id query
    if (err.name === "ValidationError") error = handleValidationErrorDB(error); // handle validation error
    if (err.name === "JsonWebTokenError") error = handleJWTError(error); // handle incorrect jwt
    if (err.name === "TokenExpiredError") error = handleExpiredJWTError(error); // handle expired jwt
    sendErrorProd(error, res);
  }

  next();
};

export default globalErrorHandler;
