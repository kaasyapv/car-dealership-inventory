import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { bearer, makeApp, register } from "./helpers";

const civic = { make: "Honda", model: "Civic", category: "Sedan", price: 22000, quantity: 3 };
const f150 = { make: "Ford", model: "F-150", category: "Truck", price: 45000, quantity: 1 };

let app: ReturnType<typeof makeApp>;
let admin: string;
let user: string;

beforeEach(async () => {
  app = makeApp();
  admin = await register(app, "admin@x.com");
  user = await register(app, "user@x.com");
});

const add = (v: object, token = admin) => request(app).post("/api/vehicles").set(bearer(token)).send(v);

describe("authentication", () => {
  it.each([
    ["get", "/api/vehicles"],
    ["get", "/api/vehicles/search"],
    ["post", "/api/vehicles"],
    ["put", "/api/vehicles/1"],
    ["delete", "/api/vehicles/1"],
    ["post", "/api/vehicles/1/purchase"],
    ["post", "/api/vehicles/1/restock"],
  ] as const)("%s %s requires a token", async (method, url) => {
    expect((await request(app)[method](url)).status).toBe(401);
  });

  it("rejects a token signed with another secret", async () => {
    const res = await request(app).get("/api/vehicles").set(bearer("a.b.c"));
    expect(res.status).toBe(401);
  });
});

describe("authorization: only admins may change the catalogue", () => {
  it("forbids regular users from adding vehicles", async () => {
    expect((await add(civic, user)).status).toBe(403);
    expect((await request(app).get("/api/vehicles").set(bearer(admin))).body).toEqual([]);
  });

  it("forbids regular users from updating vehicles", async () => {
    const { body } = await add(civic);
    const res = await request(app).put(`/api/vehicles/${body.id}`).set(bearer(user)).send({ price: 1 });
    expect(res.status).toBe(403);
    const after = await request(app).get("/api/vehicles").set(bearer(admin));
    expect(after.body[0].price).toBe(22000);
  });
});

describe("POST /api/vehicles", () => {
  it("adds a vehicle with an id", async () => {
    const res = await add(civic);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), ...civic });
  });

  it.each([
    [{ ...civic, price: -1 }],
    [{ ...civic, quantity: -1 }],
    [{ ...civic, quantity: 1.5 }],
    [{ ...civic, make: "" }],
    [{ make: "Honda" }],
  ])("rejects invalid vehicle %j with 400", async (body) => {
    expect((await add(body)).status).toBe(400);
  });
});

describe("GET /api/vehicles", () => {
  it("lists all vehicles", async () => {
    await add(civic);
    await add(f150);
    const res = await request(app).get("/api/vehicles").set(bearer(user));
    expect(res.status).toBe(200);
    expect(res.body.map((v: { model: string }) => v.model)).toEqual(["Civic", "F-150"]);
  });
});

describe("GET /api/vehicles/search", () => {
  beforeEach(async () => {
    await add(civic);
    await add(f150);
    await add({ make: "Honda", model: "Accord", category: "Sedan", price: 28000, quantity: 0 });
  });

  const search = async (qs: string) =>
    (await request(app).get(`/api/vehicles/search?${qs}`).set(bearer(user))).body.map(
      (v: { model: string }) => v.model,
    );

  it("filters by make (case-insensitive, partial)", async () => {
    expect(await search("make=hon")).toEqual(["Civic", "Accord"]);
  });
  it("filters by model", async () => expect(await search("model=f-1")).toEqual(["F-150"]));
  it("filters by category", async () => expect(await search("category=truck")).toEqual(["F-150"]));
  it("filters by price range", async () => {
    expect(await search("minPrice=25000&maxPrice=30000")).toEqual(["Accord"]);
    expect(await search("minPrice=40000")).toEqual(["F-150"]);
  });
  it("combines filters", async () => expect(await search("make=honda&maxPrice=25000")).toEqual(["Civic"]));
  it("treats SQL wildcards in the query literally", async () => expect(await search("make=%25")).toEqual([]));
  it("rejects a non-numeric price with 400", async () => {
    const res = await request(app).get("/api/vehicles/search?minPrice=abc").set(bearer(user));
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/vehicles/:id", () => {
  it("updates provided fields only", async () => {
    const { body } = await add(civic);
    const res = await request(app).put(`/api/vehicles/${body.id}`).set(bearer(admin)).send({ price: 21000 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...body, price: 21000 });
  });
  it("404s for an unknown vehicle", async () => {
    const res = await request(app).put("/api/vehicles/999").set(bearer(admin)).send({ price: 1 });
    expect(res.status).toBe(404);
  });
  it("rejects invalid values with 400", async () => {
    const { body } = await add(civic);
    const res = await request(app).put(`/api/vehicles/${body.id}`).set(bearer(admin)).send({ price: -5 });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/vehicles/:id", () => {
  it("is forbidden for regular users", async () => {
    const { body } = await add(civic);
    const res = await request(app).delete(`/api/vehicles/${body.id}`).set(bearer(user));
    expect(res.status).toBe(403);
  });
  it("deletes for admins", async () => {
    const { body } = await add(civic);
    expect((await request(app).delete(`/api/vehicles/${body.id}`).set(bearer(admin))).status).toBe(204);
    expect((await request(app).get("/api/vehicles").set(bearer(admin))).body).toEqual([]);
  });
  it("404s for an unknown vehicle", async () => {
    expect((await request(app).delete("/api/vehicles/999").set(bearer(admin))).status).toBe(404);
  });
});

describe("POST /api/vehicles/:id/purchase", () => {
  it("decreases quantity by one", async () => {
    const { body } = await add(civic);
    const res = await request(app).post(`/api/vehicles/${body.id}/purchase`).set(bearer(user));
    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(2);
  });
  it("returns 409 and never goes negative when out of stock", async () => {
    const { body } = await add({ ...civic, quantity: 1 });
    await request(app).post(`/api/vehicles/${body.id}/purchase`).set(bearer(user));
    const res = await request(app).post(`/api/vehicles/${body.id}/purchase`).set(bearer(user));
    expect(res.status).toBe(409);
    const list = await request(app).get("/api/vehicles").set(bearer(user));
    expect(list.body[0].quantity).toBe(0);
  });
  it("404s for an unknown vehicle", async () => {
    expect((await request(app).post("/api/vehicles/999/purchase").set(bearer(user))).status).toBe(404);
  });
});

describe("POST /api/vehicles/:id/restock", () => {
  it("is forbidden for regular users", async () => {
    const { body } = await add(civic);
    const res = await request(app).post(`/api/vehicles/${body.id}/restock`).set(bearer(user)).send({ amount: 5 });
    expect(res.status).toBe(403);
  });
  it("increases quantity by amount for admins", async () => {
    const { body } = await add(civic);
    const res = await request(app).post(`/api/vehicles/${body.id}/restock`).set(bearer(admin)).send({ amount: 5 });
    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(8);
  });
  it.each([[{ amount: 0 }], [{ amount: -2 }], [{ amount: 1.5 }], [{}]])("rejects %j with 400", async (b) => {
    const { body } = await add(civic);
    expect((await request(app).post(`/api/vehicles/${body.id}/restock`).set(bearer(admin)).send(b)).status).toBe(400);
  });
  it("404s for an unknown vehicle", async () => {
    expect((await request(app).post("/api/vehicles/999/restock").set(bearer(admin)).send({ amount: 1 })).status).toBe(404);
  });
});
