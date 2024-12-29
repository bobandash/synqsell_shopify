import { simpleFaker } from "@faker-js/faker/.";
import fetchAndValidateGraphQLData from "../../fetchAndValidateGraphQLData";

// Mock the global fetch function
global.fetch = jest.fn();

describe("fetchAndValidateGraphQLData", () => {
  const mockShop = simpleFaker.string.alpha(10);
  const mockAccessToken = simpleFaker.string.alphanumeric(10);
  const mockQuery = "query { shop { name } }";
  const mockVariables = { test: "value" };
  const mockResponse = { data: { shop: { name: "Test Shop" } } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully fetch and return data", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchAndValidateGraphQLData(
      mockShop,
      mockAccessToken,
      mockQuery,
      mockVariables
    );

    expect(fetch).toHaveBeenCalledWith(
      `https://${mockShop}/admin/api/2024-07/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": mockAccessToken,
        },
        body: JSON.stringify({ query: mockQuery, variables: mockVariables }),
      }
    );
    expect(result).toEqual(mockResponse.data);
  });

  it("should throw error when response is not ok with query error", async () => {
    const errorResponse = {
      errors: {
        query: "Invalid query syntax",
      },
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => errorResponse,
    });

    await expect(
      fetchAndValidateGraphQLData(
        mockShop,
        mockAccessToken,
        mockQuery,
        mockVariables
      )
    ).rejects.toThrow("Shopify Query API error 400: Invalid query syntax.");
  });

  it("should throw error when response is not ok from message (when no query field)", async () => {
    const errorResponse = {
      errors: "General API error",
    };
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => errorResponse,
    });
    await expect(
      fetchAndValidateGraphQLData(
        mockShop,
        mockAccessToken,
        mockQuery,
        mockVariables
      )
    ).rejects.toThrow("Shopify Query API error 500: General API error.");
  });

  it("should throw error when response is not ok from query (when query field exists)", async () => {
    const errorResponse = {
      errors: {
        query: "API error",
      },
    };
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => errorResponse,
    });
    await expect(
      fetchAndValidateGraphQLData(
        mockShop,
        mockAccessToken,
        mockQuery,
        mockVariables
      )
    ).rejects.toThrow("Shopify Query API error 500: API error.");
  });

  it("should throw error when no data is returned", async () => {
    // Mock response with no data
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await expect(
      fetchAndValidateGraphQLData(
        mockShop,
        mockAccessToken,
        mockQuery,
        mockVariables
      )
    ).rejects.toThrow("No data returned from GraphQL query");
  });
});
