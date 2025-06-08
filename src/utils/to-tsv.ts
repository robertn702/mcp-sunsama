import Papa from 'papaparse';

/**
 * Recursively converts nested objects and arrays to JSON strings
 * @param obj - The object to process
 * @returns The object with nested structures converted to strings
 */
function stringifyNestedObjects(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return JSON.stringify(obj);
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        result[key] = value;
      } else if (typeof value === 'object') {
        // Convert nested objects and arrays to JSON strings
        result[key] = JSON.stringify(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return obj;
}

/**
 * Converts data to TSV (Tab-Separated Values) format
 * @param data - The data to convert (object or array of objects)
 * @param fields - Optional array of field names to include in specific order
 * @returns TSV string representation of the data
 */
export function toTsv(data: any, fields?: string[]): string {
  // Handle null/undefined data
  if (data === null || data === undefined) {
    return '';
  }

  // If data is not an array, wrap it in an array
  const arrayData = Array.isArray(data) ? data : [data];

  // Handle empty arrays
  if (arrayData.length === 0) {
    return '';
  }

  // Process each item to stringify nested objects
  const processedData = arrayData.map(item => stringifyNestedObjects(item));

  // Configure papaparse options
  const parseOptions: any = {
    delimiter: '\t',     // Use tab as delimiter
    header: true,        // Include column headers
    skipEmptyLines: true, // Skip empty rows
    quotes: true         // Quote fields to handle JSON strings properly
  };

  // If specific fields are requested, use them to control column order
  if (fields && fields.length > 0) {
    parseOptions.columns = fields;
  }

  // Convert to TSV using papaparse
  return Papa.unparse(processedData, parseOptions);
}