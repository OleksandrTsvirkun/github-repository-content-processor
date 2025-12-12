export enum ValidationCode {
  // Frontmatter
  INVALID_FRONTMATTER = "INVALID_FRONTMATTER",
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

export interface Position {
  line: number; // 1-based
  column: number; // 1-based
  offset: number; // 0-based byte offset
}

export enum ValidationSeverity {
  Error = "error",
  Warning = "warning",
  Info = "info",
}

export interface BaseValidationMessage {
  message: string;
  path: string;
  start: Position;
  end?: Position;
  severity: ValidationSeverity;
  title?: string;
}

export interface ValidationMessageMap {
  [ValidationSeverity.Error]: ValidationErrorMessage;
  [ValidationSeverity.Warning]: ValidationWarningMessage;
  [ValidationSeverity.Info]: ValidationInfoMessage;
}

export type ValidationMessage = ValidationMessageMap[keyof ValidationMessageMap];

export interface ValidationErrorMessage extends BaseValidationMessage {
  severity: ValidationSeverity.Error;
  code: ValidationCode;
  suggestion?: string | undefined;
}

export interface ValidationWarningMessage extends BaseValidationMessage {
  severity: ValidationSeverity.Warning;
  code?: ValidationCode | undefined;
  suggestion?: string | undefined;
}

export interface ValidationInfoMessage extends BaseValidationMessage {
  severity: ValidationSeverity.Info;
  code?: ValidationCode | undefined;
  suggestion?: string | undefined;
}

export type ValidationStatsReasons = {
  [reason: string]: number;
};

export type ValidationStatsFileReason = {
  path: string;
  reason: string;
};

export type ValidationStatsFileChange = ValidationStatsFileReason & {
  changes?: string[];
};

export type ValidationStatsFileCheck = {
  type: "added" | "modified" | "deleted" | "renamed" | "unchanged";
  path: string;
};

export interface ValidationStats {
  checked: {
    total: number;
    locale: number;
    chapter: number;
    directory: number;
    article: number;
    files: ValidationStatsFileCheck[];
  };

  generated: {
    total: number;
    files: string[];
  };

  ignored: {
    total: number;
    reasons: ValidationStatsReasons;
    files: ValidationStatsFileReason[];
  };

  modified: {
    total: number;
    reasons: ValidationStatsReasons;
    files: ValidationStatsFileChange[];
  };

  duration: number;
}

export interface FileValidationResult {
  success: boolean;
  errors: ValidationErrorMessage[];
  warnings: ValidationWarningMessage[];
  infos: ValidationInfoMessage[];
}

export interface ValidationResult {
  success: boolean;
  errors: ValidationErrorMessage[];
  warnings: ValidationWarningMessage[];
  infos: ValidationInfoMessage[];
  stats: ValidationStats;
}
