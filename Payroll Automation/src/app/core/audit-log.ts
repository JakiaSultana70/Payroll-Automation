import { Injectable, inject } from '@angular/core';
import { RoleName } from './models/common';
import { AuditLog } from './models/hr';
import { MockApiService } from './mock-db/mock-api';

export interface AuditEntry {
  actorRole: RoleName;
  actorName: string;
  action: string;
  moduleName: string;
  details: string;
}

/**
 * "System: Log Audit Event" from the diagram. Every write in the application
 * goes through here, so the audit page is a real record rather than a fixture.
 *
 * Deliberately fire-and-forget: an audit write must never block or fail the
 * user's action.
 */
@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly api = inject(MockApiService);
  private sequence = 0;

  record(entry: AuditEntry): void {
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const row: AuditLog = {
      id: `audit-${Date.now()}-${this.sequence++}`,
      timestamp,
      ...entry,
    };
    this.api.putMany('auditLogs', [row]).subscribe();
  }
}
