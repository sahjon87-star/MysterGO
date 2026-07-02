import '../../src/server/cleanEnv.js';
import serverless from 'serverless-http';
import app from '../../src/server/app.js';

export const handler = serverless(app);
