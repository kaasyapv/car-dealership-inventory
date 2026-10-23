import { beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "../src/domain";
import { InventoryService } from "../src/services/inventoryService";
import { FakeVehicleRepository } from "./fakes";

const civic = { make: "Honda", model: "Civic", category: "Sedan", price: 22000, quantity: 3 };

let repo: FakeVehicleRepository;
let service: InventoryService;

beforeEach(() => {
  repo = new FakeVehicleRepository();
  service = new InventoryService(repo);
});

/** Asserts the promise-free call throws a DomainError with the given code. */
const expectCode = (fn: () => unknown, code: string) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(DomainError);
    expect((e as DomainError).code).toBe(code);
    return;
  }
  throw new Error(`expected DomainError ${code}`);
};

describe("InventoryService", () => {
  it("creates a vehicle", () => {
    expect(service.create(civic)).toEqual({ id: 1, ...civic });
  });

  it("merges a partial update onto the existing vehicle", () => {
    const { id } = service.create(civic);
    expect(service.update(id, { price: 21000 })).toEqual({ id, ...civic, price: 21000 });
  });

  it("raises NOT_FOUND when updating, deleting, buying or restocking an unknown vehicle", () => {
    expectCode(() => service.update(9, { price: 1 }), "NOT_FOUND");
    expectCode(() => service.remove(9), "NOT_FOUND");
    expectCode(() => service.purchase(9), "NOT_FOUND");
    expectCode(() => service.restock(9, 1), "NOT_FOUND");
  });

  it("purchase decreases stock", () => {
    const { id } = service.create(civic);
    expect(service.purchase(id).quantity).toBe(2);
  });

  it("purchase of the last unit succeeds, the next raises OUT_OF_STOCK and stock stays 0", () => {
    const { id } = service.create({ ...civic, quantity: 1 });
    service.purchase(id);
    expectCode(() => service.purchase(id), "OUT_OF_STOCK");
    expect(repo.find(id)?.quantity).toBe(0);
  });

  it("restock increases stock", () => {
    const { id } = service.create(civic);
    expect(service.restock(id, 5).quantity).toBe(8);
  });
});
