import { simpleFaker } from "@faker-js/faker";
import mutateAndValidateGraphQLData from "../../mutateAndValidateGraphQLData";

global.fetch = jest.fn();

describe("mutateAndValidateGraphQLData", () => {
  const mockShop = simpleFaker.string.alpha(10);
  const mockAccessToken = simpleFaker.string.alphanumeric(10);
  const mockMutation =
    "mutation { productCreate(input: $input) { product { id } } }";
  const mockVariables = { input: { title: "Test Product" } };
  const mockDefaultError = "Failed to create product";
  const mockResponse = {
    data: {
      productCreate: {
        product: { id: "gid://shopify/Product/1" },
        userErrors: [],
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully mutate and return data", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await mutateAndValidateGraphQLData(
      mockShop,
      mockAccessToken,
      mockMutation,
      mockVariables,
      mockDefaultError
    );

    expect(fetch).toHaveBeenCalledWith(
      `https://${mockShop}/admin/api/2024-07/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": mockAccessToken,
        },
        body: JSON.stringify({ query: mockMutation, variables: mockVariables }),
      }
    );

    expect(result).toEqual(mockResponse.data);
  });

  it("should throw error when response is not ok with query error", async () => {
    const errorResponse = {
      errors: {
        query: "Invalid mutation syntax",
      },
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => errorResponse,
    });

    await expect(
      mutateAndValidateGraphQLData(
        mockShop,
        mockAccessToken,
        mockMutation,
        mockVariables,
        mockDefaultError
      )
    ).rejects.toThrow(
      "Shopify Mutation API error 400: Invalid mutation syntax."
    );
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
      mutateAndValidateGraphQLData(
        mockShop,
        mockAccessToken,
        mockMutation,
        mockVariables,
        mockDefaultError
      )
    ).rejects.toThrow("Shopify Mutation API error 500: General API error.");
  });

  it("should throw error when no data is returned", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await expect(
      mutateAndValidateGraphQLData(
        mockShop,
        mockAccessToken,
        mockMutation,
        mockVariables,
        mockDefaultError
      )
    ).rejects.toThrow(`Shopify Mutation Error ${mockDefaultError}`);
  });

  it("should throw error when mutation returns userErrors", async () => {
    const responseWithUserErrors = {
      data: {
        productCreate: {
          product: null,
          userErrors: [
            { message: "Title cannot be blank." },
            { message: "Price must be greater than 0." },
          ],
        },
      },
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => responseWithUserErrors,
    });

    await expect(
      mutateAndValidateGraphQLData(
        mockShop,
        mockAccessToken,
        mockMutation,
        mockVariables,
        mockDefaultError
      )
    ).rejects.toThrow("Title cannot be blank. Price must be greater than 0.");
  });
});
