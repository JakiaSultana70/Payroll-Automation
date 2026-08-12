import { Injectable } from '@angular/core';
import { RoleName } from '../models/common';

const STORAGE_KEY = 'payflow.runtime-credentials';

export interface RuntimeCredential {
  username: string;
  password: string;
  role: RoleName;
  userId: string;
}

/**
 * `demo-credentials.ts` is a fixed, seeded list — there's nowhere to put a
 * user created from the "Users & Roles" page. This store fills that gap so a
 * freshly-created account can actually sign in for the rest of the browser
 * session, the same way `PasswordStore` lets a changed password stick.
 */
@Injectable({ providedIn: 'root' })
export class RuntimeCredentialStore {
  private credentials: RuntimeCredential[] = this.restore();

  find(username: string): RuntimeCredential | undefined {
    const needle = username.trim().toLowerCase();
    return this.credentials.find((row) => row.username.toLowerCase() === needle);
  }

  add(credential: RuntimeCredential): void {
    this.credentials = [
      ...this.credentials.filter((row) => row.username.toLowerCase() !== credential.username.toLowerCase()),
      credential,
    ];
    this.persist();
  }

  private persist(): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.credentials));
  }

  private restore(): RuntimeCredential[] {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as RuntimeCredential[]) : [];
    } catch {
      return [];
    }
  }
}
