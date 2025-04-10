# MCP Empe Server

This project is an MCP (Machine Context Protocol) Empe Server designed to interact with Empe Issuer and Verifier services for Self-Sovereign Identity (SSI) operations.

## What is an MCP Server?

MCP Servers are systems that provide context, tools, and prompts to AI clients. They expose data sources like files, documents, databases, and APIs to make them accessible to AI systems. This particular MCP server provides tools for interacting with Empe's SSI (Self-Sovereign Identity) ecosystem.

## Prerequisites

Before setting up this MCP server, you need:

1. **Empe Issuer Service** - For creating and issuing verifiable credentials
2. **Empe Verifier Service** - For verifying presented credentials

Both services must be properly configured with the correct endpoints and API keys.

## Quick Setup with EMPE

The easiest way to deploy both the Issuer and Verifier services is through EMPE's one-click deployment:

1. Visit https://oneclick.empe.io/
2. Follow the platform instructions to deploy the required services
3. Note the configuration details provided after deployment

### Test Environment Available

We have created example Issuer and Verifier services on our one-click deployment platform for testing purposes. The API keys and addresses can be found in the `.env.test.example` file. You can use these for testing without setting up your own services.

**Important Note**: These test services are shared among multiple users. This means:
- Your schemas, offerings, or VP queries might be modified or deleted by other users
- You might encounter errors if someone else deletes resources you're working with
- Consider this environment suitable for testing only, not for production use

## Configuration

1. Copy `.env.example` to `.env` (or use `.env.test.example` for the shared test environment)
2. Update the following configuration values:
    - `VERIFIER_BASE_URL`: URL for the verifier service
    - `VERIFIER_BASE_URL_LOCAL`: Local URL for the verifier service
    - `VERIFIER_SERVICE_URL`: Service URL for the verifier
    - `VERIFIER_CLIENT_URL`: External URL for your verifier client (see note below)
    - `CLIENT_SECRET`: API key for the verifier service
    - `ISSUER_URL`: URL for the issuer service
    - `ISSUER_API_KEY`: API key for the issuer service
    - `PORT`: Port for the Express server (default: 3000)
    - `SSE_PORT`: Port for the SSE server (default: 8080)

### External URL for Verifier Client

For proper functionality, you must set `VERIFIER_CLIENT_URL` to an external URL that can be accessed from outside your local network. This is necessary for the verification process to work correctly.

You can use [localtunnel](https://theboroer.github.io/localtunnel-www/) to expose your local server to the internet:

```bash
# Install localtunnel
npm install -g localtunnel

# Expose your local server (run this in a separate terminal)
lt --port 3000
```

This will provide you with a public URL that you can use for the `VERIFIER_CLIENT_URL` in your `.env` file.

## Running the Project

```bash
# Install dependencies
npm install

# Development mode
npm run dev-mcp-server

# Build the project
npm run build
```

# Available MCP Empe Server Tools

## Verification Tools
- **generate_verification_qr** - Generates a QR code for verification process
- **generate_verification_qr_for_vp_query** - Generates a QR code for VP query verification
- **check_verification_status** - Checks verification status by state ID

## Schema Management Tools
- **create_schema** - Creates a new credential schema
- **get_all_schemas** - Lists all available schemas
- **get_schema_by_id** - Gets details of a specific schema
- **delete_schema** - Deletes a schema
- **schema_exists_by_type** - Checks if a schema type exists
- **get_latest_schema_by_type** - Gets the latest version of a schema type

## Credential Offering Tool
- **create_offering** - Creates a credential offering with QR code

## VP Query Management Tools
- **create_vp_query** - Creates a new VP query for verification
- **get_all_vp_queries** - Lists all VP queries
- **get_vp_query_by_id** - Gets details of a specific VP query
- **delete_vp_query** - Deletes a VP query

