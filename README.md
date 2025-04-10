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

# Example Prompts for Claude

After connecting Claude to this MCP server, you can use the following example prompts to interact with the SSI
ecosystem.

## Issuer Flow Example Prompts

### Creating and Issuing Event Tickets

```
I want to create digital tickets for my tech conference. Can you help me create a schema 
for event tickets and then issue a sample ticket?
```

```
Please create a credential schema for concert tickets with fields for the event name, 
date, seat number, and ticket ID. Then issue a sample ticket for the "Summer Jazz 
Festival" on July 15, 2023.
```

```
I need to issue a digital membership card for my gym. The membership should include the
member's name, membership level (Gold, Silver, Bronze), and expiration date. Can you 
create this for me?
```

### Managing Schemas

```
Show me all the credential schemas available in the system.
```

```
Do we already have a schema for event tickets? If not, please create one.
```

```
Get me the details of the most recent version of the "MembershipCard" schema.
```

## Verifier Flow Example Prompts

### Simple Verification

```
I need to verify attendees at my event entrance. Can you generate a QR code that I can
scan with my phone to verify their tickets?
```

```
Generate a verification QR code for the fairdrop endpoint and let me know when someone
scans it.
```

### Advanced Verification with VP Queries

Remember that before calling verification flow you must have existing credential to pass the verification. Below is
example command first to
generate offering and then to verify it.

```
Please generate for me schema and credential offering with type EventTicket where the
event name is "Annual Developer Conference".

I need to verify that people have a valid EventTicket credential where the event name
is "Annual Developer Conference".
```

Below are some more advanced verification prompts:

```
Create a verification process that checks if someone has a MembershipCard credential with
a "Gold" membership level and that hasn't expired yet.
```

```
I want to verify that someone has either a government ID showing they're over 21 OR a driver'
s license with class A, B, or C. Can you set up this verification?
```

### Managing VP Queries

```
Show me all the verification queries we have in the system.
```

```
Delete the VP query with ID "12345678-1234-1234-1234-123456789012" as we don't need it anymore.
```

# Available MCP Empe Server Tools

## Qr Code Tools

- **show_qr_code** - Generates a QR code link for display

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

