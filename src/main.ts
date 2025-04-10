import dotenv from 'dotenv';
import { server } from './server';
import express from 'express';
import { VerifierClient } from '@empe/verifier-client';
import { verifierClientConfiguration } from './verifier';

dotenv.config();

const app = express();
export const verifierClient = new VerifierClient(app, verifierClientConfiguration);
verifierClient.initialize()

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.listen(PORT, () => console.log(`verifier client running at http://localhost:${PORT}`));

const SSE_PORT = process.env.SSE_PORT ? parseInt(process.env.SSE_PORT) : 8080;
server.start({
    transportType: "sse",
    sse: {
        endpoint: "/sse",
        port: SSE_PORT,
    },
}).catch((err) => console.error(err));