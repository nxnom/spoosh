import { resolvePath, resolveTags } from "./path-utils";

describe("resolvePath", () => {
  describe("basic path parameter replacement", () => {
    it("should replace a single parameter with its value", () => {
      const path = ["users", ":id"];
      const params = { id: "123" };

      const result = resolvePath(path, params);

      expect(result).toEqual(["users", "123"]);
    });

    it("should handle numeric parameter values", () => {
      const path = ["posts", ":postId"];
      const params = { postId: 456 };

      const result = resolvePath(path, params);

      expect(result).toEqual(["posts", "456"]);
    });
  });

  describe("multiple parameters", () => {
    it("should replace multiple parameters", () => {
      const path = ["users", ":userId", "posts", ":postId"];
      const params = { userId: "user-1", postId: "post-2" };

      const result = resolvePath(path, params);

      expect(result).toEqual(["users", "user-1", "posts", "post-2"]);
    });

    it("should handle consecutive parameters", () => {
      const path = [":category", ":subcategory", ":item"];
      const params = {
        category: "electronics",
        subcategory: "phones",
        item: "iphone",
      };

      const result = resolvePath(path, params);

      expect(result).toEqual(["electronics", "phones", "iphone"]);
    });
  });

  describe("no parameters needed", () => {
    it("should return the original path when no parameters in path", () => {
      const path = ["users", "all", "active"];
      const params = { id: "123" };

      const result = resolvePath(path, params);

      expect(result).toEqual(["users", "all", "active"]);
    });

    it("should return the original path when path is empty", () => {
      const path: string[] = [];
      const params = { id: "123" };

      const result = resolvePath(path, params);

      expect(result).toEqual([]);
    });
  });

  describe("missing required parameter", () => {
    it("should throw an error when a required parameter is missing", () => {
      const path = ["users", ":id"];
      const params = { name: "test" };

      expect(() => resolvePath(path, params)).toThrow(
        "Missing path parameter: id"
      );
    });

    it("should throw an error for the first missing parameter when multiple are missing", () => {
      const path = ["users", ":userId", "posts", ":postId"];
      const params = {};

      expect(() => resolvePath(path, params)).toThrow(
        "Missing path parameter: userId"
      );
    });
  });

  describe("empty params object", () => {
    it("should return the original path when params is empty and no parameters in path", () => {
      const path = ["users", "list"];
      const params = {};

      const result = resolvePath(path, params);

      expect(result).toEqual(["users", "list"]);
    });

    it("should throw when params is empty but path has parameters", () => {
      const path = ["users", ":id"];
      const params = {};

      expect(() => resolvePath(path, params)).toThrow(
        "Missing path parameter: id"
      );
    });
  });

  describe("undefined params", () => {
    it("should return the original path when params is undefined", () => {
      const path = ["users", ":id"];
      const params = undefined;

      const result = resolvePath(path, params);

      expect(result).toEqual(["users", ":id"]);
    });

    it("should return the original path with static segments when params is undefined", () => {
      const path = ["api", "v1", "users"];
      const params = undefined;

      const result = resolvePath(path, params);

      expect(result).toEqual(["api", "v1", "users"]);
    });
  });
});

describe("resolveTags", () => {
  describe("default behavior (generates tags from path)", () => {
    it("should generate tags from resolved path", () => {
      const options = undefined;
      const resolvedPath = ["users", "123"];

      const result = resolveTags(options, resolvedPath);

      expect(result).toEqual(["users", "users/123"]);
    });

    it("should generate tags for longer paths", () => {
      const options = {};
      const resolvedPath = ["api", "v1", "users", "posts"];

      const result = resolveTags(options, resolvedPath);

      expect(result).toEqual([
        "api",
        "api/v1",
        "api/v1/users",
        "api/v1/users/posts",
      ]);
    });

    it("should return empty array for empty path", () => {
      const options = undefined;
      const resolvedPath: string[] = [];

      const result = resolveTags(options, resolvedPath);

      expect(result).toEqual([]);
    });
  });

  describe("custom tags override", () => {
    it("should use custom tags instead of auto-generated tags", () => {
      const options = { tags: ["custom-tag-1", "custom-tag-2"] };
      const resolvedPath = ["users", "123"];

      const result = resolveTags(options, resolvedPath);

      expect(result).toEqual(["custom-tag-1", "custom-tag-2"]);
    });

    it("should handle empty custom tags array", () => {
      const options = { tags: [] as string[] };
      const resolvedPath = ["users", "123"];

      const result = resolveTags(options, resolvedPath);

      expect(result).toEqual([]);
    });

    it("should use custom tags even when path would generate different tags", () => {
      const options = { tags: ["my-special-tag"] };
      const resolvedPath = ["api", "v1", "posts", "comments"];

      const result = resolveTags(options, resolvedPath);

      expect(result).toEqual(["my-special-tag"]);
    });
  });

  describe("additional tags (addTags)", () => {
    it("should append additional tags to auto-generated tags", () => {
      const options = { additionalTags: ["extra-tag"] };
      const resolvedPath = ["users"];

      const result = resolveTags(options, resolvedPath);

      expect(result).toEqual(["users", "extra-tag"]);
    });

    it("should append additional tags to custom tags", () => {
      const options = {
        tags: ["custom"],
        additionalTags: ["extra-1", "extra-2"],
      };
      const resolvedPath = ["users", "123"];

      const result = resolveTags(options, resolvedPath);

      expect(result).toEqual(["custom", "extra-1", "extra-2"]);
    });

    it("should handle empty additionalTags array", () => {
      const options = { additionalTags: [] as string[] };
      const resolvedPath = ["posts"];

      const result = resolveTags(options, resolvedPath);

      expect(result).toEqual(["posts"]);
    });

    it("should append multiple additional tags to generated tags", () => {
      const options = { additionalTags: ["tag-a", "tag-b", "tag-c"] };
      const resolvedPath = ["users", "posts"];

      const result = resolveTags(options, resolvedPath);

      expect(result).toEqual([
        "users",
        "users/posts",
        "tag-a",
        "tag-b",
        "tag-c",
      ]);
    });
  });

  describe("empty/undefined options", () => {
    it("should handle undefined options", () => {
      const options = undefined;
      const resolvedPath = ["data"];

      const result = resolveTags(options, resolvedPath);

      expect(result).toEqual(["data"]);
    });

    it("should handle empty options object", () => {
      const options = {};
      const resolvedPath = ["items", "123"];

      const result = resolveTags(options, resolvedPath);

      expect(result).toEqual(["items", "items/123"]);
    });

    it("should handle options with only undefined values", () => {
      const options = { tags: undefined, additionalTags: undefined };
      const resolvedPath = ["resources"];

      const result = resolveTags(options, resolvedPath);

      expect(result).toEqual(["resources"]);
    });
  });
});
