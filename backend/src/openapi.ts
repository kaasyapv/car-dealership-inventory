/** OpenAPI 3 description of the API. A contract test fails if a documented operation isn't implemented. */

const security = [{ bearerAuth: [] }];
const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});
const idParam = { name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } };
const json = (schema: object) => ({ content: { "application/json": { schema } } });
const vehicleOk = { description: "The updated vehicle", ...json({ $ref: "#/components/schemas/Vehicle" }) };
const notFound = errorResponse("No such vehicle");
const forbidden = errorResponse("Admin only");

const listParams = [
  { name: "make", in: "query", schema: { type: "string" }, description: "Case-insensitive partial match" },
  { name: "model", in: "query", schema: { type: "string" } },
  { name: "category", in: "query", schema: { type: "string" } },
  { name: "minPrice", in: "query", schema: { type: "number", minimum: 0 } },
  { name: "maxPrice", in: "query", schema: { type: "number", minimum: 0 } },
  { name: "available", in: "query", schema: { type: "boolean" }, description: "Hide sold-out vehicles" },
  { name: "sort", in: "query", schema: { enum: ["id", "make", "model", "category", "price", "quantity"] } },
  { name: "order", in: "query", schema: { enum: ["asc", "desc"] } },
  { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
  { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
];
const listResponse = {
  200: {
    description: "A page of vehicles. The total matching count is in the X-Total-Count header.",
    headers: { "X-Total-Count": { schema: { type: "integer" } } },
    ...json({ type: "array", items: { $ref: "#/components/schemas/Vehicle" } }),
  },
};

type Method = "get" | "post" | "put" | "delete";

export const openApiSpec: {
  openapi: string;
  info: object;
  paths: Record<string, Partial<Record<Method, object>>>;
  components: object;
} = {
  openapi: "3.0.3",
  info: {
    title: "Car Dealership Inventory API",
    version: "1.0.0",
    description:
      "Register to get a token, then send it as `Authorization: Bearer <token>`. The first registered user is the admin.",
  },
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Create an account (the first account becomes admin)",
        requestBody: { required: true, ...json({ $ref: "#/components/schemas/Credentials" }) },
        responses: {
          201: { description: "Account created", ...json({ $ref: "#/components/schemas/Session" }) },
          400: errorResponse("Validation failed"),
          409: errorResponse("Email already registered"),
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in",
        requestBody: { required: true, ...json({ $ref: "#/components/schemas/Credentials" }) },
        responses: {
          200: { description: "Logged in", ...json({ $ref: "#/components/schemas/Session" }) },
          401: errorResponse("Invalid email or password (identical for unknown email)"),
          429: errorResponse("Too many attempts"),
        },
      },
    },
    "/api/vehicles": {
      get: { tags: ["Vehicles"], summary: "List vehicles", security, parameters: listParams, responses: listResponse },
      post: {
        tags: ["Vehicles"],
        summary: "Add a vehicle (admin)",
        security,
        requestBody: { required: true, ...json({ $ref: "#/components/schemas/VehicleInput" }) },
        responses: {
          201: { description: "Created", ...json({ $ref: "#/components/schemas/Vehicle" }) },
          400: errorResponse("Validation failed"),
          403: forbidden,
        },
      },
    },
    "/api/vehicles/search": {
      get: {
        tags: ["Vehicles"],
        summary: "Search by make, model, category or price range (same query as the list)",
        security,
        parameters: listParams,
        responses: listResponse,
      },
    },
    "/api/vehicles/{id}": {
      put: {
        tags: ["Vehicles"],
        summary: "Update a vehicle (admin, partial)",
        security,
        parameters: [idParam],
        requestBody: { required: true, ...json({ $ref: "#/components/schemas/VehicleInput" }) },
        responses: { 200: vehicleOk, 400: errorResponse("Validation failed"), 403: forbidden, 404: notFound },
      },
      delete: {
        tags: ["Vehicles"],
        summary: "Delete a vehicle (admin). Sales history is kept.",
        security,
        parameters: [idParam],
        responses: { 204: { description: "Deleted" }, 403: forbidden, 404: notFound },
      },
    },
    "/api/vehicles/{id}/purchase": {
      post: {
        tags: ["Inventory"],
        summary: "Purchase units (default 1); atomically decreases stock",
        security,
        parameters: [idParam],
        requestBody: { ...json({ type: "object", properties: { quantity: { type: "integer", minimum: 1, default: 1 } } }) },
        responses: { 200: vehicleOk, 404: notFound, 409: errorResponse("Not enough stock") },
      },
    },
    "/api/vehicles/{id}/restock": {
      post: {
        tags: ["Inventory"],
        summary: "Restock (admin)",
        security,
        parameters: [idParam],
        requestBody: {
          required: true,
          ...json({ type: "object", required: ["amount"], properties: { amount: { type: "integer", minimum: 1 } } }),
        },
        responses: { 200: vehicleOk, 400: errorResponse("Validation failed"), 403: forbidden, 404: notFound },
      },
    },
    "/api/inventory/events": {
      get: {
        tags: ["Inventory"],
        summary: "Audit trail of purchases and restocks, newest first (admin)",
        security,
        parameters: [{ name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200, default: 50 } }],
        responses: {
          200: { description: "Events", ...json({ type: "array", items: { $ref: "#/components/schemas/StockEvent" } }) },
          403: forbidden,
        },
      },
    },
    "/api/health": {
      get: { tags: ["Ops"], summary: "Liveness and database check", responses: { 200: { description: "ok" } } },
    },
  },
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      Error: {
        type: "object",
        properties: { error: { type: "string" }, code: { type: "string", example: "OUT_OF_STOCK" } },
      },
      Credentials: {
        type: "object",
        required: ["email", "password"],
        properties: { email: { type: "string", format: "email" }, password: { type: "string", minLength: 8, maxLength: 72 } },
      },
      Session: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: { type: "object", properties: { id: { type: "integer" }, email: { type: "string" }, role: { enum: ["admin", "user"] } } },
        },
      },
      VehicleInput: {
        type: "object",
        required: ["make", "model", "category", "price", "quantity"],
        properties: {
          make: { type: "string" },
          model: { type: "string" },
          category: { type: "string" },
          price: { type: "number", minimum: 0 },
          quantity: { type: "integer", minimum: 0 },
        },
      },
      Vehicle: {
        allOf: [{ type: "object", properties: { id: { type: "integer" } } }, { $ref: "#/components/schemas/VehicleInput" }],
      },
      StockEvent: {
        type: "object",
        properties: {
          id: { type: "integer" },
          vehicleId: { type: "integer", nullable: true, description: "null once the vehicle was deleted" },
          vehicle: { type: "string", example: "Honda Civic" },
          userEmail: { type: "string" },
          kind: { enum: ["purchase", "restock"] },
          quantity: { type: "integer" },
          at: { type: "string", format: "date-time" },
        },
      },
    },
  },
};
