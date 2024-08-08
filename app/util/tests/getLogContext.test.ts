import {
  getParamNames,
  getParamsOfInterest,
  getLogContext,
} from "../getLogContext";
import * as helpers from "../getLogContext";
function randomFunctionOne(a: string, b: string, c: string, d: string) {
  return `${a} ${b} ${c} ${d}`;
}

function randomFunctionTwo() {
  return "Random test function";
}

describe("getParamNames", () => {
  test("returns param names in ordered list", () => {
    const paramNames = getParamNames(randomFunctionOne);
    expect(paramNames).toStrictEqual(["a", "b", "c", "d"]);
  });

  test("returns empty array if no params", () => {
    const paramNames = getParamNames(randomFunctionTwo);
    expect(paramNames).toStrictEqual([]);
  });
});

describe("getParamsOfInterest", () => {
  test("returns empty if contains no sessionId, name, id", () => {
    const functionOneParamNames = ["a", "b", "c", "d"];
    const functionOneArguments = ["hello", "1", "2", "3"];
    const paramsOfInterest = getParamsOfInterest(
      functionOneArguments,
      functionOneParamNames,
    );
    expect(paramsOfInterest).toEqual("");
  });

  test("returns empty if array lengths are not equal", () => {
    const functionOneParamNames = ["sessionId", "name", "test", "poke"];
    const functionOneArguments = ["hello", "1", "2"];
    const paramsOfInterest = getParamsOfInterest(
      functionOneArguments,
      functionOneParamNames,
    );
    expect(paramsOfInterest).toEqual("");
  });

  test("returns sessionId, name if contains shop, name, and a random field not id", () => {
    const functionOneParamNames = ["sessionId", "name", "test"];
    const functionOneArguments = ["hello", "1", "2"];
    const paramsOfInterest = getParamsOfInterest(
      functionOneArguments,
      functionOneParamNames,
    );
    expect(paramsOfInterest).toEqual("(sessionId: hello, name: 1)");
  });

  test("returns sessionId, name, and id if contains these fields are in all arguments", () => {
    const functionOneNames = ["sessionId", "name", "id"];
    const functionOneValues = ["a", "b", "c"];

    const paramsOfInterest = getParamsOfInterest(
      functionOneValues,
      functionOneNames,
    );
    expect(paramsOfInterest).toEqual("(sessionId: a, name: b, id: c)");
  });
});

describe("getLogContext", () => {
  let getParamNamesSpy: jest.SpyInstance;
  let getParamsOfInterestSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on the helper functions
    getParamNamesSpy = jest.spyOn(helpers, "getParamNames");
    getParamsOfInterestSpy = jest.spyOn(helpers, "getParamsOfInterest");
  });

  afterEach(() => {
    getParamNamesSpy.mockRestore();
    getParamsOfInterestSpy.mockRestore();
  });

  test("returns formatted string when params of interest are present", () => {
    // Arrange
    const mockFunc = (sessionId: string, name: string, id: string) => {};
    const mockArgs: [string, string, string] = [
      "sessionIdValue",
      "nameValue",
      "idValue",
    ];
    getParamNamesSpy.mockReturnValue(["shop", "name", "id"]);
    getParamsOfInterestSpy.mockReturnValue(
      "(sessionId: sessionIdValue, name: nameValue, id: idValue)",
    );
    const result = getLogContext(mockFunc, ...mockArgs);
    expect(result).toBe(
      "mockFunc (sessionId: sessionIdValue, name: nameValue, id: idValue):",
    );
  });
});
