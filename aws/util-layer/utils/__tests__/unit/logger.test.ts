import winston from "winston";
import { simpleFaker } from "@faker-js/faker";
import { logError, logInfo, exportsForTesting } from "../../logger";
if (!exportsForTesting) {
  throw new Error("Tests are not in a test environment");
}
const { logger, isPostgresError } = exportsForTesting;

describe("isPostgresError", () => {
  it("should return true if error has code", () => {
    const error = new Error("test");
    (error as any).code = "1001";
    expect(isPostgresError(error)).toBe(true);
  });

  it("should return false if error has does not code", () => {
    const error = new Error("test");
    expect(isPostgresError(error)).toBe(false);
  });

  it("should return false if non-error is passed", () => {
    expect(isPostgresError("123")).toBe(false);
  });
});

describe("logInfo", () => {
  const infoSpy = jest.spyOn(logger, "info");
  beforeEach(() => {
    infoSpy.mockClear();
  });

  it("should call logger info with message and context", () => {
    const context = {
      webhookId: simpleFaker.string.uuid(),
      sessionId: simpleFaker.string.uuid(),
      accountId: simpleFaker.string.uuid(),
      shop: simpleFaker.string.alpha(10),
    };

    logInfo("test message", { ...context });
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "info",
        message: "test message",
        ...context,
      })
    );
  });

  it("should call logger info with only message", () => {
    logInfo("test message", {});
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "info",
        message: "test message",
      })
    );
  });
});

describe("logError", () => {
  const errorSpy = jest.spyOn(logger, "error");
  const context = {
    webhookId: simpleFaker.string.uuid(),
    sessionId: simpleFaker.string.uuid(),
    accountId: simpleFaker.string.uuid(),
    context: "Example error context or message",
    eventDetails: {
      eventType: "exampleEvent",
      timestamp: new Date().toISOString(),
    },
    shop: "example-shop.myshopify.com",
  };

  beforeEach(() => {
    errorSpy.mockClear();
  });

  describe("Postgres Error", () => {
    const errorDetails = {
      message: "test message",
      code: "1001",
      table: "Session",
      schema: "Public",
    };
    let error: Error;

    beforeEach(() => {
      error = new Error(errorDetails.message);
      (error as any).code = errorDetails.code;
      (error as any).table = errorDetails.table;
      (error as any).schema = errorDetails.schema;
    });

    it("should log postgres errors properly w/out context", () => {
      logError(error, {});
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
          name: "PostgresError",
          ...errorDetails,
        })
      );
    });

    it("should log postgres errors properly with context", () => {
      logError(error, { ...context });
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
          name: "PostgresError",
          ...errorDetails,
          ...context,
        })
      );
    });
  });

  describe("Regular Error", () => {
    const errorDetails = {
      message: "test message",
    };
    let error: Error;

    beforeEach(() => {
      error = new Error(errorDetails.message);
    });

    it("should log regular error properly w/out context", () => {
      logError(error, {});
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
          ...errorDetails,
          stack: error.stack,
          name: error.name,
        })
      );
    });

    it("should log regular error properly w/ context", () => {
      logError(error, { ...context });
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
          ...errorDetails,
          stack: error.stack,
          name: error.name,
          ...context,
        })
      );
    });
  });

  describe("Unhandled Error", () => {
    it("should log unhandled error when non-error is passed (no context)", () => {
      logError("test", {});
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
          errorType: "string",
          message: "test",
        })
      );
    });

    it("should log unhandled error when non-error is passed w context", () => {
      logError("test", { ...context });
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
          errorType: "string",
          message: "test",
          ...context,
        })
      );
    });
  });
});
