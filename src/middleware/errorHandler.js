export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Something went wrong",
    details: err.details || null
  });
}
