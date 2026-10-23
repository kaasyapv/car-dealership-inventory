import { beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "../src/domain";
import { AuthService } from "../src/services/authService";
import { FakeUserRepository } from "./fakes";

/** Deterministic stand-ins for bcrypt/JWT so the service is tested in isolation. */
let compares = 0;
const hasher = {
  hash: async (p: string) => `hashed:${p}`,
  compare: async (p: string, h: string) => (compares++, h === `hashed:${p}`),
};
const tokens = { sign: (u: { id: number }) => `token-${u.id}`, verify: () => undefined };

let service: AuthService;
beforeEach(() => {
  compares = 0;
  service = new AuthService(new FakeUserRepository(), hasher, tokens);
});

const codeOf = async (p: Promise<unknown>) => ((await p.catch((e) => e)) as DomainError).code;

describe("AuthService", () => {
  it("makes the first registered user an admin and later ones users", async () => {
    expect((await service.register("a@x.com", "password123")).user.role).toBe("admin");
    expect((await service.register("b@x.com", "password123")).user.role).toBe("user");
  });

  it("returns a signed token and never the hash", async () => {
    const session = await service.register("a@x.com", "password123");
    expect(session.token).toBe("token-1");
    expect(JSON.stringify(session)).not.toContain("hashed");
  });

  it("rejects a duplicate email regardless of case", async () => {
    await service.register("a@x.com", "password123");
    expect(await codeOf(service.register("A@X.com", "password123"))).toBe("EMAIL_TAKEN");
  });

  it("logs in with the right password", async () => {
    await service.register("a@x.com", "password123");
    expect((await service.login("a@x.com", "password123")).user.email).toBe("a@x.com");
  });

  it("gives the same INVALID_CREDENTIALS for a wrong password and an unknown email", async () => {
    await service.register("a@x.com", "password123");
    expect(await codeOf(service.login("a@x.com", "wrong-password"))).toBe("INVALID_CREDENTIALS");
    expect(await codeOf(service.login("nobody@x.com", "password123"))).toBe("INVALID_CREDENTIALS");
  });

  it("does the same hashing work for an unknown email, so response time doesn't reveal which emails exist", async () => {
    await codeOf(service.login("nobody@x.com", "password123"));
    expect(compares).toBe(1);
  });
});
