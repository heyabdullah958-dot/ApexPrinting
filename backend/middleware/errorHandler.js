function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  console.error('Unhandled Error:', err);
  
  const statusCode = (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600) 
    ? err.statusCode 
    : (typeof err.status === 'number' && err.status >= 400 && err.status < 600) 
      ? err.status 
      : 500;

  let errorMessage = err.message || 'Internal Server Error';
  if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE' || statusCode === 413) {
    errorMessage = 'The uploaded payload exceeds the allowable size limit (4.5MB). Please compress your files and try again.';
  }

  const userMessage = (process.env.NODE_ENV === 'production' && statusCode === 500)
    ? 'An unexpected error occurred while processing your request. Please try again later.'
    : errorMessage;

  res.status(statusCode).json({
    success: false,
    error: userMessage,
    message: userMessage,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

module.exports = errorHandler;
