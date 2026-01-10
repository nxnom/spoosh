export function objectToFormData(obj: Record<string, unknown>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (value instanceof Blob || value instanceof File) {
      formData.append(key, value);
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry instanceof Blob || entry instanceof File) {
          formData.append(key, entry);
        } else if (typeof entry === "object" && entry !== null) {
          formData.append(key, JSON.stringify(entry));
        } else {
          formData.append(key, String(entry));
        }
      }
    } else if (typeof value === "object") {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  }

  return formData;
}
