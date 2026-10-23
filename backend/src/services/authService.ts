import { DomainError, type User, type UserRepository } from "../domain";

/** Port: password hashing. */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

/** Port: session tokens. */
export interface TokenService {
  sign(user: User): string;
  verify(token: string): User | undefined;
}

export interface Session {
  token: string;
  user: User;
}

/** Registration and login. Roles are decided here (server side), never by the client. */
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async register(email: string, password: string): Promise<Session> {
    if (this.users.findByEmail(email)) throw emailTaken();
    // create() is the real guard: the UNIQUE constraint also covers two simultaneous registrations.
    const user = this.users.create(email, await this.hasher.hash(password));
    if (!user) throw emailTaken();
    return this.sessionFor(user);
  }

  async login(email: string, password: string): Promise<Session> {
    const row = this.users.findByEmail(email);
    // Same error for unknown email and wrong password: don't reveal which emails exist.
    if (!row || !(await this.hasher.compare(password, row.passwordHash))) {
      throw new DomainError("INVALID_CREDENTIALS", "Invalid email or password");
    }
    return this.sessionFor({ id: row.id, email: row.email, role: row.role });
  }

  authenticate(token: string): User | undefined {
    return this.tokens.verify(token);
  }

  private sessionFor(user: User): Session {
    return { token: this.tokens.sign(user), user };
  }
}

const emailTaken = () => new DomainError("EMAIL_TAKEN", "Email already registered");
