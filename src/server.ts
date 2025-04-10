import dotenv from 'dotenv';
import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { EventSource } from 'eventsource';
import { VERIFIER_CLIENT_URL, VERIFIER_SERVICE_API_KEY, VERIFIER_SERVICE_URL } from './verifier';
import { fromEvent, merge, Observable, Subject } from 'rxjs';
import { filter, map, take, takeUntil } from 'rxjs/operators';

dotenv.config();
const ISSUER_URL = process.env.ISSUER_URL || "http://localhost:3000";
const ISSUER_API_KEY = process.env.ISSUER_API_KEY

export const server = new FastMCP({
    name: "Verification Server",
    version: "1.0.0",
});
interface VerificationData {
    status: "pending" | "completed" | "error";
    endpoint: string;
    state: string;
    eventSource: EventSource;
    result: string;
    data: any;
    timestamp: number;
    error?: string;
}

interface EventSourceMessage {
    data: string;
    type: string;
}

const verificationStore = new Map<string, VerificationData>();
const verificationObservables = new Map<string, Observable<VerificationData>>();

export function createEventSourceObservable(eventSource: EventSource, state: string, endpoint: string): Observable<VerificationData> {
    const complete$ = new Subject<void>();

    const message$ = fromEvent<EventSourceMessage>(eventSource, 'message').pipe(
        map(event => {
            try {
                const eventData = JSON.parse(event.data);

                const verificationData: VerificationData = {
                    status: "completed",
                    endpoint: endpoint,
                    state: state,
                    result: eventData.verification_status,
                    data: eventData,
                    timestamp: Date.now(),
                    eventSource: eventSource
                };

                verificationStore.set(state, verificationData);

                if (eventData.result) {
                    eventSource.close();
                    complete$.next();
                    complete$.complete();
                }

                return verificationData;
            } catch (error) {
                eventSource.close();
                complete$.next();
                complete$.complete();

                const errorData: VerificationData = {
                    status: "error",
                    endpoint: endpoint,
                    state: state,
                    result: "",
                    data: null,
                    timestamp: Date.now(),
                    eventSource: eventSource,
                    error: "Error processing event data"
                };

                verificationStore.set(state, errorData);

                return errorData;
            }
        })
    );

    const error$ = fromEvent(eventSource, 'error').pipe(
        map(() => {
            eventSource.close();
            complete$.next();
            complete$.complete();

            const errorData: VerificationData = {
                status: "error",
                endpoint: endpoint,
                state: state,
                result: "",
                data: null,
                timestamp: Date.now(),
                eventSource: eventSource,
                error: "Connection error with verification service"
            };

            verificationStore.set(state, errorData);

            return errorData;
        })
    );

    return merge(message$, error$).pipe(
        takeUntil(complete$)
    );
}

server.addTool({
    name: "generate_verification_qr",
    description: 'Starts the verification process and generates a QR code for users to scan. Returns a state ID and QR code URL. Always return this qr code url to user. ALWAYS call this tool first before checking results. After calling this tool, immediately call show_qr_code tool. Return the qr code link to user and immediately call check_verification_status tool with the returned state ID. This tool has one argument (args) \'endpoint\' that is required that specifies the verification endpoint to use (e.g., \'fairdrop\').',
    parameters: z.object({
        endpoint: z.string().describe("The name of the verification endpoint (e.g., 'fairdrop')"),
    }),
    execute: async (args) => {
        try {
            const response = await fetch(VERIFIER_CLIENT_URL + `/api/verifier/${args.endpoint}/v1/authorize-qr-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-client-secret': VERIFIER_SERVICE_API_KEY },
            });

            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            const data = await response.json() as { qr_code_url: string, state: string };
            const state = data.state;

            const eventSource = new EventSource(
                `${VERIFIER_CLIENT_URL}/api/verifier/${args.endpoint}/v1/connection/${state}`,
            );

            const initialData: VerificationData = {
                status: "pending",
                endpoint: args.endpoint,
                state: state,
                eventSource: eventSource,
                result: "",
                data: null,
                timestamp: Date.now()
            };

            verificationStore.set(state, initialData);

            const verificationObservable = createEventSourceObservable(eventSource, state, args.endpoint);
            verificationObservables.set(state, verificationObservable);

            verificationObservable.subscribe({
                error: (err) => {}
            });

            return JSON.stringify({
                qr_code_url: data.qr_code_url,
                state: state,
                message: "QR code generated successfully. Display this QR code to the user and call check_verification_status with this state ID."
            });
        } catch (error) {
            return JSON.stringify({
                error: true,
                message: `Failed to generate QR code: ${error.message || "Unknown error"}`,
            });
        }
    },
});

server.addTool({
    name: "generate_verification_qr_for_vp_query",
    description: 'Starts the verification process and generates a QR code for users to scan. Returns a state ID and QR code URL. ALWAYS call this tool first before checking results.ALWAYS call this tool first before checking results. After calling this tool, immediately call show_qr_code tool. Remember that you must return this qr code url to user before any next steps. Return the qr code link to user and then call check_verification_status tool with the returned state ID. This tool has one argument (args) \'vpQueryId\' that is required that specifies the verification vpQuery to use.',
    parameters: z.object({
        vpQueryId: z.string().describe("The vp query id to use for the verification"),
    }),
    execute: async (args) => {
        try {
            const response = await fetch(VERIFIER_CLIENT_URL + `/api/verifier/vp-query/v1/authorize-qr-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-secret': VERIFIER_SERVICE_API_KEY,
                },
                body: JSON.stringify({
                    vp_query_id: args.vpQueryId
                })
            });

            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            const data = await response.json() as { qr_code_url: string, state: string };
            const state = data.state;

            const eventSource = new EventSource(
                `${VERIFIER_CLIENT_URL}/api/verifier/vp-query/v1/connection/${state}`,
            );

            const initialData: VerificationData = {
                status: "pending",
                endpoint: 'vp-query',
                state: state,
                eventSource: eventSource,
                result: "",
                data: null,
                timestamp: Date.now()
            };

            verificationStore.set(state, initialData);

            const verificationObservable = createEventSourceObservable(eventSource, state, 'vp-query');
            verificationObservables.set(state, verificationObservable);

            verificationObservable.subscribe({
                error: (err) => {}
            });

            return JSON.stringify({
                qr_code_url: data.qr_code_url,
                state: state,
                message: "QR code generated successfully. Display this QR code to the user and call check_verification_status with this state ID."
            });
        } catch (error) {
            return JSON.stringify({
                error: true,
                message: `Failed to generate QR code: ${error.message || "Unknown error"}`,
            });
        }
    },
});

server.addTool({
    name: "check_verification_status",
    description: "Checks the status of a verification process previously initialized with generate_verification_qr. This tool has one parameter state that you received from generate_verification_qr. This tool might return 'pending' multiple times - if so, KEEP CALLING this tool with the same state ID until you get a 'completed' or 'error' status. The process can take up to 2 minutes, so be patient and persistent.",
    parameters: z.object({
        state: z.string().describe("The state ID returned from the generate_verification_qr tool"),
    }),
    execute: async (args) => {
        const verification = verificationStore.get(args.state);

        if (!verification) {
            return JSON.stringify({
                status: "not_found",
                message: "No verification process found with this state ID. You must call generate_verification_qr first."
            });
        }

        if (verification.status !== "pending") {
            const response = {
                status: verification.status,
                result: verification.result,
                endpoint: verification.endpoint,
                data: verification.data,
                timestamp: verification.timestamp,
                lastUpdated: new Date(verification.timestamp).toISOString(),
                message: verification.status === "completed" && verification.result === "verified"
                    ? "Verification completed successfully! Credential has been verified."
                    : "Verification failed or was rejected. Check the data field for details."
            };

            return JSON.stringify(response);
        }

        try {
            const observable = verificationObservables.get(args.state);

            if (!observable) {
                throw new Error("Observable not found for state: " + args.state);
            }

            const result = await new Promise<VerificationData>((resolve, reject) => {
                merge(
                    observable.pipe(
                        filter(data => data.status !== 'pending'),
                        take(1)
                    )
                ).subscribe({
                    next: (data) => resolve(data),
                    error: (err) => reject(err)
                });
            });

            return JSON.stringify({
                status: result.status,
                verified: result.result === "verified",
                endpoint: result.endpoint,
                data: result.data,
                timestamp: result.timestamp,
                lastUpdated: new Date(result.timestamp).toISOString(),
                message: result.status === "pending"
                    ? "Verification still in progress. You MUST call check_verification_status again to continue polling."
                    : result.status === "completed" && result.result === "verified"
                        ? "Verification completed successfully! Credential has been verified."
                        : "Verification failed or was rejected. Check the data field for details."
            });
        } catch (error) {
            return JSON.stringify({
                status: "pending",
                message: "Verification check experienced a temporary error. Call check_verification_status again to continue polling.",
                endpoint: verification.endpoint,
                timestamp: Date.now(),
                lastUpdated: new Date().toISOString()
            });
        }
    },
});

async function callIssuerAPI(endpoint: string, method: string, body: Record<string, any> | null = null): Promise<any> {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (ISSUER_API_KEY) {
            headers['x-client-secret'] = ISSUER_API_KEY;
        }

        const options: RequestInit = {
            method,
            headers
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const url = `${ISSUER_URL}${endpoint}`
        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
}

server.addTool({
    name: "create_schema",
    description: 'Create a new credential schema. Schemas define the structure and attributes of Verifiable Credentials in the SSI ecosystem. Each schema has a type, name, and defines the properties a credential can contain. here is an example: {\n' +
        '  "name": "ProofOfPurchase",\n' +
        '  "type": "ProofOfPurchase",\n' +
        '  "credentialSubject": {\n' +
        '    "type": "object",\n' +
        '    "properties": {\n' +
        '      "ticket": {"type": "string", "title": "Ticket"},\n' +
        '      "seat": {"type": "string", "title": "Seat"},\n' +
        '      "description": {"type": "string", "title": "Description"}\n' +
        '    },\n' +
        '    "required": ["ticket", "seat", "description"]\n' +
        '  }\n' +
        '}',
    parameters: z.object({
        name: z.string().describe("Human-readable name of the schema (e.g., 'ProofOfPurchase', 'IdentityCredential', 'EventTicket'). This should be clear and descriptive."),
        type: z.string().describe("Unique identifier for this schema type. Often matches the name but serves as the technical reference. Used when creating credential offerings."),
        properties: z.record(z.any()).describe("JSON map defining the schema properties. Each property should be a key-value pair where the key is the property name and the value is a map containing 'type' (string, number, boolean), 'title' (human-readable name), and optionally 'description' and 'format'. Example: {'ticketId': {'type': 'string', 'title': 'Ticket ID'}}"),
        requiredFields: z.array(z.string()).describe("List of field names that are mandatory in credentials using this schema. These must be keys that exist in the properties map. Example: ['name', 'issuanceDate']")
    }),
    execute: async (args: {
        name: string;
        type: string;
        properties: Record<string, any>;
        requiredFields: string[];
    }): Promise<string> => {
        try {
            const credentialSubject: Record<string, any> = {
                type: "object",
                properties: args.properties,
                required: args.requiredFields
            };

            const requestBody: Record<string, any> = {
                name: args.name,
                type: args.type,
                credentialSubject
            };

            const result = await callIssuerAPI("/api/v1/schema", "POST", requestBody);
            return JSON.stringify(result);
        } catch (error) {
            return JSON.stringify({
                error: true,
                message: `Failed to create schema: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
        }
    },
});

server.addTool({
    name: "get_all_schemas",
    description: "Retrieve all credential schemas available in the system. Returns a list of schema summaries including ID, name, type, version, and URI. Use this to explore existing schemas before creating new ones or when needing a schema ID for other operations.",
    parameters: z.object({}),
    execute: async (): Promise<string> => {
        try {
            const result = await callIssuerAPI("/api/v1/schema", "GET");
            return JSON.stringify(result);
        } catch (error) {
            return JSON.stringify({
                error: true,
                message: `Failed to retrieve schemas: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
        }
    },
});

server.addTool({
    name: "get_schema_by_id",
    description: "Retrieve detailed information about a specific schema by its unique identifier. Returns the complete schema definition including all properties and metadata.",
    parameters: z.object({
        id: z.string().describe("Unique identifier (UUID) of the schema to retrieve. This is the 'id' field returned when creating a schema or listing all schemas. Format example: 'db5a33ae-2eef-41b4-9c74-2ed16c4bb4f4'")
    }),
    execute: async (args: { id: string }): Promise<string> => {
        try {
            const result = await callIssuerAPI(`/api/v1/schema/${args.id}`, "GET");
            return JSON.stringify(result);
        } catch (error) {
            return JSON.stringify({
                error: true,
                message: `Failed to retrieve schema: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
        }
    },
});

server.addTool({
    name: "delete_schema",
    description: "Permanently delete a schema from the system. This operation cannot be undone. Note that deleting a schema will not affect credentials already issued using this schema.",
    parameters: z.object({
        id: z.string().describe("Unique identifier (UUID) of the schema to delete. This is the 'id' field returned when creating a schema or listing all schemas. Format example: 'db5a33ae-2eef-41b4-9c74-2ed16c4bb4f4'")
    }),
    execute: async (args: { id: string }): Promise<string> => {
        try {
            await callIssuerAPI(`/api/v1/schema/${args.id}`, "DELETE");
            return JSON.stringify({
                success: true,
                message: `Schema with ID ${args.id} has been successfully deleted.`
            });
        } catch (error) {
            return JSON.stringify({
                error: true,
                message: `Failed to delete schema: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
        }
    },
});

server.addTool({
    name: "schema_exists_by_type",
    description: "Check if a schema with a specific type already exists in the system. Returns true if at least one schema with the specified type exists, false otherwise. Useful before creating new schemas to avoid duplication.",
    parameters: z.object({
        type: z.string().describe("The schema type to check for existence. This is the unique identifier used when referencing the schema type in credential offerings. Case-sensitive.")
    }),
    execute: async (args: { type: string }): Promise<string> => {
        try {
            const schemas: Array<Record<string, any>> = await callIssuerAPI("/api/v1/schema", "GET");
            const exists = schemas.some(schema => args.type === schema.type);

            return JSON.stringify({
                exists,
                message: exists
                    ? `A schema with type '${args.type}' already exists.`
                    : `No schema found with type '${args.type}'.`
            });
        } catch (error) {
            return JSON.stringify({
                error: true,
                message: `Failed to check schema existence: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
        }
    },
});

server.addTool({
    name: "get_latest_schema_by_type",
    description: "Retrieve the most recent version of a schema by its type. When schemas evolve over time, new versions are created. This tool fetches the schema with the highest version number for a given type.",
    parameters: z.object({
        type: z.string().describe("The schema type to search for. This returns the schema with the highest version number that matches this type. Case-sensitive.")
    }),
    execute: async (args: { type: string }): Promise<string> => {
        try {
            const schemas: Array<Record<string, any>> = await callIssuerAPI("/api/v1/schema", "GET");
            const matchingSchemas = schemas.filter(schema => args.type === schema.type);

            if (matchingSchemas.length === 0) {
                return JSON.stringify({
                    error: true,
                    message: `No schema found with type '${args.type}'.`
                });
            }

            const latestSchema = matchingSchemas.reduce((latest, current) => {
                return (current.version > latest.version) ? current : latest;
            }, matchingSchemas[0]);

            return JSON.stringify(latestSchema);
        } catch (error) {
            return JSON.stringify({
                error: true,
                message: `Failed to retrieve latest schema: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
        }
    },
});

server.addTool({
    name: "create_offering",
    description: 'Create a credential offering with flexible recipient options. This is the foundational method that can create both targeted (specific recipient) and open (anyone can claim) offerings. Most use cases should use the specialized createTargetedOffering or createOpenOffering methods instead. This function will return the qr_code_url that must always be returned to user. This function has 3 parameters: type, credentialSubject, and recipientDid. The type is the schema type to offer, credentialSubject is the actual data to include in the credential, and recipientDid is the DID of the recipient (if any).',
    parameters: z.object({
        type: z.string().describe("The type of credential to offer, must match an existing schema type in the system. For example: 'ProofOfPurchase', 'EventTicket', 'MembershipCard'. Case-sensitive."),
        credentialSubject: z.record(z.any()).describe("The actual data to include in the credential, structured as key-value pairs. Keys must match the properties defined in the schema. For example, an EventTicket might include: {'ticketId': 'T12345', 'eventName': 'Spring Conference', 'seat': 'A12'}"),
        recipientDid: z.string().optional().describe("For targeted offerings, specify the recipient's DID (Decentralized Identifier). When provided, only the holder of this DID can claim the credential. For open offerings, leave this empty or null.")
    }),
    execute: async args => {
        try {
            const requestBody: Record<string, any> = {
                credential_type: args.type,
                credential_subject: args.credentialSubject
            };

            if (args.recipientDid) {
                requestBody.recipient = args.recipientDid;
            }

            const result = await callIssuerAPI("/api/v1/offering", "POST", requestBody);
            return JSON.stringify(result);
        } catch (error) {
            return JSON.stringify({
                error: true,
                message: `Failed to create offering: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
        }
    },
});

server.addTool({
    name: "create_vp_query",
    description: `Create a new Verifiable Presentation (VP) query for credential verification in Self-Sovereign Identity (SSI) systems.

VP queries define detailed requirements for credentials that need to be presented and verified within the SSI ecosystem. These queries use a flexible JSON-based query language to specify exactly what credentials are acceptable and what conditions they must meet.

**Query Structure**
A VP query consists of an array of query objects, where each query object represents a separate verification requirement. Multiple queries in the array are evaluated independently, creating an OR relationship (any matching query satisfies the verification).

**Query Object Components**
Each query object contains:
- fields: An array of field specifications defining paths to credential data and filters for validating that data.

**Field Specification**
Each field specification includes:
- path: A JSONPath expression (in array format) identifying where to look in the credential.
- filter: A JSON Schema object defining validation rules for the data at that path.

**Common Filter Types**
- Simple types: string, number, boolean, array, object
- String patterns: using \`pattern\` with regular expressions
- Enumerations: using \`enum\` to specify allowed values
- Array filters: \`contains\`, \`minItems\`, \`maxItems\`
- Numeric ranges: \`minimum\`, \`maximum\`, \`exclusiveMinimum\`, \`exclusiveMaximum\`

**Examples**
1. Basic credential type verification:
   [
     {
       "fields": [
         {
           "path": ["$.type"],
           "filter": {
             "type": "array",
             "contains": {"const": "VerifiableID"}
           }
         }
       ]
     }
   ]

2. Multiple field requirements (issuer and expiration date check):
json
   [
     {
       "fields": [
         {
           "path": ["$.type"],
           "filter": {
             "type": "array",
             "contains": {"const": "MembershipCredential"}
           }
         },
         {
           "path": ["$.issuer"],
           "filter": {
             "type": "string",
             "enum": ["did:empe:trusted_org_1", "did:empe:trusted_org_2"]
           }
         },
         {
           "path": ["$.expirationDate"],
           "filter": {
             "type": "string",
             "format": "date-time"
           }
         }
       ]
     }
   ]

3. Complex query with multiple credential options:
   [
     {
       "fields": [
         {
           "path": ["$.type"],
           "filter": {
             "type": "array",
             "contains": {"const": "DriverLicense"}
           }
         },
         {
           "path": ["$.credentialSubject.licenseClass"],
           "filter": {
             "type": "string",
             "enum": ["A", "B", "C"]
           }
         }
       ]
     },
     {
       "fields": [
         {
           "path": ["$.type"],
           "filter": {
             "type": "array",
             "contains": {"const": "GovernmentID"}
           }
         },
         {
           "path": ["$.credentialSubject.age"],
           "filter": {
             "type": "number",
             "minimum": 21
           }
         }
       ]
     }
   ]

The query parameter should be a properly formatted JSON array following this structure.`,
    parameters: z.object({
        query: z.array(z.any()).describe("Array of VP query parameters defining what credentials should be presented. Each item in the array represents a query that will be evaluated when verifying credentials."),
    }),
    execute: async (args: { query: any[] }): Promise<string> => {
        try {
            const result = await callVerifierServiceAPI("/api/v1/verifier/vp-query", "POST", args.query);
            return JSON.stringify(result);
        } catch (error) {
            return JSON.stringify({
                error: true,
                message: `Failed to create VP query: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
        }
    },
});

server.addTool({
    name: "get_all_vp_queries",
    description: "Retrieve all Verifiable Presentation (VP) queries available in the system. Returns a list of VP query configurations including their IDs and query bodies.",
    parameters: z.object({}),
    execute: async (): Promise<string> => {
        try {
            const result = await callVerifierServiceAPI("/api/v1/verifier/vp-query", "GET");
            return JSON.stringify(result);
        } catch (error) {
            return JSON.stringify({
                error: true,
                message: `Failed to retrieve VP queries: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
        }
    },
});

server.addTool({
    name: "get_vp_query_by_id",
    description: "Retrieve detailed information about a specific Verifiable Presentation (VP) query by its unique identifier. Returns the complete query definition.",
    parameters: z.object({
        id: z.string().describe("Unique identifier (UUID) of the VP query to retrieve. Format example: 'db5a33ae-2eef-41b4-9c74-2ed16c4bb4f4'")
    }),
    execute: async (args: { id: string }): Promise<string> => {
        try {
            const result = await callVerifierServiceAPI(`/api/v1/verifier/vp-query/${args.id}`, "GET");
            return JSON.stringify(result);
        } catch (error) {
            return JSON.stringify({
                error: true,
                message: `Failed to retrieve VP query: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
        }
    },
});

server.addTool({
    name: "delete_vp_query",
    description: "Permanently delete a Verifiable Presentation (VP) query from the system. This operation cannot be undone.",
    parameters: z.object({
        id: z.string().describe("Unique identifier (UUID) of the VP query to delete. Format example: 'db5a33ae-2eef-41b4-9c74-2ed16c4bb4f4'")
    }),
    execute: async (args: { id: string }): Promise<string> => {
        try {
            await callVerifierServiceAPI(`/api/v1/verifier/vp-query/${args.id}`, "DELETE");
            return JSON.stringify({
                success: true,
                message: `VP query with ID ${args.id} has been successfully deleted.`
            });
        } catch (error) {
            return JSON.stringify({
                error: true,
                message: `Failed to delete VP query: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
        }
    },
});

async function callVerifierServiceAPI(endpoint: string, method: string, body: Record<string, any> | null = null): Promise<any> {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-client-secret': VERIFIER_SERVICE_API_KEY,
        };

        const options: RequestInit = {
            method,
            headers
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const url = `${VERIFIER_SERVICE_URL}${endpoint}`
        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
}

server.addTool({
    name: 'show_qr_code',
    description: 'IMPORTANT: This tool must be called immediately after generating a verification QR code or creating an offering to display the QR code to the user. The tool returns a link containing that must be immediately showed to the user before processing the next step. Its important to call this tool immediately after generating the QR code. Always show link generated by this tool to user.',
    parameters: z.object({
        qr_code_url: z.string().describe('The URL of the QR code image to fetch'),
    }),
    execute: async (args: { qr_code_url: string }): Promise<string> => {
        try {
            const response = await fetch(args.qr_code_url);

            if (!response.ok) {
                throw new Error(`Failed to fetch QR code image: ${response.status} ${response.statusText}`);
            }

            const encodedUrl = encodeURIComponent(args.qr_code_url);
            const qrCodeLink = `${VERIFIER_SERVICE_URL}/api/v1/verifier/qr-code/show/${encodedUrl}`;

            return JSON.stringify({
                success: true,
                link_to_qr_code: qrCodeLink,
                message: 'QR code link generated successfully. Now show this link to the user.',
            });
        } catch (error) {
            return JSON.stringify({
                error: true,
                message: `Failed to process QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
        }
    },
});