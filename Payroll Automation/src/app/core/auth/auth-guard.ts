import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { moduleByPath } from '../module-registry';
import { SessionService } from '../session';

/** Blocks the application shell until someone is signed in. */
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (session.isAuthenticated()) {
    return true;
  }
  // Remember where they were headed so sign-in can return them there.
  return router.createUrlTree(['/login'], { queryParams: { next: state.url } });
};

/** Keeps a signed-in user off the sign-in screen. */
export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);
  return session.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};

/**
 * Enforces the sidebar's role rules as actual route access — typing a URL for
 * a module your role cannot see sends you back to your dashboard, rather than
 * rendering a page you are not entitled to.
 */
export const roleGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);

  const segments = state.url.split('?')[0].split('/').filter(Boolean);
  const mod = moduleByPath(segments[0] ?? '');
  if (!mod) {
    return true;
  }
  if (mod.roles.includes(session.role())) {
    return true;
  }
  // Everyone may open their own employee record, whatever their role — that is
  // "view profile" in the diagram, and it is what the header's My profile link
  // points at. Without this, the link is dead for Employee and Accountant.
  if (segments[0] === 'employees' && segments[1] === session.employeeId()) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
