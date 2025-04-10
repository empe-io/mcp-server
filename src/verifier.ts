import dotenv from 'dotenv';
import { VerifierConfiguration } from '@empe/verifier-client';

dotenv.config();

export const VERIFIER_CLIENT_URL = process.env.VERIFIER_CLIENT_URL || 'http://localhost:3000';
export const VERIFIER_SERVICE_URL = process.env.VERIFIER_SERVICE_URL || 'http://localhost:9004';
export const VERIFIER_SERVICE_API_KEY = process.env.VERIFIER_SERVICE_API_KEY || 'secret-key';

export const verifierClientConfiguration: VerifierConfiguration = {
    baseUrl: VERIFIER_CLIENT_URL,
    verifierServiceUrl: VERIFIER_SERVICE_URL,
    clientSecret: VERIFIER_SERVICE_API_KEY,
};