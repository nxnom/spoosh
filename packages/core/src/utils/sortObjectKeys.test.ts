import { sortObjectKeys } from "./sortObjectKeys";

describe("sortObjectKeys", () => {
  describe("basic object key sorting (alphabetical)", () => {
    it("should sort object keys alphabetically", () => {
      const input = { zebra: 1, apple: 2, mango: 3 };
      const result = sortObjectKeys(input);

      expect(Object.keys(result as object)).toEqual([
        "apple",
        "mango",
        "zebra",
      ]);
      expect(result).toEqual({ apple: 2, mango: 3, zebra: 1 });
    });

    it("should handle already sorted keys", () => {
      const input = { a: 1, b: 2, c: 3 };
      const result = sortObjectKeys(input);

      expect(Object.keys(result as object)).toEqual(["a", "b", "c"]);
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it("should sort keys with mixed case (uppercase first)", () => {
      const input = { banana: 1, Apple: 2, cherry: 3 };
      const result = sortObjectKeys(input);

      expect(Object.keys(result as object)).toEqual([
        "Apple",
        "banana",
        "cherry",
      ]);
    });

    it("should sort numeric string keys", () => {
      const input = { "10": "ten", "2": "two", "1": "one" };
      const result = sortObjectKeys(input);

      expect(Object.keys(result as object)).toEqual(["1", "2", "10"]);
    });
  });

  describe("nested objects", () => {
    it("should sort keys in nested objects", () => {
      const input = {
        outer: { zebra: 1, apple: 2 },
        inner: { delta: 3, alpha: 4 },
      };
      const result = sortObjectKeys(input) as {
        inner: Record<string, number>;
        outer: Record<string, number>;
      };

      expect(Object.keys(result)).toEqual(["inner", "outer"]);
      expect(Object.keys(result.inner)).toEqual(["alpha", "delta"]);
      expect(Object.keys(result.outer)).toEqual(["apple", "zebra"]);
    });

    it("should handle deeply nested objects", () => {
      const input = {
        z: {
          y: {
            x: { c: 1, b: 2, a: 3 },
          },
        },
      };
      const result = sortObjectKeys(input) as {
        z: { y: { x: Record<string, number> } };
      };

      expect(Object.keys(result.z.y.x)).toEqual(["a", "b", "c"]);
    });
  });

  describe("arrays containing objects", () => {
    it("should sort keys in objects within arrays", () => {
      const input = [
        { z: 1, a: 2 },
        { m: 3, b: 4 },
      ];
      const result = sortObjectKeys(input) as [
        Record<string, number>,
        Record<string, number>,
      ];

      expect(Object.keys(result[0])).toEqual(["a", "z"]);
      expect(Object.keys(result[1])).toEqual(["b", "m"]);
    });

    it("should handle nested arrays with objects", () => {
      const input = {
        items: [
          { zebra: 1, apple: 2 },
          { delta: 3, alpha: 4 },
        ],
      };
      const result = sortObjectKeys(input) as {
        items: [Record<string, number>, Record<string, number>];
      };

      expect(Object.keys(result.items[0])).toEqual(["apple", "zebra"]);
      expect(Object.keys(result.items[1])).toEqual(["alpha", "delta"]);
    });

    it("should preserve array order while sorting object keys", () => {
      const input = [{ b: 2 }, { a: 1 }, { c: 3 }];
      const result = sortObjectKeys(input) as Array<Record<string, number>>;

      expect(result[0]).toEqual({ b: 2 });
      expect(result[1]).toEqual({ a: 1 });
      expect(result[2]).toEqual({ c: 3 });
    });
  });

  describe("circular reference detection", () => {
    it("should detect and return [Circular] for circular references", () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj.self = obj;

      const result = sortObjectKeys(obj) as Record<string, unknown>;

      expect(result.self).toBe("[Circular]");
    });

    it("should detect circular references in nested objects", () => {
      const inner: Record<string, unknown> = { value: 1 };
      const outer: Record<string, unknown> = { inner };
      inner.parent = outer;

      const result = sortObjectKeys(outer) as {
        inner: Record<string, unknown>;
      };

      expect(result.inner.parent).toBe("[Circular]");
    });

    it("should detect circular references in arrays", () => {
      const arr: unknown[] = [1, 2];
      arr.push(arr);

      const result = sortObjectKeys(arr) as unknown[];

      expect(result[2]).toBe("[Circular]");
    });

    it("should handle multiple references to the same object as circular", () => {
      const shared: Record<string, unknown> = { value: 1 };
      const obj = { a: shared, b: shared };

      const result = sortObjectKeys(obj) as Record<string, unknown>;

      expect(result.a).toEqual({ value: 1 });
      expect(result.b).toBe("[Circular]");
    });
  });

  describe("primitive values", () => {
    it("should return string as-is", () => {
      expect(sortObjectKeys("hello")).toBe("hello");
      expect(sortObjectKeys("")).toBe("");
    });

    it("should return number as-is", () => {
      expect(sortObjectKeys(42)).toBe(42);
      expect(sortObjectKeys(0)).toBe(0);
      expect(sortObjectKeys(-1)).toBe(-1);
      expect(sortObjectKeys(3.14)).toBe(3.14);
      expect(sortObjectKeys(NaN)).toBe(NaN);
      expect(sortObjectKeys(Infinity)).toBe(Infinity);
    });

    it("should return boolean as-is", () => {
      expect(sortObjectKeys(true)).toBe(true);
      expect(sortObjectKeys(false)).toBe(false);
    });

    it("should return null as-is", () => {
      expect(sortObjectKeys(null)).toBe(null);
    });

    it("should return undefined as-is", () => {
      expect(sortObjectKeys(undefined)).toBe(undefined);
    });
  });

  describe("empty objects and arrays", () => {
    it("should handle empty object", () => {
      const result = sortObjectKeys({});

      expect(result).toEqual({});
    });

    it("should handle empty array", () => {
      const result = sortObjectKeys([]);

      expect(result).toEqual([]);
    });

    it("should handle object with empty nested structures", () => {
      const input = { emptyObj: {}, emptyArr: [], value: 1 };
      const result = sortObjectKeys(input);

      expect(result).toEqual({ emptyArr: [], emptyObj: {}, value: 1 });
      expect(Object.keys(result as object)).toEqual([
        "emptyArr",
        "emptyObj",
        "value",
      ]);
    });
  });

  describe("mixed arrays and objects", () => {
    it("should handle arrays with mixed types", () => {
      const input = [1, "string", { z: 1, a: 2 }, null, true];
      const result = sortObjectKeys(input) as unknown[];

      expect(result[0]).toBe(1);
      expect(result[1]).toBe("string");
      expect(Object.keys(result[2] as object)).toEqual(["a", "z"]);
      expect(result[3]).toBe(null);
      expect(result[4]).toBe(true);
    });

    it("should handle objects with mixed value types", () => {
      const input = {
        string: "hello",
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { b: 2, a: 1 },
      };
      const result = sortObjectKeys(input) as Record<string, unknown>;

      expect(Object.keys(result)).toEqual([
        "array",
        "boolean",
        "null",
        "number",
        "object",
        "string",
      ]);
      expect(result.string).toBe("hello");
      expect(result.number).toBe(42);
      expect(result.boolean).toBe(true);
      expect(result.null).toBe(null);
      expect(result.array).toEqual([1, 2, 3]);
      expect(Object.keys(result.object as object)).toEqual(["a", "b"]);
    });

    it("should handle complex nested structure", () => {
      const input = {
        users: [
          { name: "John", age: 30, address: { zip: "12345", city: "NYC" } },
          { name: "Jane", age: 25, address: { zip: "67890", city: "LA" } },
        ],
        meta: { version: 1, timestamp: 1234567890 },
      };
      const result = sortObjectKeys(input) as {
        meta: { timestamp: number; version: number };
        users: [
          { address: { city: string; zip: string }; age: number; name: string },
          { address: { city: string; zip: string }; age: number; name: string },
        ];
      };

      expect(Object.keys(result)).toEqual(["meta", "users"]);
      expect(Object.keys(result.meta)).toEqual(["timestamp", "version"]);
      expect(Object.keys(result.users[0])).toEqual(["address", "age", "name"]);
      expect(Object.keys(result.users[0].address)).toEqual(["city", "zip"]);
    });
  });
});
