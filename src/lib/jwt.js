import jwt from "jsonwebtoken";

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const expiresIn =
    Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000;

  const isProd = process.env.NODE_ENV === "production";

  const cookieOptions = {
    expires: new Date(expiresIn),
    httpOnly: true,
    sameSite: isProd ? "None" : "Lax", //  Lax is allowed over HTTP
    secure: isProd, //  only secure in production (HTTPS)
  };

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    user,
    expiresIn,
  });
};

export { createSendToken };
