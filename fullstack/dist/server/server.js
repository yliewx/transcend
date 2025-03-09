"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const static_1 = __importDefault(require("@fastify/static"));
const path_1 = require("path");
const db_1 = require("./db");
const routes_1 = require("./routes");
// Initialize database
(0, db_1.setupDbConnection)();
// Create Fastify server
const server = (0, fastify_1.default)({
    logger: true
});
// Register plugins to serve static files
server.register(static_1.default, {
    root: (0, path_1.join)(__dirname, '../../public'),
    prefix: '/'
});
// Register routes
(0, routes_1.registerRoutes)(server);
// Start server
const start = async () => {
    try {
        await server.listen({ port: 3000, host: '0.0.0.0' });
        console.log('Server listening at http://0.0.0.0:3000');
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map