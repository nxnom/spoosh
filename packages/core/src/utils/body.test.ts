import {
  form,
  json,
  urlencoded,
  isSpooshBody,
  resolveRequestBody,
  type SpooshBodyInternal,
} from "./body";

describe("form()", () => {
  it("should return a frozen tagged object with kind 'form'", () => {
    const result = form({ name: "test" });

    const internal = result as unknown as SpooshBodyInternal;
    expect(internal.__spooshBody).toBe(true);
    expect(internal.kind).toBe("form");
    expect(internal.value).toEqual({ name: "test" });
    expect(Object.isFrozen(result)).toBe(true);
  });
});

describe("json()", () => {
  it("should return a frozen tagged object with kind 'json'", () => {
    const result = json({ name: "test" });

    const internal = result as unknown as SpooshBodyInternal;
    expect(internal.__spooshBody).toBe(true);
    expect(internal.kind).toBe("json");
    expect(internal.value).toEqual({ name: "test" });
    expect(Object.isFrozen(result)).toBe(true);
  });
});

describe("urlencoded()", () => {
  it("should return a frozen tagged object with kind 'urlencoded'", () => {
    const result = urlencoded({ name: "test" });

    const internal = result as unknown as SpooshBodyInternal;
    expect(internal.__spooshBody).toBe(true);
    expect(internal.kind).toBe("urlencoded");
    expect(internal.value).toEqual({ name: "test" });
    expect(Object.isFrozen(result)).toBe(true);
  });
});

describe("isSpooshBody()", () => {
  it("should return true for tagged bodies", () => {
    expect(isSpooshBody(form({}))).toBe(true);
    expect(isSpooshBody(json({}))).toBe(true);
    expect(isSpooshBody(urlencoded({}))).toBe(true);
  });

  it("should return false for plain objects", () => {
    expect(isSpooshBody({ name: "test" })).toBe(false);
  });

  it("should return false for null and undefined", () => {
    expect(isSpooshBody(null)).toBe(false);
    expect(isSpooshBody(undefined)).toBe(false);
  });

  it("should return false for primitives", () => {
    expect(isSpooshBody("string")).toBe(false);
    expect(isSpooshBody(42)).toBe(false);
  });

  it("should return false for objects with __spooshBody set to false", () => {
    expect(isSpooshBody({ __spooshBody: false, kind: "json", value: {} })).toBe(
      false
    );
  });
});

describe("resolveRequestBody()", () => {
  it("should return undefined for undefined", () => {
    expect(resolveRequestBody(undefined)).toBeUndefined();
  });

  it("should return undefined for null", () => {
    expect(resolveRequestBody(null)).toBeUndefined();
  });

  describe("tagged form body", () => {
    it("should return FormData with removeHeaders containing Content-Type", () => {
      const result = resolveRequestBody(form({ name: "test", age: 25 }));

      expect(result).toBeDefined();
      expect(result!.body).toBeInstanceOf(FormData);
      expect(result!.headers).toBeUndefined();
      expect(result!.removeHeaders).toEqual(["Content-Type"]);
    });
  });

  describe("tagged json body", () => {
    it("should return JSON string with application/json header", () => {
      const data = { name: "test" };
      const result = resolveRequestBody(json(data));

      expect(result).toBeDefined();
      expect(result!.body).toBe(JSON.stringify(data));
      expect(result!.headers).toEqual({
        "Content-Type": "application/json",
      });
    });
  });

  describe("tagged urlencoded body", () => {
    it("should return URL-encoded string with correct header", () => {
      const result = resolveRequestBody(urlencoded({ name: "test", age: 25 }));

      expect(result).toBeDefined();
      expect(result!.body).toBe("name=test&age=25");
      expect(result!.headers).toEqual({
        "Content-Type": "application/x-www-form-urlencoded",
      });
    });
  });

  describe("plain object (backward compat)", () => {
    it("should JSON stringify plain objects", () => {
      const data = { title: "hello", count: 5 };
      const result = resolveRequestBody(data);

      expect(result).toBeDefined();
      expect(result!.body).toBe(JSON.stringify(data));
      expect(result!.headers).toEqual({
        "Content-Type": "application/json",
      });
    });

    it("should JSON stringify arrays", () => {
      const data = [1, 2, 3];
      const result = resolveRequestBody(data);

      expect(result).toBeDefined();
      expect(result!.body).toBe(JSON.stringify(data));
      expect(result!.headers).toEqual({
        "Content-Type": "application/json",
      });
    });
  });

  describe("native types passthrough", () => {
    it("should pass through FormData with removeHeaders containing Content-Type", () => {
      const fd = new FormData();
      fd.append("key", "value");
      const result = resolveRequestBody(fd);

      expect(result).toBeDefined();
      expect(result!.body).toBe(fd);
      expect(result!.headers).toBeUndefined();
      expect(result!.removeHeaders).toEqual(["Content-Type"]);
    });

    it("should pass through Blob as-is", () => {
      const blob = new Blob(["data"]);
      const result = resolveRequestBody(blob);

      expect(result).toBeDefined();
      expect(result!.body).toBe(blob);
      expect(result!.headers).toBeUndefined();
    });

    it("should pass through string as-is", () => {
      const result = resolveRequestBody("raw string body");

      expect(result).toBeDefined();
      expect(result!.body).toBe("raw string body");
      expect(result!.headers).toBeUndefined();
    });
  });

  describe("dev warning for plain object with File", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
    });

    it("should warn when plain object contains File in non-production", () => {
      vi.stubEnv("NODE_ENV", "development");
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      resolveRequestBody({ file: new File([], "test.txt") });

      expect(warnSpy).toHaveBeenCalledWith(
        "[spoosh] Plain object body contains File/Blob. Use form() wrapper for multipart upload."
      );
    });

    it("should not warn in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      resolveRequestBody({ file: new File([], "test.txt") });

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
