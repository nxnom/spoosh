import { objectToUrlEncoded } from "./objectToUrlEncoded";

describe("objectToUrlEncoded", () => {
  describe("basic string/number/boolean values", () => {
    it("should convert string values", () => {
      const result = objectToUrlEncoded({ name: "John" });

      expect(result).toBe("name=John");
    });

    it("should convert number values to string", () => {
      const result = objectToUrlEncoded({ age: 25, price: 99.99 });

      expect(result).toContain("age=25");
      expect(result).toContain("price=99.99");
    });

    it("should convert boolean values to string", () => {
      const result = objectToUrlEncoded({ active: true, disabled: false });

      expect(result).toContain("active=true");
      expect(result).toContain("disabled=false");
    });

    it("should handle multiple basic values", () => {
      const result = objectToUrlEncoded({
        name: "Alice",
        age: 30,
        isAdmin: true,
      });

      expect(result).toContain("name=Alice");
      expect(result).toContain("age=30");
      expect(result).toContain("isAdmin=true");
    });

    it("should URL-encode special characters", () => {
      const result = objectToUrlEncoded({ email: "test@example.com" });

      expect(result).toBe("email=test%40example.com");
    });

    it("should URL-encode spaces", () => {
      const result = objectToUrlEncoded({ name: "John Doe" });

      expect(result).toBe("name=John+Doe");
    });

    it("should URL-encode unicode characters", () => {
      const result = objectToUrlEncoded({ greeting: "こんにちは" });

      expect(result).toContain("greeting=");
      expect(decodeURIComponent(result.split("=")[1]!)).toBe("こんにちは");
    });
  });

  describe("arrays of values", () => {
    it("should append multiple entries with same key for string arrays", () => {
      const result = objectToUrlEncoded({ tags: ["red", "green", "blue"] });

      expect(result).toBe("tags=red&tags=green&tags=blue");
    });

    it("should append multiple entries with same key for number arrays", () => {
      const result = objectToUrlEncoded({ ids: [1, 2, 3] });

      expect(result).toBe("ids=1&ids=2&ids=3");
    });

    it("should handle empty arrays", () => {
      const result = objectToUrlEncoded({ empty: [] });

      expect(result).toBe("");
    });

    it("should skip null/undefined items in arrays", () => {
      const result = objectToUrlEncoded({
        items: ["a", null, "b", undefined, "c"],
      });

      expect(result).toBe("items=a&items=b&items=c");
    });

    it("should handle mixed type arrays", () => {
      const result = objectToUrlEncoded({
        mixed: ["string", 123, true],
      });

      expect(result).toBe("mixed=string&mixed=123&mixed=true");
    });
  });

  describe("nested objects", () => {
    it("should JSON stringify nested objects", () => {
      const result = objectToUrlEncoded({
        user: { name: "John", age: 30 },
      });

      const params = new URLSearchParams(result);
      expect(params.get("user")).toBe('{"name":"John","age":30}');
    });

    it("should JSON stringify deeply nested objects", () => {
      const result = objectToUrlEncoded({
        config: {
          settings: {
            theme: "dark",
          },
        },
      });

      const params = new URLSearchParams(result);
      const expected = JSON.stringify({
        settings: { theme: "dark" },
      });
      expect(params.get("config")).toBe(expected);
    });

    it("should JSON stringify objects with array properties", () => {
      const result = objectToUrlEncoded({
        data: { tags: ["a", "b"], count: 2 },
      });

      const params = new URLSearchParams(result);
      expect(params.get("data")).toBe('{"tags":["a","b"],"count":2}');
    });
  });

  describe("null/undefined values", () => {
    it("should skip null values", () => {
      const result = objectToUrlEncoded({ name: "John", empty: null });

      expect(result).toBe("name=John");
    });

    it("should skip undefined values", () => {
      const result = objectToUrlEncoded({ name: "John", empty: undefined });

      expect(result).toBe("name=John");
    });

    it("should skip multiple null and undefined values", () => {
      const result = objectToUrlEncoded({
        valid: "data",
        nullVal: null,
        undefinedVal: undefined,
        anotherValid: 123,
      });

      expect(result).toContain("valid=data");
      expect(result).toContain("anotherValid=123");
      expect(result).not.toContain("nullVal");
      expect(result).not.toContain("undefinedVal");
    });

    it("should handle object where all values are null or undefined", () => {
      const result = objectToUrlEncoded({
        a: null,
        b: undefined,
        c: null,
      });

      expect(result).toBe("");
    });
  });

  describe("empty object", () => {
    it("should return empty string for empty object", () => {
      const result = objectToUrlEncoded({});

      expect(result).toBe("");
    });
  });

  describe("real-world Stripe-like payloads", () => {
    it("should handle typical Stripe account creation payload", () => {
      const result = objectToUrlEncoded({
        type: "account_onboarding",
        account: "acct_123",
        refresh_url: "https://example.com/refresh",
        return_url: "https://example.com/return",
      });

      expect(result).toContain("type=account_onboarding");
      expect(result).toContain("account=acct_123");
      expect(result).toContain(
        "refresh_url=https%3A%2F%2Fexample.com%2Frefresh"
      );
      expect(result).toContain("return_url=https%3A%2F%2Fexample.com%2Freturn");
    });

    it("should handle expand array parameter", () => {
      const result = objectToUrlEncoded({
        expand: ["data.customer", "data.invoice"],
      });

      expect(result).toBe("expand=data.customer&expand=data.invoice");
    });

    it("should handle metadata object", () => {
      const result = objectToUrlEncoded({
        amount: 1000,
        currency: "usd",
        metadata: { order_id: "123", customer_name: "John" },
      });

      const params = new URLSearchParams(result);
      expect(params.get("amount")).toBe("1000");
      expect(params.get("currency")).toBe("usd");
      expect(params.get("metadata")).toBe(
        '{"order_id":"123","customer_name":"John"}'
      );
    });
  });
});
