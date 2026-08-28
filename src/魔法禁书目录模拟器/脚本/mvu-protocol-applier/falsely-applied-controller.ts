export type ProtocolApplicationWriteResult = {
  verified: boolean;
};

export type ProtocolApplicationControllerOptions<T extends ProtocolApplicationWriteResult> = {
  markerMatches: boolean;
  falselyApplied: boolean;
  clearMarker: () => void;
  write: () => Promise<T | null>;
  markApplied: () => void;
  persistMarker: () => Promise<boolean>;
};

export type ProtocolApplicationControllerResult<T extends ProtocolApplicationWriteResult> = {
  action: 'skip' | 'no-patches' | 'write';
  needsRetry: boolean;
  markerPersisted: boolean;
  writeResult?: T;
};

export async function runProtocolApplicationController<T extends ProtocolApplicationWriteResult>(
  options: ProtocolApplicationControllerOptions<T>,
): Promise<ProtocolApplicationControllerResult<T>> {
  if (options.markerMatches && !options.falselyApplied) {
    const markerPersisted = await options.persistMarker();
    return { action: 'skip', needsRetry: !markerPersisted, markerPersisted };
  }

  if (options.markerMatches) options.clearMarker();

  const writeResult = await options.write();
  if (!writeResult) {
    return { action: 'no-patches', needsRetry: false, markerPersisted: false };
  }

  let markerPersisted = false;
  if (writeResult.verified) {
    options.markApplied();
    markerPersisted = await options.persistMarker();
  }

  return {
    action: 'write',
    needsRetry: !writeResult.verified || !markerPersisted,
    markerPersisted,
    writeResult,
  };
}

export function selectFalselyAppliedRepairIndexes(
  chat: ReadonlyArray<{ is_user?: boolean } | undefined>,
  activeGenerationMessageIndex = -1,
): number[] {
  const indexes: number[] = [];
  for (let index = 0; index < chat.length; index += 1) {
    const message = chat[index];
    if (!message || message.is_user || index === activeGenerationMessageIndex) continue;
    indexes.push(index);
  }
  return indexes;
}

export function createObjectKeyedSingleFlight<ObjectKey extends object, SecondaryKey, T>() {
  type State = { tail: Promise<unknown>; flights: Map<SecondaryKey, Promise<T>> };
  const objects = new WeakMap<ObjectKey, State>();
  return (objectKey: ObjectKey, secondaryKey: SecondaryKey, task: () => Promise<T>) => {
    let state = objects.get(objectKey);
    if (!state) {
      state = { tail: Promise.resolve(), flights: new Map() };
      objects.set(objectKey, state);
    }
    const existing = state.flights.get(secondaryKey);
    if (existing) return existing;

    const previous = state.tail;
    const started = previous.catch(() => undefined).then(task);
    const tracked = started.finally(() => {
      if (state?.flights.get(secondaryKey) === tracked) state.flights.delete(secondaryKey);
      if (state?.tail === tracked && state.flights.size === 0) objects.delete(objectKey);
    });
    state.flights.set(secondaryKey, tracked);
    state.tail = tracked;
    return tracked;
  };
}

export function createSingleFlightRunner<T>(task: () => Promise<T>) {
  let running: Promise<T> | null = null;
  return () => {
    if (running) return running;
    const started = Promise.resolve().then(task);
    const tracked = started.finally(() => {
      if (running === tracked) running = null;
    });
    running = tracked;
    return tracked;
  };
}

export function createDebouncedSingleFlight<T, Timer>(options: {
  task: () => Promise<T>;
  delay: number;
  schedule: (callback: () => void, delay: number) => Timer;
  cancel: (timer: Timer) => void;
  onError: (error: unknown) => void;
}) {
  const runSingleFlight = createSingleFlightRunner(options.task);
  let timer: Timer | undefined;
  let running = false;
  let trailing = false;
  let generation = 0;

  const runWithTrailing = async () => {
    const runGeneration = generation;
    if (running) {
      trailing = true;
      return runSingleFlight();
    }
    running = true;
    try {
      let result: T;
      do {
        trailing = false;
        result = await runSingleFlight();
      } while (trailing && runGeneration === generation);
      return result;
    } finally {
      running = false;
    }
  };

  const cancelPending = () => {
    if (timer === undefined) return;
    options.cancel(timer);
    timer = undefined;
  };

  return {
    trigger() {
      cancelPending();
      timer = options.schedule(() => {
        timer = undefined;
        void runWithTrailing().catch(options.onError);
      }, options.delay);
    },
    runNow() {
      cancelPending();
      return runWithTrailing();
    },
    cancel() {
      generation += 1;
      trailing = false;
      cancelPending();
    },
  };
}
