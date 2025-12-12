import type {
  ValidationError,
  ValidationWarning,
  ValidationInfo,
  ValidationResult,
} from "../core/types";
import type { RepositoryElement } from "../elements";
import Validator from "../core/Validator";
import FrontmatterValidator from "./FrontmatterValidator";
import FileNameValidator from "./FileNameValidator";
import HierarchyValidator from "./HierarchyValidator";
import DuplicateIdValidator from "./DuplicateIdValidator";

/**
 * Configuration options for validation pipeline.
 */
export interface ValidationPipelineOptions {
  /**
   * Enable/disable specific validators.
   */
  enabledValidators?: {
    frontmatter?: boolean;
    fileName?: boolean;
    hierarchy?: boolean;
    duplicateId?: boolean;
  };

  /**
   * Treat warnings as errors.
   */
  strictMode?: boolean;

  /**
   * Maximum number of errors to collect before stopping.
   * 0 means unlimited.
   */
  maxErrors?: number;
}

/**
 * Pipeline that runs multiple validators in sequence.
 * Collects all errors, warnings, and info messages from validators.
 */
export default class ValidationPipeline {
  private validators: Validator[];
  private options: Required<ValidationPipelineOptions>;

  constructor(options: ValidationPipelineOptions = {}) {
    this.options = {
      enabledValidators: {
        frontmatter: true,
        fileName: true,
        hierarchy: true,
        duplicateId: true,
        ...options.enabledValidators,
      },
      strictMode: options.strictMode ?? false,
      maxErrors: options.maxErrors ?? 0,
    };

    this.validators = this.createValidators();
  }

  /**
   * Creates validator instances based on configuration.
   */
  private createValidators(): Validator[] {
    const validators: Validator[] = [];

    if (this.options.enabledValidators.frontmatter) {
      validators.push(new FrontmatterValidator());
    }

    if (this.options.enabledValidators.fileName) {
      validators.push(new FileNameValidator());
    }

    if (this.options.enabledValidators.hierarchy) {
      validators.push(new HierarchyValidator());
    }

    if (this.options.enabledValidators.duplicateId) {
      validators.push(new DuplicateIdValidator());
    }

    return validators;
  }

  /**
   * Validates a single element through all validators.
   */
  validate(element: RepositoryElement): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const infos: ValidationInfo[] = [];

    for (const validator of this.validators) {
      const validatorErrors = validator.validate(element);
      errors.push(...validatorErrors);

      // Stop if max errors reached
      if (this.options.maxErrors > 0 && errors.length >= this.options.maxErrors) {
        break;
      }
    }

    return {
      errors,
      warnings,
      infos,
      stats: {
        checked: {
          locales: 0,
          chapters: 0,
          directories: 0,
          articles: 0,
        },
        generated: {
          locales: 0,
          chapters: 0,
          directories: 0,
          articles: 0,
        },
        ignored: {
          locales: 0,
          chapters: 0,
          directories: 0,
          articles: 0,
        },
        modified: {
          locales: 0,
          chapters: 0,
          directories: 0,
          articles: 0,
        },
      },
    };
  }

  /**
   * Validates multiple elements through all validators.
   * This allows validators to perform cross-element checks.
   */
  validateBatch(elements: RepositoryElement[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const infos: ValidationInfo[] = [];

    // Run validators that support batch validation
    for (const validator of this.validators) {
      const validatorErrors = validator.validateBatch(elements);
      errors.push(...validatorErrors);

      // Stop if max errors reached
      if (this.options.maxErrors > 0 && errors.length >= this.options.maxErrors) {
        break;
      }
    }

    // Count statistics
    const stats = {
      checked: {
        locales: 0,
        chapters: 0,
        directories: 0,
        articles: 0,
      },
      generated: {
        locales: 0,
        chapters: 0,
        directories: 0,
        articles: 0,
      },
      ignored: {
        locales: 0,
        chapters: 0,
        directories: 0,
        articles: 0,
      },
      modified: {
        locales: 0,
        chapters: 0,
        directories: 0,
        articles: 0,
      },
    };

    for (const element of elements) {
      const type = element.type;
      if (type === "locale") stats.checked.locales++;
      else if (type === "chapter") stats.checked.chapters++;
      else if (type === "directory") stats.checked.directories++;
      else if (type === "article") stats.checked.articles++;
    }

    return {
      errors,
      warnings,
      infos,
      stats,
    };
  }

  /**
   * Adds a custom validator to the pipeline.
   */
  addValidator(validator: Validator): void {
    this.validators.push(validator);
  }

  /**
   * Removes a validator from the pipeline by name.
   */
  removeValidator(name: string): boolean {
    const index = this.validators.findIndex((v) => v.name === name);
    if (index >= 0) {
      this.validators.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Gets all active validators.
   */
  getValidators(): ReadonlyArray<Validator> {
    return this.validators;
  }
}
