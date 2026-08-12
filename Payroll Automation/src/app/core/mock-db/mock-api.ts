import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { CollectionKey, MOCK_DB } from './mock-db';

/** Simulated round-trip, so loading states are real rather than theoretical. */
const LATENCY_MS = 250;

interface HasId {
  id: string;
}

/**
 * Stands in for an HTTP backend. Holds a mutable working copy of MOCK_DB so
 * creates and edits survive navigation within a session; a page reload resets
 * to the seed, which is an accepted trade-off for a mock app.
 */
@Injectable({ providedIn: 'root' })
export class MockApiService {
  private readonly db = structuredClone(MOCK_DB) as Record<string, HasId[]>;

  list<T extends HasId>(collection: CollectionKey): Observable<T[]> {
    return of(this.rows<T>(collection).slice()).pipe(delay(LATENCY_MS));
  }

  get<T extends HasId>(collection: CollectionKey, id: string): Observable<T> {
    const found = this.rows<T>(collection).find((row) => row.id === id);
    return found
      ? of(structuredClone(found)).pipe(delay(LATENCY_MS))
      : throwError(() => new Error(`${collection}/${id} not found`)).pipe(delay(LATENCY_MS));
  }

  create<T extends HasId>(collection: CollectionKey, row: T): Observable<T> {
    this.rows<T>(collection).push(row);
    return of(structuredClone(row)).pipe(delay(LATENCY_MS));
  }

  update<T extends HasId>(collection: CollectionKey, row: T): Observable<T> {
    const rows = this.rows<T>(collection);
    const index = rows.findIndex((existing) => existing.id === row.id);
    if (index === -1) {
      return throwError(() => new Error(`${collection}/${row.id} not found`));
    }
    rows[index] = row;
    return of(structuredClone(row)).pipe(delay(LATENCY_MS));
  }

  /** Insert-or-replace a set of rows in one round trip. The payroll engine
   *  writes a whole cycle's payslips at once, so a per-row update would be
   *  both slow and wrong (new payslips do not exist yet). */
  putMany<T extends HasId>(collection: CollectionKey, incoming: T[]): Observable<T[]> {
    const rows = this.rows<T>(collection);
    for (const row of incoming) {
      const index = rows.findIndex((existing) => existing.id === row.id);
      if (index === -1) {
        rows.push(row);
      } else {
        rows[index] = row;
      }
    }
    return of(structuredClone(incoming)).pipe(delay(LATENCY_MS));
  }

  remove(collection: CollectionKey, id: string): Observable<string> {
    const rows = this.rows(collection);
    const index = rows.findIndex((row) => row.id === id);
    if (index > -1) {
      rows.splice(index, 1);
    }
    return of(id).pipe(delay(LATENCY_MS));
  }

  /** Synchronous read for cross-module lookups that are not worth a store. */
  peek<T extends HasId>(collection: CollectionKey): T[] {
    return this.rows<T>(collection);
  }

  private rows<T extends HasId = HasId>(collection: CollectionKey): T[] {
    return this.db[collection] as T[];
  }
}
