import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertDreaminaAccountAlias,
  assertRequestedDreaminaAccount,
  loadDreaminaAccounts,
  loginDreaminaAccount,
  logoutDreaminaAccount,
  rememberDreaminaAccount,
} from "../src/media/dreaminaAccounts";
import {
  dreaminaLogin,
  dreaminaLogout,
  parseDreaminaCreditCount,
  parseDreaminaUserId,
} from "../src/media/dreaminaCli";

const tempCwd = (): string => mkdtempSync(path.join(tmpdir(), "ai-remotion-dreamina-acct-"));

describe("dreamina account registry", () => {
  it("rejects invalid aliases", () => {
    expect(() => assertDreaminaAccountAlias("")).toThrow(/--account/);
    expect(() => assertDreaminaAccountAlias("has space")).toThrow(/--account/);
  });

  it("remembers the current alias without storing tokens", () => {
    const cwd = tempCwd();
    rememberDreaminaAccount({
      alias: "main",
      userId: "4069738233206040",
      credit: 120,
      cwd,
      now: new Date("2026-08-21T02:00:00.000Z"),
    });
    const store = loadDreaminaAccounts(cwd);
    expect(store.current).toBe("main");
    expect(store.accounts[0]).toMatchObject({
      alias: "main",
      user_id: "4069738233206040",
      last_credit: 120,
    });
    expect(JSON.stringify(store)).not.toMatch(/token|cookie|secret/i);
    expect(readFileSync(path.join(cwd, "state/dreamina/accounts.json"), "utf8")).toContain(
      "main",
    );
  });

  it("refuses generate --account when it is not the current login", () => {
    const cwd = tempCwd();
    rememberDreaminaAccount({ alias: "main", userId: "1", cwd });
    expect(() =>
      assertRequestedDreaminaAccount("backup", loadDreaminaAccounts(cwd)),
    ).toThrow(/switch --account backup/);
    expect(() =>
      assertRequestedDreaminaAccount("main", loadDreaminaAccounts(cwd)),
    ).not.toThrow();
  });

  it("parses user_id and credit from CLI JSON", () => {
    const stdout = '{"user_id":4069738233206040,"total_credit":75}';
    expect(parseDreaminaUserId(stdout)).toBe("4069738233206040");
    expect(parseDreaminaCreditCount(stdout)).toBe(75);
  });

  it("reuses the current login without calling logout", async () => {
    const cwd = tempCwd();
    rememberDreaminaAccount({ alias: "main", userId: "1", cwd });
    const calls: string[][] = [];
    const result = await loginDreaminaAccount({
      alias: "main",
      cwd,
      options: {
        run: async (_bin, args) => {
          calls.push(args);
          return {
            code: 0,
            stdout: '{"user_id":"1","total_credit":10}',
            stderr: "",
          };
        },
      },
    });
    expect(result.reused).toBe(true);
    expect(calls).toEqual([["user_credit"]]);
  });

  it("logs out the current account then logs in the requested alias", async () => {
    const cwd = tempCwd();
    rememberDreaminaAccount({ alias: "main", userId: "1", cwd });
    const calls: string[][] = [];
    const result = await loginDreaminaAccount({
      alias: "backup",
      cwd,
      options: {
        run: async (_bin, args) => {
          calls.push(args);
          return {
            code: 0,
            stdout: '{"user_id":"2","total_credit":40}',
            stderr: "",
          };
        },
      },
    });
    expect(result).toMatchObject({
      ok: true,
      account: "backup",
      user_id: "2",
      credit: 40,
      reused: false,
    });
    expect(calls[0]).toEqual(["logout"]);
    expect(calls[1]).toEqual(["login"]);
    expect(calls[2]).toEqual(["user_credit"]);
    expect(loadDreaminaAccounts(cwd).current).toBe("backup");
  });

  it("clears current after logout", async () => {
    const cwd = tempCwd();
    rememberDreaminaAccount({ alias: "main", userId: "1", cwd });
    await logoutDreaminaAccount({
      cwd,
      options: {
        run: async () => ({ code: 0, stdout: "ok", stderr: "" }),
      },
    });
    expect(loadDreaminaAccounts(cwd).current).toBeUndefined();
  });

  it("runs official login and logout through the adapter", async () => {
    const loginCalls: string[][] = [];
    await dreaminaLogin({
      interactive: false,
      run: async (_bin, args) => {
        loginCalls.push(args);
        return { code: 0, stdout: "ok", stderr: "" };
      },
    });
    expect(loginCalls[0]).toEqual(["login"]);
    const logoutCalls: string[][] = [];
    await dreaminaLogout({
      run: async (_bin, args) => {
        logoutCalls.push(args);
        return { code: 0, stdout: "ok", stderr: "" };
      },
    });
    expect(logoutCalls[0]).toEqual(["logout"]);
  });
});
