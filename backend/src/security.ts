import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { User } from "./domain";
import type { PasswordHasher, TokenService } from "./services/authService";

export class BcryptHasher implements PasswordHasher {
  constructor(private readonly rounds = 10) {}
  hash = (password: string) => bcrypt.hash(password, this.rounds);
  compare = (password: string, hash: string) => bcrypt.compare(password, hash);
}

export class JwtTokens implements TokenService {
  constructor(private readonly secret: string) {}

  sign({ id, email, role }: User) {
    return jwt.sign({ id, email, role }, this.secret, { expiresIn: "8h" });
  }

  verify(token: string): User | undefined {
    try {
      const { id, email, role } = jwt.verify(token, this.secret) as User;
      return { id, email, role };
    } catch {
      return undefined;
    }
  }
}
