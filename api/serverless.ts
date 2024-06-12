import type { VercelRequest, VercelResponse } from '@vercel/node';

import { handleGetRequest } from '../functions/handleGetRequest';
import { handlePutRequest } from '../functions/handlePutRequest';
import { handlePostRequest } from '../functions/handlePostRequest';

/**
 * Serverless Function Handler
 *
 * This file handles incoming HTTP requests using Vercel's serverless functions. It routes
 * the requests to the appropriate handler based on the HTTP method (GET, PUT, POST, DELETE,
 * PATCH, OPTIONS, HEAD). If a method is not explicitly handled, a JSON response is returned
 * indicating the request type for safe handling of unsupported methods.
 *
 * Handlers:
 * - GET: handleGetRequest
 * - PUT: handlePutRequest
 * - POST: handlePostRequest
 * - DELETE, PATCH, OPTIONS, HEAD: handleDefaultRequest (returns JSON response logging the request type)
 *
 * The handlers are expected to return a Promise<void> and handle the response accordingly.
 *
 * @param {VercelRequest} request - The incoming Vercel request object.
 * @param {VercelResponse} response - The Vercel response object.
 * @returns {Promise<void>} - The response is sent directly by the handler.
 */

type MethodHandlers = {
    [key in 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD']: (params: { request: VercelRequest, response: VercelResponse }) => Promise<void>;
};

const handleDefaultRequest = async ({ request, response }: { request: VercelRequest, response: VercelResponse }): Promise<void> => {
    response.status(200).json({
        status: true,
        message: `Request method ${request.method} received and logged.`,
        method: request.method,
    });
};

const methodHandlers: MethodHandlers = {
    GET: handleGetRequest,
    PUT: handlePutRequest,
    POST: handlePostRequest,
    DELETE: handleDefaultRequest,
    PATCH: handleDefaultRequest,
    OPTIONS: handleDefaultRequest,
    HEAD: handleDefaultRequest,
};

const handler = async (request: VercelRequest, response: VercelResponse) => {
    try {
        const method = request.method as keyof MethodHandlers;

        if (method in methodHandlers) {
            return methodHandlers[method]({ request, response });
        }

        response.status(405).json({
            status: false,
            message: `Method ${request.method} not allowed`,
        });
    } catch (error: any) {
        response.status(500).json({
            status: false,
            message: `Error: ${error.message}`,
        });
    }
};

export default handler;
