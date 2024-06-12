/**
 * This function handles PUT requests.
 * It extracts a 'name' query parameter from the request, capitalizes the first letter,
 * and constructs a response message incorporating the name. If the 'name' parameter is not provided,
 * a default name 'World' is used.
 *
 * @param {object} request - The incoming Vercel request object.
 * @param {object} response - The Vercel response object.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { capitalize } from '../utils/capitalize';

export const handlePutRequest = async ({ request, response }: { request: VercelRequest, response: VercelResponse }): Promise<void> => {
    let status = false;
    let message = '';
    let method = 'PUT';

    try {
        const { name } = request.query;
        const userName = Array.isArray(name) ? name[0] : name || 'World';
        
        message = `Hello ${capitalize(userName)}! PUT request handled successfully`;
        status = true;
    } catch (error: any) {
        message = `Error handling PUT request: ${error.message}`;
    }

    response.json({
        status,
        message,
        method,
    });
};
