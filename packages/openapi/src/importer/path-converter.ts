import type {
  OpenAPIPathItem,
  OpenAPIOperation,
  OpenAPISpec,
} from "../types.js";
import type {
  PathSegment,
  NestedEndpointStructure,
  EndpointTypeInfo,
} from "./types.js";

/**
 * Parse a path string into segments
 * @param path OpenAPI path (e.g., "/posts/{postId}/comments")
 * @returns Array of parsed segments
 */
export function parsePathSegments(path: string): PathSegment[] {
  const segments = path.split("/").filter((s) => s.length > 0);

  return segments.map((segment) => {
    const isParameter = segment.startsWith("{") && segment.endsWith("}");
    return {
      value: segment,
      isParameter,
      parameterName: isParameter ? segment.slice(1, -1) : undefined,
    };
  });
}

/**
 * Convert OpenAPI paths to nested Spoosh structure
 * @param spec OpenAPI specification
 * @param endpointInfoMap Map from path+method to EndpointTypeInfo
 * @returns Nested Spoosh structure
 */
export function convertPathsToSpooshStructure(
  spec: OpenAPISpec,
  endpointInfoMap: Map<string, EndpointTypeInfo>
): NestedEndpointStructure {
  const root: NestedEndpointStructure = {};

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    const segments = parsePathSegments(path);
    let current = root;

    for (const segment of segments) {
      if (segment.isParameter) {
        if (!current._) {
          current._ = {};
        }
        current = current._ as NestedEndpointStructure;
      } else {
        if (!current[segment.value]) {
          current[segment.value] = {};
        }
        current = current[segment.value] as NestedEndpointStructure;
      }
    }

    attachMethods(current, path, pathItem, endpointInfoMap);
  }

  return root;
}

/**
 * Attach HTTP methods to the current node
 * @param node Current node in nested structure
 * @param path Original path string
 * @param pathItem OpenAPI path item
 * @param endpointInfoMap Map from path+method to EndpointTypeInfo
 */
function attachMethods(
  node: NestedEndpointStructure,
  path: string,
  pathItem: OpenAPIPathItem,
  endpointInfoMap: Map<string, EndpointTypeInfo>
): void {
  const methods: Array<keyof OpenAPIPathItem> = [
    "get",
    "post",
    "put",
    "patch",
    "delete",
  ];

  for (const method of methods) {
    const operation = pathItem[method] as OpenAPIOperation | undefined;
    if (operation) {
      const spooshMethod = `$${method}`;
      const key = `${path}:${method}`;
      const endpointInfo = endpointInfoMap.get(key);

      if (endpointInfo) {
        node[spooshMethod] = endpointInfo;
      }
    }
  }
}
