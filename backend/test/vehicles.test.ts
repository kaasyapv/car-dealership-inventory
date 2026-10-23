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

describe("POST /api/vehicles/:id/purchase with a quantity", () => {
  it("buys several units at once", async () => {
    const { body } = await add(civic);
    const res = await request(app).post(`/api/vehicles/${body.id}/purchase`).set(bearer(user)).send({ quantity: 2 });
    expect(res.body.quantity).toBe(1);
  });
  it("refuses more than is in stock without changing it", async () => {
    const { body } = await add(civic);
    const res = await request(app).post(`/api/vehicles/${body.id}/purchase`).set(bearer(user)).send({ quantity: 4 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("OUT_OF_STOCK");
    expect((await request(app).get("/api/vehicles").set(bearer(user))).body[0].quantity).toBe(3);
  });
  it.each([[{ quantity: 0 }], [{ quantity: -1 }], [{ quantity: 1.5 }]])("rejects %j with 400", async (b) => {
    const { body } = await add(civic);
    expect((await request(app).post(`/api/vehicles/${body.id}/purchase`).set(bearer(user)).send(b)).status).toBe(400);
  });
});

describe("concurrent purchases", () => {
  it("never oversell: 20 simultaneous buyers of 5 cars get exactly 5", async () => {
    const { body } = await add({ ...civic, quantity: 5 });
    const results = await Promise.all(
      Array.from({ length: 20 }, () => request(app).post(`/api/vehicles/${body.id}/purchase`).set(bearer(user))),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(5);
    expect(results.filter((r) => r.status === 409)).toHaveLength(15);
    expect((await request(app).get("/api/vehicles").set(bearer(user))).body[0].quantity).toBe(0);
  });
});

describe("GET /api/inventory/events (audit trail)", () => {
  const events = (token = admin, qs = "") => request(app).get(`/api/inventory/events${qs}`).set(bearer(token));

  it("is admin only", async () => {
    expect((await events(user)).status).toBe(403);
    expect((await request(app).get("/api/inventory/events")).status).toBe(401);
  });

  it("records purchases and restocks newest first, with who and what", async () => {
    const { body } = await add(civic);
    await request(app).post(`/api/vehicles/${body.id}/purchase`).set(bearer(user)).send({ quantity: 2 });
    await request(app).post(`/api/vehicles/${body.id}/restock`).set(bearer(admin)).send({ amount: 10 });
    const res = await events();
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({ kind: "restock", quantity: 10, vehicle: "Honda Civic", userEmail: "admin@x.com" }),
      expect.objectContaining({ kind: "purchase", quantity: 2, vehicle: "Honda Civic", userEmail: "user@x.com", vehicleId: body.id }),
    ]);
    expect(res.body[0].at).toEqual(expect.any(String));
  });

  it("does not record a refused purchase", async () => {
    const { body } = await add({ ...civic, quantity: 0 });
    await request(app).post(`/api/vehicles/${body.id}/purchase`).set(bearer(user));
    expect((await events()).body).toEqual([]);
  });

  it("keeps history after the vehicle is deleted", async () => {
    const { body } = await add(civic);
    await request(app).post(`/api/vehicles/${body.id}/purchase`).set(bearer(user));
    await request(app).delete(`/api/vehicles/${body.id}`).set(bearer(admin));
    expect((await events()).body[0]).toEqual(expect.objectContaining({ vehicle: "Honda Civic", vehicleId: null }));
  });

  it("honours ?limit", async () => {
    const { body } = await add(civic);
    for (let i = 0; i < 3; i++) await request(app).post(`/api/vehicles/${body.id}/purchase`).set(bearer(user));
    expect((await events(admin, "?limit=2")).body).toHaveLength(2);
  });
});

describe("listing: availability, sorting and pagination", () => {
  const cars = [
    { make: "Audi", model: "A4", category: "Sedan", price: 40000, quantity: 2 },
    { make: "BMW", model: "M3", category: "Sedan", price: 70000, quantity: 0 },
    { make: "Chevy", model: "Bolt", category: "Hatch", price: 30000, quantity: 5 },
    { make: "Dodge", model: "Ram", category: "Truck", price: 50000, quantity: 1 },
    { make: "Fiat", model: "500", category: "Hatch", price: 20000, quantity: 9 },
  ];
  const list = (path: string) => request(app).get(path).set(bearer(user));
  const models = (res: { body: { model: string }[] }) => res.body.map((v) => v.model);

  beforeEach(async () => {
    for (const c of cars) await add(c);
  });

  it.each(["/api/vehicles", "/api/vehicles/search"])("%s?available=true hides sold-out vehicles", async (path) => {
    expect(models(await list(`${path}?available=true`))).toEqual(["A4", "Bolt", "Ram", "500"]);
  });

  it("sorts by price ascending or descending", async () => {
    expect(models(await list("/api/vehicles?sort=price"))).toEqual(["500", "Bolt", "A4", "Ram", "M3"]);
    expect(models(await list("/api/vehicles?sort=price&order=desc"))).toEqual(["M3", "Ram", "A4", "Bolt", "500"]);
  });

  it("paginates with limit and offset and reports the total in X-Total-Count", async () => {
    const res = await list("/api/vehicles?limit=2&offset=2");
    expect(models(res)).toEqual(["Bolt", "Ram"]);
    expect(res.headers["x-total-count"]).toBe("5");
  });

  it("reports the filtered total, not the page size", async () => {
    const res = await list("/api/vehicles/search?category=hatch&limit=1");
    expect(models(res)).toEqual(["Bolt"]);
    expect(res.headers["x-total-count"]).toBe("2");
  });

  it.each(["sort=nope", "order=sideways", "limit=0", "limit=101", "offset=-1", "available=maybe"])(
    "rejects %s with 400",
    async (qs) => {
      expect((await list(`/api/vehicles?${qs}`)).status).toBe(400);
    },
  );

  it("does not let sort become SQL", async () => {
    expect((await list("/api/vehicles?sort=price;DROP TABLE vehicles")).status).toBe(400);
    expect((await list("/api/vehicles")).body).toHaveLength(5);
  });
});
