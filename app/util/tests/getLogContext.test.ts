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
  test("returns empty if contains no shop, name, id", () => {
    const functionOneParamNames = ["a", "b", "c", "d"];
    const functionOneArguments = ["hello", "1", "2", "3"];
    const paramsOfInterest = getParamsOfInterest(
      functionOneArguments,
      functionOneParamNames,
    );
    expect(paramsOfInterest).toEqual("");
  });

  test("returns empty if array lengths are not equal", () => {
    const functionOneParamNames = ["shop", "name", "test", "poke"];
    const functionOneArguments = ["hello", "1", "2"];
    const paramsOfInterest = getParamsOfInterest(
      functionOneArguments,
      functionOneParamNames,
    );
    expect(paramsOfInterest).toEqual("");
  });

  test("returns shop, name if contains shop, name, and a random field not id", () => {
    const functionOneParamNames = ["shop", "name", "test"];
    const functionOneArguments = ["hello", "1", "2"];
    const paramsOfInterest = getParamsOfInterest(
      functionOneArguments,
      functionOneParamNames,
    );
    expect(paramsOfInterest).toEqual("(shop: hello, name: 1)");
  });

  test("returns shop, name, and id if contains these fields are in all arguments", () => {
    const functionOneNames = ["shop", "name", "id"];
    const functionOneValues = ["a", "b", "c"];

    const paramsOfInterest = getParamsOfInterest(
      functionOneValues,
      functionOneNames,
    );
    expect(paramsOfInterest).toEqual("(shop: a, name: b, id: c)");
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
    const mockFunc = (shop: string, name: string, id: string) => {};
    const mockArgs: [string, string, string] = [
      "shopValue",
      "nameValue",
      "idValue",
    ];
    getParamNamesSpy.mockReturnValue(["shop", "name", "id"]);
    getParamsOfInterestSpy.mockReturnValue(
      "(shop: shopValue, name: nameValue, id: idValue)",
    );
    const result = getLogContext(mockFunc, ...mockArgs);
    expect(result).toBe(
      "mockFunc (shop: shopValue, name: nameValue, id: idValue):",
    );
  });
});
