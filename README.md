# Node.js Serverless Function Enhanced Starter

This repository contains a simple Node.js serverless function setup with Vercel. It demonstrates handling different HTTP methods (GET, PUT, POST, DELETE, PATCH, OPTIONS, HEAD) using Vercel's serverless functions. This enhanced starter also includes examples of how to handle requests and provide appropriate responses.

## Features

- Handles multiple HTTP methods: GET, PUT, POST, DELETE, PATCH, OPTIONS, HEAD.
- Returns JSON responses for unsupported methods, indicating the request type.
- Demonstrates the use of TypeScript for type safety and modern JavaScript features.
- Includes example HTML content with Bootstrap for styling.

## Deployment

You can deploy this project using Vercel. Follow the instructions below to get started.

### One-Click Deploy

Deploy the example using Vercel, Import the repository as a 3rd Party Repo, and deploy the project 
 https://github.com/Wal33D/serverless-vercel-function-enhanced.git
### Clone and Deploy

1. Clone the repository:

```bash
git clone https://github.com/Wal33D/serverless-vercel-function-enhanced.git
```

2. Install the Vercel CLI:

```bash
npm i -g vercel
```

3. Run the app at the root of the repository:

```bash
vercel dev
```

## Function Handlers

### GET Request Handler

Generates an HTML response for GET requests, incorporating the 'name' query parameter into the page title and content.

### PUT Request Handler

Handles PUT requests, extracts the 'name' query parameter, and constructs a response message.

### POST Request Handler

Handles POST requests, extracts the 'name' query parameter, and constructs a response message.

### Default Handler

Handles unsupported methods (DELETE, PATCH, OPTIONS, HEAD) by returning a JSON response indicating the request type.

## Example Requests

Example requests to test the serverless function:

- GET Request: This is the current page you are viewing.
- PUT Request:

```bash
curl -X PUT "https://vercel.demo.function.serverless.aquataze.com/?name=Stan"
```

Response:

```json
{
  "status": true,
  "message": "Hello Stan! PUT request handled successfully",
  "method": "PUT"
}
```

- POST Request:

```bash
curl -X POST "https://vercel.demo.function.serverless.aquataze.com/?name=Stan"
```

Response:

```json
{
  "status": true,
  "message": "Hello Stan! POST request handled successfully",
  "method": "POST"
}
```

## Serverless Function Handler

```typescript
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
```

## Additional Configuration

Add this configuration in your `vercel.json` file:

```json
{
  "functions": {
    "api/serverless.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  },
  "rewrites": [
    { "source": "/", "destination": "/api/serverless" }
  ]
}
```