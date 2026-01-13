import { objectToFormData } from "./objectToFormData";

describe("objectToFormData", () => {
  describe("basic string/number/boolean values", () => {
    it("should convert string values", () => {
      const result = objectToFormData({ name: "John" });

      expect(result.get("name")).toBe("John");
    });

    it("should convert number values to string", () => {
      const result = objectToFormData({ age: 25, price: 99.99 });

      expect(result.get("age")).toBe("25");
      expect(result.get("price")).toBe("99.99");
    });

    it("should convert boolean values to string", () => {
      const result = objectToFormData({ active: true, disabled: false });

      expect(result.get("active")).toBe("true");
      expect(result.get("disabled")).toBe("false");
    });

    it("should handle multiple basic values", () => {
      const result = objectToFormData({
        name: "Alice",
        age: 30,
        isAdmin: true,
      });

      expect(result.get("name")).toBe("Alice");
      expect(result.get("age")).toBe("30");
      expect(result.get("isAdmin")).toBe("true");
    });
  });

  describe("File objects", () => {
    it("should append File objects directly", () => {
      const file = new File(["content"], "test.txt", { type: "text/plain" });
      const result = objectToFormData({ document: file });

      const retrieved = result.get("document") as File;
      expect(retrieved).toBeInstanceOf(File);
      expect(retrieved.name).toBe("test.txt");
      expect(retrieved.type).toBe("text/plain");
    });

    it("should handle multiple File objects with different keys", () => {
      const file1 = new File(["content1"], "file1.txt", { type: "text/plain" });
      const file2 = new File(["content2"], "file2.pdf", {
        type: "application/pdf",
      });
      const result = objectToFormData({ doc1: file1, doc2: file2 });

      const retrieved1 = result.get("doc1") as File;
      const retrieved2 = result.get("doc2") as File;
      expect(retrieved1.name).toBe("file1.txt");
      expect(retrieved2.name).toBe("file2.pdf");
    });
  });

  describe("Blob objects", () => {
    it("should append Blob objects directly", () => {
      const blob = new Blob(["binary data"], {
        type: "application/octet-stream",
      });
      const result = objectToFormData({ data: blob });

      const retrieved = result.get("data") as Blob;
      expect(retrieved).toBeInstanceOf(Blob);
      expect(retrieved.type).toBe("application/octet-stream");
    });

    it("should handle Blob with different MIME types", () => {
      const jsonBlob = new Blob(['{"key": "value"}'], {
        type: "application/json",
      });
      const result = objectToFormData({ json: jsonBlob });

      const retrieved = result.get("json") as Blob;
      expect(retrieved.type).toBe("application/json");
    });
  });

  describe("arrays of values", () => {
    it("should append multiple entries with same key for string arrays", () => {
      const result = objectToFormData({ tags: ["red", "green", "blue"] });

      const values = result.getAll("tags");
      expect(values).toHaveLength(3);
      expect(values).toEqual(["red", "green", "blue"]);
    });

    it("should append multiple entries with same key for number arrays", () => {
      const result = objectToFormData({ ids: [1, 2, 3] });

      const values = result.getAll("ids");
      expect(values).toHaveLength(3);
      expect(values).toEqual(["1", "2", "3"]);
    });

    it("should handle arrays of File objects", () => {
      const file1 = new File(["content1"], "file1.txt", { type: "text/plain" });
      const file2 = new File(["content2"], "file2.txt", { type: "text/plain" });
      const result = objectToFormData({ files: [file1, file2] });

      const values = result.getAll("files") as File[];
      expect(values).toHaveLength(2);
      expect(values[0]!.name).toBe("file1.txt");
      expect(values[1]!.name).toBe("file2.txt");
    });

    it("should handle arrays of Blob objects", () => {
      const blob1 = new Blob(["data1"], { type: "text/plain" });
      const blob2 = new Blob(["data2"], { type: "text/plain" });
      const result = objectToFormData({ blobs: [blob1, blob2] });

      const values = result.getAll("blobs") as Blob[];
      expect(values).toHaveLength(2);
      expect(values[0]).toBeInstanceOf(Blob);
      expect(values[1]).toBeInstanceOf(Blob);
    });

    it("should JSON stringify objects in arrays", () => {
      const result = objectToFormData({
        items: [
          { id: 1, name: "Item 1" },
          { id: 2, name: "Item 2" },
        ],
      });

      const values = result.getAll("items");
      expect(values).toHaveLength(2);
      expect(values[0]).toBe('{"id":1,"name":"Item 1"}');
      expect(values[1]).toBe('{"id":2,"name":"Item 2"}');
    });

    it("should handle empty arrays", () => {
      const result = objectToFormData({ empty: [] });

      const values = result.getAll("empty");
      expect(values).toHaveLength(0);
    });

    it("should handle mixed type arrays", () => {
      const file = new File(["content"], "test.txt", { type: "text/plain" });
      const result = objectToFormData({
        mixed: ["string", 123, file, { key: "value" }],
      });

      const values = result.getAll("mixed");
      expect(values).toHaveLength(4);
      expect(values[0]).toBe("string");
      expect(values[1]).toBe("123");
      expect(values[2]).toBeInstanceOf(File);
      expect(values[3]).toBe('{"key":"value"}');
    });
  });

  describe("nested objects", () => {
    it("should JSON stringify nested objects", () => {
      const result = objectToFormData({
        user: { name: "John", age: 30 },
      });

      expect(result.get("user")).toBe('{"name":"John","age":30}');
    });

    it("should JSON stringify deeply nested objects", () => {
      const result = objectToFormData({
        config: {
          settings: {
            theme: "dark",
            notifications: { email: true, push: false },
          },
        },
      });

      const expected = JSON.stringify({
        settings: {
          theme: "dark",
          notifications: { email: true, push: false },
        },
      });
      expect(result.get("config")).toBe(expected);
    });

    it("should JSON stringify objects with array properties", () => {
      const result = objectToFormData({
        data: { tags: ["a", "b"], count: 2 },
      });

      expect(result.get("data")).toBe('{"tags":["a","b"],"count":2}');
    });
  });

  describe("null/undefined values", () => {
    it("should skip null values", () => {
      const result = objectToFormData({ name: "John", empty: null });

      expect(result.get("name")).toBe("John");
      expect(result.has("empty")).toBe(false);
    });

    it("should skip undefined values", () => {
      const result = objectToFormData({ name: "John", empty: undefined });

      expect(result.get("name")).toBe("John");
      expect(result.has("empty")).toBe(false);
    });

    it("should skip multiple null and undefined values", () => {
      const result = objectToFormData({
        valid: "data",
        nullVal: null,
        undefinedVal: undefined,
        anotherValid: 123,
      });

      expect(result.get("valid")).toBe("data");
      expect(result.get("anotherValid")).toBe("123");
      expect(result.has("nullVal")).toBe(false);
      expect(result.has("undefinedVal")).toBe(false);
    });

    it("should handle object where all values are null or undefined", () => {
      const result = objectToFormData({
        a: null,
        b: undefined,
        c: null,
      });

      const entries = Array.from(result.entries());
      expect(entries).toHaveLength(0);
    });
  });

  describe("empty object", () => {
    it("should return empty FormData for empty object", () => {
      const result = objectToFormData({});

      const entries = Array.from(result.entries());
      expect(entries).toHaveLength(0);
    });

    it("should return FormData instance for empty object", () => {
      const result = objectToFormData({});

      expect(result).toBeInstanceOf(FormData);
    });
  });
});
