import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  dreaminaLogin,
  dreaminaLogout,
  dreaminaUserCredit,
  parseDreaminaCreditCount,
  parseDreaminaUserId,
  type DreaminaCliOptions,
} from "./dreaminaCli";

export const DEFAULT_DREAMINA_ACCOUNT_ALIAS = "default";
const ALIAS_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$/;

export type DreaminaAccountRecord = {
  alias: string;
  user_id?: string;
  last_credit?: number;
  updated_at: string;
};

export type DreaminaAccountsFile = {
  current?: string;
  accounts: DreaminaAccountRecord[];
};

export const dreaminaAccountsPath = (cwd = process.cwd()): string =>
  path.join(cwd, "state/dreamina/accounts.json");

export const assertDreaminaAccountAlias = (alias: string): string => {
  const trimmed = alias.trim();
  if (!ALIAS_PATTERN.test(trimmed)) {
    throw new Error(
      "Dreamina --account must be 1-32 characters: letters, numbers, _ or -.",
    );
  }
  return trimmed;
};

export const loadDreaminaAccounts = (
  cwd = process.cwd(),
): DreaminaAccountsFile => {
  try {
    const raw = readFileSync(dreaminaAccountsPath(cwd), "utf8");
    const parsed = JSON.parse(raw) as DreaminaAccountsFile;
    if (!parsed || !Array.isArray(parsed.accounts)) {
      return { accounts: [] };
    }
    return {
      current: parsed.current,
      accounts: parsed.accounts.filter(
        (account) => typeof account?.alias === "string",
      ),
    };
  } catch {
    return { accounts: [] };
  }
};

export const saveDreaminaAccounts = (
  store: DreaminaAccountsFile,
  cwd = process.cwd(),
): void => {
  const filePath = dreaminaAccountsPath(cwd);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(store, null, 2)}\n`);
};

export const rememberDreaminaAccount = (input: {
  alias: string;
  userId?: string;
  credit?: number;
  cwd?: string;
  now?: Date;
}): DreaminaAccountsFile => {
  const alias = assertDreaminaAccountAlias(input.alias);
  const cwd = input.cwd ?? process.cwd();
  const store = loadDreaminaAccounts(cwd);
  const updatedAt = (input.now ?? new Date()).toISOString();
  const next: DreaminaAccountRecord = {
    alias,
    user_id: input.userId,
    last_credit: input.credit,
    updated_at: updatedAt,
  };
  const others = store.accounts.filter((account) => account.alias !== alias);
  const saved: DreaminaAccountsFile = {
    current: alias,
    accounts: [...others, next],
  };
  saveDreaminaAccounts(saved, cwd);
  return saved;
};

export const clearCurrentDreaminaAccount = (
  cwd = process.cwd(),
): DreaminaAccountsFile => {
  const store = loadDreaminaAccounts(cwd);
  const saved: DreaminaAccountsFile = {
    current: undefined,
    accounts: store.accounts,
  };
  saveDreaminaAccounts(saved, cwd);
  return saved;
};

export const assertRequestedDreaminaAccount = (
  requested: string | undefined,
  store: DreaminaAccountsFile,
): void => {
  if (!requested) {
    return;
  }
  const alias = assertDreaminaAccountAlias(requested);
  if (store.current !== alias) {
    throw new Error(
      `Dreamina --account=${alias} but current login is ${store.current ?? "(none)"}. Run: npm run media:dreamina -- switch --account ${alias}`,
    );
  }
};

const clipError = (stdout: string, stderr: string): string =>
  `${stdout} ${stderr}`.replace(/\s+/g, " ").trim().slice(0, 280);

const assertCliOk = (
  result: { code: number | null; stdout: string; stderr: string },
  label: string,
): void => {
  if (result.code !== 0) {
    throw new Error(
      `Dreamina ${label} failed: ${clipError(result.stdout, result.stderr) || `exit ${result.code}`}`,
    );
  }
};

export type DreaminaAccountStatus = {
  ok: boolean;
  account?: string;
  user_id?: string;
  credit?: number;
  logged_in: boolean;
  accounts: DreaminaAccountRecord[];
};

export const readDreaminaAccountStatus = async (input: {
  cwd?: string;
  options?: DreaminaCliOptions;
}): Promise<DreaminaAccountStatus> => {
  const cwd = input.cwd ?? process.cwd();
  const store = loadDreaminaAccounts(cwd);
  const creditResult = await dreaminaUserCredit(input.options);
  if (creditResult.code !== 0) {
    return {
      ok: false,
      account: store.current,
      logged_in: false,
      accounts: store.accounts,
    };
  }
  const userId = parseDreaminaUserId(creditResult.stdout);
  const credit = parseDreaminaCreditCount(creditResult.stdout);
  return {
    ok: true,
    account: store.current,
    user_id: userId,
    credit,
    logged_in: true,
    accounts: store.accounts,
  };
};

export const loginDreaminaAccount = async (input: {
  alias: string;
  cwd?: string;
  options?: DreaminaCliOptions;
}): Promise<{
  ok: true;
  account: string;
  user_id?: string;
  credit?: number;
  reused: boolean;
}> => {
  const alias = assertDreaminaAccountAlias(input.alias);
  const cwd = input.cwd ?? process.cwd();
  const store = loadDreaminaAccounts(cwd);

  if (store.current === alias) {
    const creditResult = await dreaminaUserCredit(input.options);
    if (creditResult.code === 0) {
      const userId = parseDreaminaUserId(creditResult.stdout);
      const credit = parseDreaminaCreditCount(creditResult.stdout);
      rememberDreaminaAccount({ alias, userId, credit, cwd });
      return { ok: true, account: alias, user_id: userId, credit, reused: true };
    }
  }

  if (store.current) {
    const logout = await dreaminaLogout(input.options);
    assertCliOk(logout, "logout");
    clearCurrentDreaminaAccount(cwd);
  }

  const login = await dreaminaLogin(input.options);
  assertCliOk(login, "login");
  const creditResult = await dreaminaUserCredit(input.options);
  assertCliOk(creditResult, "user_credit");
  const userId = parseDreaminaUserId(creditResult.stdout);
  const credit = parseDreaminaCreditCount(creditResult.stdout);
  rememberDreaminaAccount({ alias, userId, credit, cwd });
  return { ok: true, account: alias, user_id: userId, credit, reused: false };
};

export const logoutDreaminaAccount = async (input: {
  cwd?: string;
  options?: DreaminaCliOptions;
}): Promise<{ ok: true; account?: string }> => {
  const cwd = input.cwd ?? process.cwd();
  const store = loadDreaminaAccounts(cwd);
  const logout = await dreaminaLogout(input.options);
  assertCliOk(logout, "logout");
  clearCurrentDreaminaAccount(cwd);
  return { ok: true, account: store.current };
};
