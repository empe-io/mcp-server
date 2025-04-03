import dotenv from 'dotenv';
import { VerifierConfiguration } from '@empe/verifier-client';

dotenv.config();

export const VERIFIER_BASE_URL = process.env.VERIFIER_BASE_URL || 'http://localhost:3000';
export const VERIFIER_BASE_URL_LOCAL = process.env.VERIFIER_BASE_URL_LOCAL || 'http://localhost:3000';
export const VERIFIER_SERVICE_URL = process.env.VERIFIER_SERVICE_URL || 'http://localhost:9004';
export const CLIENT_SECRET = process.env.CLIENT_SECRET || 'secret-key';

export const verifierClientConfiguration: VerifierConfiguration = {
    baseUrl: VERIFIER_BASE_URL,
    verifierServiceUrl: VERIFIER_SERVICE_URL,
    clientSecret: CLIENT_SECRET,
};