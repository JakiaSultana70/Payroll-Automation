import { RoleName } from '../models/common';

/**
 * Static demo accounts — one per role.
 *
 * A real system stores a salted hash (the class diagram has
 * `User.passwordHash`) and never ships credentials in the bundle. This is a
 * mock with no backend, so the passwords live here in clear text and are shown
 * on the sign-in screen on purpose. Do not copy this file into anything real.
 */
export interface DemoCredential {
  username: string;
  password: string;
  role: RoleName;
  /** The seeded AppUser this account signs in as. */
  userId: string;
}

export const DEMO_CREDENTIALS: DemoCredential[] = [
  { username: 'farhana.islam', password: 'Admin@2026', role: 'Admin', userId: 'u7' },
  { username: 'nasrin.akter', password: 'Hr@2026', role: 'HR', userId: 'u1' },
  { username: 'rakib.hasan', password: 'Accounts@2026', role: 'Accountant', userId: 'u2' },
  { username: 'tanvir.ahmed', password: 'Staff@2026', role: 'Employee', userId: 'u4' },
];

export function findCredential(username: string): DemoCredential | undefined {
  return DEMO_CREDENTIALS.find(
    (row) => row.username.toLowerCase() === username.trim().toLowerCase(),
  );
}
