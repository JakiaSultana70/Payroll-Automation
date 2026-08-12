import { Injectable } from '@angular/core';

const STORAGE_KEY = 'payflow.password-overrides';

/**
 * Demo credentials (`demo-credentials.ts`) ship as a static, read-only list —
 * there is no backend to persist a real password change against. This store
 * layers a per-username override on top of that list, kept in
 * `sessionStorage` so "Change password" actually takes effect for the rest
 * of the browser session, the same way the signed-in session itself does.
 */
@Injectable({ providedIn: 'root' })
export class PasswordStore {
  private overrides: Record<string, string> = this.restore();

  /** Returns the overridden password for this username, if one was set. */
  passwordFor(username: string): string | undefined {
    return this.overrides[username.toLowerCase()];
  }

  set(username: string, password: string): void {
    this.overrides = { ...this.overrides, [username.toLowerCase()]: password };
    this.persist();
  }

  private persist(): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.overrides));
  }

  private restore(): Record<string, string> {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  }
}
