type Fn<T extends any[]> = (...args: T) => Promise<any>;

function createRetryFunction<T extends any[]>(func: Fn<T>, ...args: T) {
  return () => func(...args);
}

export default createRetryFunction;
