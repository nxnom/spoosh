import type {
  OpenAPIPathItem,
  OpenAPIOperation,
  OpenAPISpec,
} from "../types.js";
import type {
  FlatEndpointStructure,
  EndpointTypeInfo,
  HttpMethod,
  PathMethods,
} from "./types.js";

/**
 * Convert OpenAPI path to Spoosh flat path format
 * Converts {paramName} to :paramName
 * @param openApiPath OpenAPI path (e.g., "/posts/{postId}/comments")
 * @returns Spoosh path (e.g., "posts/:postId/comments")
 */
export function convertToFlatPath(openApiPath: string): string {
  return openApiPath.replace(/^\//, "").replace(/\{([^}]+)\}/g, ":$1");
}

/**
 * Convert OpenAPI paths to flat Spoosh structure
 * @param spec OpenAPI specification
 * @param endpointInfoMap Map from path+method to EndpointTypeInfo
 * @returns Flat Spoosh structure
 */
export function convertPathsToFlatStructure(
  spec: OpenAPISpec,
  endpointInfoMap: Map<string, EndpointTypeInfo>
): FlatEndpointStructure {
  const result: FlatEndpointStructure = {};

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    const flatPath = convertToFlatPath(path);

    if (!result[flatPath]) {
      result[flatPath] = {};
    }

    attachMethods(result[flatPath], path, pathItem, endpointInfoMap);
  }

  return result;
}

/**
 * Attach HTTP methods to the path entry
 * @param methods Methods object for the path
 * @param path Original OpenAPI path string
 * @param pathItem OpenAPI path item
 * @param endpointInfoMap Map from path+method to EndpointTypeInfo
 */
function attachMethods(
  methods: PathMethods,
  path: string,
  pathItem: OpenAPIPathItem,
  endpointInfoMap: Map<string, EndpointTypeInfo>
): void {
  const httpMethods: Array<{
    openapi: keyof OpenAPIPathItem;
    spoosh: HttpMethod;
  }> = [
    { openapi: "get", spoosh: "GET" },
    { openapi: "post", spoosh: "POST" },
    { openapi: "put", spoosh: "PUT" },
    { openapi: "patch", spoosh: "PATCH" },
    { openapi: "delete", spoosh: "DELETE" },
  ];

  for (const { openapi, spoosh } of httpMethods) {
    const operation = pathItem[openapi] as OpenAPIOperation | undefined;

    if (operation) {
      const key = `${path}:${openapi}`;
      const endpointInfo = endpointInfoMap.get(key);

      if (endpointInfo) {
        methods[spoosh] = endpointInfo;
      }
    }
  }
}
