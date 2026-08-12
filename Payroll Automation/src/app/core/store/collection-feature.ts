import { EnvironmentProviders, inject } from '@angular/core';
import { EntityState, createEntityAdapter } from '@ngrx/entity';
import { Actions, createEffect, ofType, provideEffects } from '@ngrx/effects';
import {
  ActionReducer,
  MemoizedSelector,
  Selector,
  createAction,
  createFeatureSelector,
  createReducer,
  createSelector,
  on,
  props,
  provideState,
} from '@ngrx/store';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { CollectionKey } from '../mock-db/mock-db';
import { MockApiService } from '../mock-db/mock-api';

export interface CollectionState<T> extends EntityState<T> {
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

interface HasId {
  id: string;
}

/**
 * Thirteen modules times (actions + reducer + selectors + effects) is thirteen
 * copies of the same code. This factory produces a typed, @ngrx/entity-backed
 * bundle so each module's store file stays about fifteen lines. Modules needing
 * extra state compose on top of this rather than forking it.
 */
export function createCollectionFeature<T extends HasId>(config: {
  /** Feature state key, e.g. 'styles'. */
  name: string;
  /** Key into the central mock database. */
  collection: CollectionKey;
  sortComparer?: (a: T, b: T) => number;
}) {
  const adapter = createEntityAdapter<T>({
    sortComparer: config.sortComparer ?? false,
  });

  const initialState: CollectionState<T> = adapter.getInitialState({
    loading: false,
    loaded: false,
    error: null,
  });

  // Built with createAction rather than createActionGroup: the latter requires a
  // string-literal `source`, which a generic factory cannot supply.
  const actions = {
    load: createAction(`[${config.name}] load`),
    loadSuccess: createAction(`[${config.name}] load success`, props<{ items: T[] }>()),
    loadFailure: createAction(`[${config.name}] load failure`, props<{ error: string }>()),
    upsert: createAction(`[${config.name}] upsert`, props<{ item: T }>()),
    upsertSuccess: createAction(`[${config.name}] upsert success`, props<{ item: T }>()),
    upsertMany: createAction(`[${config.name}] upsert many`, props<{ items: T[] }>()),
    upsertManySuccess: createAction(
      `[${config.name}] upsert many success`,
      props<{ items: T[] }>(),
    ),
    create: createAction(`[${config.name}] create`, props<{ item: T }>()),
    createSuccess: createAction(`[${config.name}] create success`, props<{ item: T }>()),
    createFailure: createAction(`[${config.name}] create failure`, props<{ error: string }>()),
    remove: createAction(`[${config.name}] remove`, props<{ id: string }>()),
    removeSuccess: createAction(`[${config.name}] remove success`, props<{ id: string }>()),
    removeFailure: createAction(`[${config.name}] remove failure`, props<{ error: string }>()),
  };

  const reducer = createReducer(
    initialState,
    on(actions.load, (state) => ({ ...state, loading: true, error: null })),
    on(actions.loadSuccess, (state, { items }) =>
      adapter.setAll(items, { ...state, loading: false, loaded: true }),
    ),
    on(actions.loadFailure, (state, { error }) => ({
      ...state,
      loading: false,
      error,
    })),
    on(actions.upsertSuccess, (state, { item }) => adapter.upsertOne(item, state)),
    on(actions.upsertManySuccess, (state, { items }) => adapter.upsertMany(items, state)),
    on(actions.createSuccess, (state, { item }) => adapter.addOne(item, { ...state, error: null })),
    on(actions.createFailure, (state, { error }) => ({ ...state, error })),
    on(actions.removeSuccess, (state, { id }) => adapter.removeOne(id, { ...state, error: null })),
    on(actions.removeFailure, (state, { error }) => ({ ...state, error })),
  );

  const selectState = createFeatureSelector<CollectionState<T>>(config.name);
  const entitySelectors = adapter.getSelectors(selectState);

  const selectors = {
    state: selectState,
    all: entitySelectors.selectAll,
    entities: entitySelectors.selectEntities,
    total: entitySelectors.selectTotal,
    loading: createSelector(selectState, (state) => state.loading),
    loaded: createSelector(selectState, (state) => state.loaded),
    error: createSelector(selectState, (state) => state.error),
    byId: (id: string) =>
      createSelector(entitySelectors.selectEntities, (entities) => entities[id]),
    where: (predicate: (item: T) => boolean) =>
      createSelector(entitySelectors.selectAll, (items) => items.filter(predicate)),
  };

  const effects = {
    load: createEffect(
      (actions$ = inject(Actions), api = inject(MockApiService)) =>
        actions$.pipe(
          ofType(actions.load),
          switchMap(() =>
            api.list<T>(config.collection).pipe(
              map((items) => actions.loadSuccess({ items })),
              catchError((error: unknown) =>
                of(actions.loadFailure({ error: describe(error) })),
              ),
            ),
          ),
        ),
      { functional: true },
    ),

    upsert: createEffect(
      (actions$ = inject(Actions), api = inject(MockApiService)) =>
        actions$.pipe(
          ofType(actions.upsert),
          switchMap(({ item }) =>
            api.update<T>(config.collection, item).pipe(
              map((saved) => actions.upsertSuccess({ item: saved })),
              catchError((error: unknown) =>
                of(actions.loadFailure({ error: describe(error) })),
              ),
            ),
          ),
        ),
      { functional: true },
    ),

    upsertMany: createEffect(
      (actions$ = inject(Actions), api = inject(MockApiService)) =>
        actions$.pipe(
          ofType(actions.upsertMany),
          switchMap(({ items }) =>
            api.putMany<T>(config.collection, items).pipe(
              map((saved) => actions.upsertManySuccess({ items: saved })),
              catchError((error: unknown) =>
                of(actions.loadFailure({ error: describe(error) })),
              ),
            ),
          ),
        ),
      { functional: true },
    ),

    create: createEffect(
      (actions$ = inject(Actions), api = inject(MockApiService)) =>
        actions$.pipe(
          ofType(actions.create),
          switchMap(({ item }) =>
            api.create<T>(config.collection, item).pipe(
              map((saved) => actions.createSuccess({ item: saved })),
              catchError((error: unknown) =>
                of(actions.createFailure({ error: describe(error) })),
              ),
            ),
          ),
        ),
      { functional: true },
    ),

    remove: createEffect(
      (actions$ = inject(Actions), api = inject(MockApiService)) =>
        actions$.pipe(
          ofType(actions.remove),
          switchMap(({ id }) =>
            api.remove(config.collection, id).pipe(
              map(() => actions.removeSuccess({ id })),
              catchError((error: unknown) =>
                of(actions.removeFailure({ error: describe(error) })),
              ),
            ),
          ),
        ),
      { functional: true },
    ),
  };

  return { name: config.name, adapter, actions, reducer, selectors, effects };
}

export type CollectionFeature<T extends HasId> = ReturnType<
  typeof createCollectionFeature<T>
>;

/** Route-level providers, so each module's slice loads with its routes. */
export function provideCollection<T extends HasId>(
  feature: CollectionFeature<T>,
): EnvironmentProviders[] {
  return [provideState(feature.name, feature.reducer), provideEffects(feature.effects)];
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Re-exported so module stores do not each import from deep @ngrx paths. */
export type { ActionReducer, MemoizedSelector, Observable, Selector };
