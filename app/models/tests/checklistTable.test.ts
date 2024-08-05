import { prismaMock } from "../../singleton";
import { hasChecklistTable } from "../checklistTable";

// TODO: there's a discrepancy between the commonJS and ES6 that allows tests to work with import * as createHttpError

describe("hasChecklistTable", () => {
  it("should return true if table exists", async () => {
    const id = "test";
    const sampleChecklistTable = {
      id,
      position: 1,
      header: "Sample Header",
      subheader: null,
    };
    prismaMock.checklistTable.findFirst.mockResolvedValue(sampleChecklistTable);
    const result = await hasChecklistTable(id);
    expect(result).toBe(true);
  });

  it("should return false if table does not exist", async () => {
    const id = "some-id";
    prismaMock.checklistTable.findFirst.mockResolvedValue(null);
    const result = await hasChecklistTable(id);
    expect(result).toBe(false);
  });

  it("should throw an error if there is a database error", async () => {
    const id = "some-id";
    prismaMock.checklistTable.findFirst.mockRejectedValue(
      new Error("Database error"),
    );
    await expect(hasChecklistTable(id)).rejects.toThrow(
      "Failed to retrieve checklist table.",
    );
  });
});
