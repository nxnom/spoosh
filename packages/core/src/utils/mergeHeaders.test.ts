import {
  mergeHeaders,
  resolveHeadersToRecord,
  setHeaders,
  removeHeaderKeys,
} from "./mergeHeaders";

describe("mergeHeaders", () => {
  it("should merge two plain objects", async () => {
    const defaultHeaders = { "Content-Type": "application/json" };
    const requestHeaders = { Authorization: "Bearer token" };

    const result = await mergeHeaders(defaultHeaders, requestHeaders);

    expect(result).toEqual({
      "content-type": "application/json",
      authorization: "Bearer token",
    });
  });

  it("should allow request headers to override default headers", async () => {
    const defaultHeaders = { "Content-Type": "application/json" };
    const requestHeaders = { "Content-Type": "text/plain" };

    const result = await mergeHeaders(defaultHeaders, requestHeaders);

    expect(result).toEqual({ "content-type": "text/plain" });
  });

  it("should handle async header functions", async () => {
    const defaultHeaders = async () => ({ "X-Default": "default-value" });
    const requestHeaders = async () => ({ "X-Request": "request-value" });

    const result = await mergeHeaders(defaultHeaders, requestHeaders);

    expect(result).toEqual({
      "x-default": "default-value",
      "x-request": "request-value",
    });
  });

  it("should return undefined when both headers are undefined", async () => {
    const result = await mergeHeaders(undefined, undefined);

    expect(result).toBeUndefined();
  });

  it("should return request headers when default headers are undefined", async () => {
    const requestHeaders = { Authorization: "Bearer token" };

    const result = await mergeHeaders(undefined, requestHeaders);

    expect(result).toEqual(requestHeaders);
  });

  it("should return default headers when request headers are undefined", async () => {
    const defaultHeaders = { "Content-Type": "application/json" };

    const result = await mergeHeaders(defaultHeaders, undefined);

    expect(result).toEqual(defaultHeaders);
  });

  it("should handle Headers object format", async () => {
    const defaultHeaders = new Headers({ "Content-Type": "application/json" });
    const requestHeaders = new Headers({ Authorization: "Bearer token" });

    const result = await mergeHeaders(defaultHeaders, requestHeaders);

    expect(result).toEqual({
      "content-type": "application/json",
      authorization: "Bearer token",
    });
  });

  it("should handle array tuple format", async () => {
    const defaultHeaders: [string, string][] = [
      ["Content-Type", "application/json"],
    ];
    const requestHeaders: [string, string][] = [
      ["Authorization", "Bearer token"],
    ];

    const result = await mergeHeaders(defaultHeaders, requestHeaders);

    expect(result).toEqual({
      "content-type": "application/json",
      authorization: "Bearer token",
    });
  });

  it("should handle mixed formats", async () => {
    const defaultHeaders = new Headers({ "Content-Type": "application/json" });
    const requestHeaders = async () => ({ Authorization: "Bearer token" });

    const result = await mergeHeaders(defaultHeaders, requestHeaders);

    expect(result).toEqual({
      "content-type": "application/json",
      authorization: "Bearer token",
    });
  });
});

describe("resolveHeadersToRecord", () => {
  it("should pass through plain object", async () => {
    const headers = { "Content-Type": "application/json" };

    const result = await resolveHeadersToRecord(headers);

    expect(result).toEqual({ "content-type": "application/json" });
  });

  it("should convert Headers object to record", async () => {
    const headers = new Headers({ "Content-Type": "application/json" });

    const result = await resolveHeadersToRecord(headers);

    expect(result).toEqual({ "content-type": "application/json" });
  });

  it("should resolve async function and return record", async () => {
    const headers = async () => ({ "Content-Type": "application/json" });

    const result = await resolveHeadersToRecord(headers);

    expect(result).toEqual({ "content-type": "application/json" });
  });

  it("should return empty object for undefined input", async () => {
    const result = await resolveHeadersToRecord(undefined);

    expect(result).toEqual({});
  });

  it("should handle array tuple format", async () => {
    const headers: [string, string][] = [
      ["Content-Type", "application/json"],
      ["Authorization", "Bearer token"],
    ];

    const result = await resolveHeadersToRecord(headers);

    expect(result).toEqual({
      "content-type": "application/json",
      authorization: "Bearer token",
    });
  });
});

describe("setHeaders", () => {
  it("should set headers on empty requestOptions", () => {
    const requestOptions: { headers?: Record<string, string> } = {};
    const newHeaders = { "Content-Type": "application/json" };

    setHeaders(requestOptions, newHeaders);

    expect(requestOptions.headers).toEqual({
      "Content-Type": "application/json",
    });
  });

  it("should merge with existing plain object headers", () => {
    const requestOptions = { headers: { Authorization: "Bearer token" } };
    const newHeaders = { "Content-Type": "application/json" };

    setHeaders(requestOptions, newHeaders);

    expect(requestOptions.headers).toEqual({
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    });
  });

  it("should preserve existing plain object headers when adding new ones", () => {
    const requestOptions = {
      headers: { "X-Custom": "value", Authorization: "Bearer token" },
    };
    const newHeaders = { "Content-Type": "application/json" };

    setHeaders(requestOptions, newHeaders);

    expect(requestOptions.headers).toEqual({
      "X-Custom": "value",
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    });
  });

  it("should allow new headers to override existing ones", () => {
    const requestOptions = { headers: { "Content-Type": "text/plain" } };
    const newHeaders = { "Content-Type": "application/json" };

    setHeaders(requestOptions, newHeaders);

    expect(requestOptions.headers).toEqual({
      "Content-Type": "application/json",
    });
  });

  it("should replace Headers object with new headers only", () => {
    const requestOptions = {
      headers: new Headers({ Authorization: "Bearer token" }),
    };
    const newHeaders = { "Content-Type": "application/json" };

    setHeaders(requestOptions, newHeaders);

    expect(requestOptions.headers).toEqual({
      "Content-Type": "application/json",
    });
  });

  it("should replace array tuple headers with new headers only", () => {
    const requestOptions = {
      headers: [["Authorization", "Bearer token"]] as [string, string][],
    };
    const newHeaders = { "Content-Type": "application/json" };

    setHeaders(requestOptions, newHeaders);

    expect(requestOptions.headers).toEqual({
      "Content-Type": "application/json",
    });
  });

  it("should handle undefined existing headers", () => {
    const requestOptions: { headers?: Record<string, string> } = {
      headers: undefined,
    };
    const newHeaders = { "Content-Type": "application/json" };

    setHeaders(requestOptions, newHeaders);

    expect(requestOptions.headers).toEqual({
      "Content-Type": "application/json",
    });
  });
});

describe("removeHeaderKeys", () => {
  it("should return undefined for undefined input", () => {
    const result = removeHeaderKeys(undefined, ["Content-Type"]);

    expect(result).toBeUndefined();
  });

  it("should remove specified header keys", () => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer token",
    };

    const result = removeHeaderKeys(headers, ["Content-Type"]);

    expect(result).toEqual({ authorization: "Bearer token" });
  });

  it("should remove multiple header keys", () => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer token",
      "X-Custom": "value",
    };

    const result = removeHeaderKeys(headers, ["Content-Type", "X-Custom"]);

    expect(result).toEqual({ authorization: "Bearer token" });
  });

  it("should return undefined when all headers are removed", () => {
    const headers = { "Content-Type": "application/json" };

    const result = removeHeaderKeys(headers, ["Content-Type"]);

    expect(result).toBeUndefined();
  });

  it("should handle Headers object format", () => {
    const headers = new Headers({
      "Content-Type": "application/json",
      Authorization: "Bearer token",
    });

    const result = removeHeaderKeys(headers, ["Content-Type"]);

    expect(result).toEqual({ authorization: "Bearer token" });
  });

  it("should handle case-insensitive removal", () => {
    const headers = { "Content-Type": "application/json" };

    const result = removeHeaderKeys(headers, ["content-type"]);

    expect(result).toBeUndefined();
  });

  it("should not fail when removing non-existent keys", () => {
    const headers = { Authorization: "Bearer token" };

    const result = removeHeaderKeys(headers, ["Content-Type"]);

    expect(result).toEqual({ authorization: "Bearer token" });
  });
});
