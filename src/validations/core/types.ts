/**
 * Core validation types
 * Base types and interfaces for content validation
 */

// ============================================================================
// Position Types
// ============================================================================

export interface Position {
  line: number; // 1-based
  column: number; // 1-based
  offset: number; // 0-based byte offset
}

// ============================================================================
// Validation Error Codes
// ============================================================================

export enum ValidationErrorCode {
  // Frontmatter
  INVALID_FRONTMATTER = "INVALID_FRONTMATTER",
  INVALID_FRONTMATTER_TYPE = "INVALID_FRONTMATTER_TYPE",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
  MISSING_OPTIONAL_FIELD = "MISSING_OPTIONAL_FIELD",
  INVALID_FIELD_TYPE = "INVALID_FIELD_TYPE",

  // File naming
  INVALID_FILE_NAME = "INVALID_FILE_NAME",
  INVALID_FRACTIONAL_INDEX = "INVALID_FRACTIONAL_INDEX",
  MISSING_INDEX_FILE = "MISSING_INDEX_FILE",

  // Hierarchy
  INVALID_TYPE = "INVALID_TYPE",
  INVALID_HIERARCHY = "INVALID_HIERARCHY",
  DIRECTORY_CONTAINS_CHAPTER = "DIRECTORY_CONTAINS_CHAPTER",
  INVALID_PARENT_TYPE = "INVALID_PARENT_TYPE",

  // IDs
  DUPLICATE_ID = "DUPLICATE_ID",
  INVALID_ID_FORMAT = "INVALID_ID_FORMAT",

  // Locale
  INVALID_LOCALE_FORMAT = "INVALID_LOCALE_FORMAT",
  MISSING_LOCALE = "MISSING_LOCALE",

  // Other
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  INVALID_JSON = "INVALID_JSON",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  VALIDATION_TIMEOUT = "VALIDATION_TIMEOUT",
  LARGE_COMMIT_SKIP = "LARGE_COMMIT_SKIP",
}

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationError {
  message: string;
  path: string;
  start: Position;
  end?: Position;
  severity: "error";
  code: ValidationErrorCode;
  title?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  message: string;
  path: string;
  start: Position;
  end?: Position;
  severity: "warning";
  code: ValidationErrorCode;
  title?: string;
  suggestion?: string;
}

export interface ValidationInfo {
  message: string;
  path: string;
  code: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Validation Statistics
// ============================================================================

export interface ValidationStats {
  checked: {
    locales: number;
    chapters: number;
    directories: number;
    articles: number;
  };

  generated: {
    locales: number;
    chapters: number;
    directories: number;
    articles: number;
  };

  ignored: {
    locales: number;
    chapters: number;
    directories: number;
    articles: number;
  };

  modified: {
    locales: number;
    chapters: number;
    directories: number;
    articles: number;
  };
}

export interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  infos: ValidationInfo[];
  stats: ValidationStats;
}
