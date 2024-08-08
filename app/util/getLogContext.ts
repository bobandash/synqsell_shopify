// utility function to get the context for logs
// pass the function name and parameters makes it easier to debug
type Fn<T extends any[]> = (...args: T) => any;

export function getLogCombinedMessage<T extends any[]>(
  func: Fn<T>,
  message: string,
  ...args: T
) {
  const context = getLogContext(func, ...args);
  return `${context}: ${message}`;
}

export function getLogContext<T extends any[]>(
  func: Fn<T>,
  ...args: T
): string {
  const paramNames = getParamNames(func);
  const paramValues = [...args];
  const paramsOfInterest = getParamsOfInterest(paramValues, paramNames);
  if (paramsOfInterest) {
    return `${func.name} ${paramsOfInterest}:`;
  }
  return `${func.name}:`;
}

export function getParamNames(func: Function) {
  const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
  const ARGUMENT_NAMES = /([^\s,]+)/g;
  const fnStr = func.toString().replace(STRIP_COMMENTS, "");
  const result = fnStr
    .slice(fnStr.indexOf("(") + 1, fnStr.indexOf(")"))
    .match(ARGUMENT_NAMES);
  if (result === null) return [];
  return result;
}

export function getParamsOfInterest(
  paramValues: String[],
  paramNames: String[],
) {
  let paramsOfInterest = [];
  if (paramValues.length === paramNames.length) {
    // TODO: Figure out a more flexible way to do this
    // The only params that can benefit log status is shop, name, and id
    // Do not want to include any PII in the log warn
    for (let i = 0; i < paramValues.length; i++) {
      if (
        paramNames[i] === "shop" ||
        paramNames[i] === "name" ||
        paramNames[i] === "id"
      ) {
        paramsOfInterest.push(`${paramNames[i]}: ${paramValues[i]}`);
      }
    }
  }

  if (paramsOfInterest.length === 0) {
    return "";
  }

  return `(${paramsOfInterest.join(", ")})`;
}
