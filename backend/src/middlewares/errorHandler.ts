import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const globalErrorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Default values
    let statusCode = 500;
    let status = 'error';
    let message = 'Internal Server Error';

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        status = err.status;
        message = err.message;
    } else if (err instanceof Error) {
        message = err.message;
    }

    // Development vs Production error response
    if (process.env.NODE_ENV === 'development') {
        res.status(statusCode).json({
            success: false,
            status,
            error: err,
            message,
            stack: err.stack
        });
    } else {
        // Production: don't leak stack traces
        if (err instanceof AppError && err.isOperational) {
            // Operational, trusted error: send message to client
            res.status(statusCode).json({
                success: false,
                status,
                message
            });
        } else {
            // Programming or other unknown error: don't leak details
            console.error('ERROR 💥', err);
            res.status(500).json({
                success: false,
                status: 'error',
                message: 'Something went very wrong!'
            });
        }
    }
};
