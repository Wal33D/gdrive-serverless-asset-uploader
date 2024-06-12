/**
 * This function generates an HTML response for GET requests.
 * It extracts a 'name' query parameter from the request, capitalizes the first letter,
 * and incorporates it into the HTML content. If the 'name' parameter is not provided,
 * a default title without a name is used for the page's title and H1 element on the DOM.
 *
 * @param {object} request - The incoming Vercel request object.
 * @param {object} response - The Vercel response object.
 * @returns {string} - The generated HTML content.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { capitalize } from '../utils/capitalize';

export const handleGetRequest = async ({ request, response }: { request: VercelRequest, response: VercelResponse }): Promise<void> => {
    const { name } = request.query;
    const userName = Array.isArray(name) ? name[0] : name || '';
    const pageTitle = userName ? `Hello ${capitalize(userName)}!` : 'Node.js Serverless Function²';

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${pageTitle}</title>
            <link rel="icon" href="https://assets.vercel.com/image/upload/front/favicon/vercel/favicon.ico" type="image/x-icon">
            <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
            <style>
                @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css');
                
                body {
                    font-family: Arial, sans-serif;
                    background-color: #121212;
                    color: #e0e0e0;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                }
                .custom-container {
                    text-align: center;
                    background: #1e1e1e;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
                    margin: 10px;
                }
                h1 {
                    color: #bb86fc;
                }
                p {
                    color: #b0bec5;
                }
                .online-indicator {
                    position: absolute;
                    top: 20px;
                    right: 35px;
                    width: 10px;
                    height: 10px;
                    background-color: #00e676;
                    border-radius: 50%;
                }
                .footer {
                    margin-top: 20px;
                    font-size: 0.9em;
                }
                .code {
                    background: #333;
                    padding: 2px 5px;
                    border-radius: 3px;
                    color: #76ff03;
                }
                .link {
                    margin-top: 20px;
                    font-size: 1em;
                    color: #b0bec5;
                }
                .github-icon {
                    margin-right: 5px;
                    color: #76ff03;
                }
                .link a {
                    color: #76ff03;
                    text-decoration: none;
                }
                .link a:hover {
                    text-decoration: underline;
                }
                .example {
                    font-size: 0.9em;
                    color: #b0bec5;
                }
                .example h2 {
                    color: #bb86fc;
                }
                pre {
                    color: #e0e0e0; /* Lighten the text color for better visibility */
                    background: #333; /* Dark background for contrast */
                    padding: 10px;
                    border-radius: 5px;
                    overflow-x: auto;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="row">
                    <div class="col-12 col-md-8 mx-auto">
                        <div class="custom-container">
                            <span class="online-indicator"></span>
                            <h1>${pageTitle}</h1>
                            <p>Explore our features and enjoy your stay. 😊</p>
                            <div class="footer">
                                <p>✅ This is where a <strong>200 Request</strong> to <code class="code">/</code> using our <code class="code">vercel.json</code> rewrites produces.</p>
                                <p>🔄 <strong>PUT</strong> and <strong>POST</strong> requests go to other functions in the <code class="code">functions</code> directory.</p>
                                <p>🗂️ These are chosen by the serverless handler <code class="code">ts</code> file in the <code class="code">api/</code> directory.</p>
                            </div>
                            <p class="link">
                                <i class="fa fa-github github-icon"></i> Check out the code on GitHub:
                                <br>
                                <a href="https://github.com/Wal33D/serverless-vercel-function-enhanced.git" target="_blank">https://github.com/Wal33D/serverless-vercel-function-enhanced.git</a>
                            </p>
                        </div>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-12 col-md-8 mx-auto">
                        <div class="custom-container">
                            <h2>Example Requests:</h2>
                            <p>GET Request: <code class="code">This is the current page you are viewing</code></p>
                            <p>PUT Request: <code class="code">curl -X PUT "https://vercel.demo.function.serverless.aquataze.com/?name=Stan"</code></p>
                            <p>Response: <pre>{"status":true,"message":"Hello Stan! PUT request handled successfully","method":"PUT"}</pre></p>
                            <p>POST Request: <code class="code">curl -X POST "https://vercel.demo.function.serverless.aquataze.com/?name=Stan"</code></p>
                            <p>Response: <pre>{"status":true,"message":"Hello Stan! POST request handled successfully","method":"POST"}</pre></p>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    response.setHeader('Content-Type', 'text/html');
    response.send(htmlContent);
};
