/**
 * Puts the accounts the auth specs sign in with into a running radarge-api.
 *
 * The API has no self-registration: an administrator has to exist first, created
 * by the API's own BOOTSTRAP_ADMIN_* variables, and everyone else is created
 * through it. Re-running this is safe — an account that already exists answers
 * `conflict` and is left as it is.
 *
 * Every scenario gets its own account on purpose. Sign-in is throttled per
 * username (ten attempts per five minutes) and the throttle counts successes as
 * well, so specs sharing one account lock each other out. Signing out is the
 * other reason: it ends that account's session on every device, which would
 * knock over a spec running beside it.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const ADMIN = { username: "admin", password: "radarge-dev-admin-2026" };

export interface TestAccount {
  name: string;
  username: string;
  provisionalPassword: string;
  /** Absent when the account is meant to stay on its provisional password. */
  password?: string;
}

export const ACCOUNTS = {
  signIn: {
    name: "Ana Professora",
    username: "e2e.entrada",
    provisionalPassword: "provisoria-entrada-1",
    password: "definitiva-entrada-1",
  },
  wrongPassword: {
    name: "Bruno Professor",
    username: "e2e.senha.errada",
    provisionalPassword: "provisoria-errada-1",
    password: "definitiva-errada-1",
  },
  reload: {
    name: "Carla Professora",
    username: "e2e.recarga",
    provisionalPassword: "provisoria-recarga-1",
    password: "definitiva-recarga-1",
  },
  logout: {
    name: "Diego Professor",
    username: "e2e.saida",
    provisionalPassword: "provisoria-saida-1",
    password: "definitiva-saida-1",
  },
  provisional: {
    name: "Elena Professora",
    username: "e2e.provisoria",
    provisionalPassword: "provisoria-mantida-1",
  },
} as const satisfies Record<string, TestAccount>;

interface Session {
  accessToken: string;
}

const post = async (path: string, body: unknown, token?: string): Promise<Response> =>
  fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });

const signIn = async (username: string, password: string): Promise<string | null> => {
  const response = await post("/auth/login", { username, password });
  if (!response.ok) return null;
  const session = (await response.json()) as Session;
  return session.accessToken;
};

const ensureProfile = async (token: string, account: TestAccount): Promise<void> => {
  const response = await post(
    "/profiles",
    {
      name: account.name,
      username: account.username,
      password: account.provisionalPassword,
      role: "teacher",
    },
    token,
  );

  if (!response.ok && response.status !== 409) {
    throw new Error(`could not create ${account.username}: ${String(response.status)}`);
  }
};

/**
 * Spends the provisional password once so the spec that needs an ordinary sign-in
 * is not also the one exercising the password screen. A second run finds the
 * password already settled and the sign-in returns null, which is the skip.
 */
const settlePassword = async (account: TestAccount): Promise<void> => {
  if (account.password === undefined) return;

  const token = await signIn(account.username, account.provisionalPassword);
  if (token === null) return;

  await post(
    "/auth/change-password",
    { currentPassword: account.provisionalPassword, newPassword: account.password },
    token,
  );
};

export const seedAuthAccounts = async (): Promise<void> => {
  const adminToken = await signIn(ADMIN.username, ADMIN.password);

  if (adminToken === null) {
    throw new Error(
      `no administrator at ${API_URL}. Start radarge-api with BOOTSTRAP_ADMIN_* set, then rotate the provisional password to ${ADMIN.password}.`,
    );
  }

  for (const account of Object.values(ACCOUNTS)) {
    await ensureProfile(adminToken, account);
    await settlePassword(account);
  }
};
