// src/index.ts
import * as core7 from "@actions/core";
import * as github from "@actions/github";
import * as fs4 from "fs";

// src/services/ContentScanner.ts
import * as fs2 from "fs/promises";
import * as path3 from "path";
import * as core2 from "@actions/core";

// src/services/LocalFileLoader.ts
import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import * as core from "@actions/core";
async function loadLocalFile(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    const content = await fs.promises.readFile(fullPath, "utf8");
    const { data: frontmatter, content: markdown } = matter(content);
    return {
      path: filePath,
      content: markdown,
      frontmatter
    };
  } catch (error5) {
    core.error(`Failed to read file ${filePath}: ${error5}`);
    return null;
  }
}

// src/utils/gitMetadata.ts
import { execSync } from "child_process";
import * as path2 from "path";
async function getGitFileMetadata(filePath, repoRoot) {
  const relativePath = path2.relative(repoRoot, filePath).replace(/\\/g, "/");
  try {
    const sha = execSync(
      `git -C "${repoRoot}" rev-parse HEAD:"${relativePath}"`,
      { encoding: "utf-8" }
    ).trim();
    const size = parseInt(
      execSync(
        `git -C "${repoRoot}" cat-file -s "${sha}"`,
        { encoding: "utf-8" }
      ).trim(),
      10
    );
    const created_at = execSync(
      `git -C "${repoRoot}" log --follow --format=%aI --reverse "${relativePath}" | head -1`,
      { encoding: "utf-8" }
    ).trim();
    const updated_at = execSync(
      `git -C "${repoRoot}" log -1 --format=%aI "${relativePath}"`,
      { encoding: "utf-8" }
    ).trim();
    return {
      sha,
      size,
      created_at: created_at || (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: updated_at || (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error5) {
    const fs5 = await import("fs/promises");
    const stats = await fs5.stat(filePath);
    return {
      sha: "",
      // Empty SHA for uncommitted files
      size: stats.size,
      created_at: stats.birthtime.toISOString(),
      updated_at: stats.mtime.toISOString()
    };
  }
}

// src/validations/domain/FractionalIndex.ts
var FractionalIndex = class _FractionalIndex {
  constructor(number, letters) {
    this.number = number;
    this.letters = letters;
    if (number < 0) {
      throw new Error("Number must be non-negative");
    }
    if (!letters || letters.length === 0) {
      throw new Error("Letters are required");
    }
    if (!/^[a-z]+$/.test(letters)) {
      throw new Error("Letters must be lowercase a-z only");
    }
  }
  /**
   * Get full fractional index as string
   * @returns string representation like "1a", "2b", "10aa"
   */
  get full() {
    return `${this.number}${this.letters}`;
  }
  /**
   * Parse a fractional index from string
   * @param input - string like "1a", "2b", "10aa"
   * @returns FractionalIndex instance
   * @throws Error if format is invalid
   */
  static parse(input) {
    const match = input.match(/^(\d+)([a-z]+)$/);
    if (!match || !match[1] || !match[2]) {
      throw new Error(
        `Invalid fractional index format: "${input}". Expected format: <number><letters> (e.g., 1a, 2b, 10aa)`
      );
    }
    const number = parseInt(match[1], 10);
    const letters = match[2];
    return new _FractionalIndex(number, letters);
  }
  /**
   * Check if a string is a valid fractional index
   * @param input - string to validate
   * @returns true if valid
   */
  static isValid(input) {
    return /^(\d+)([a-z]+)$/.test(input);
  }
  /**
   * Compare this fractional index with another
   * @param other - another FractionalIndex to compare with
   * @returns negative if this < other, 0 if equal, positive if this > other
   */
  compareTo(other) {
    return _FractionalIndex.compare(this, other);
  }
  static compare(left, right) {
    if (left.number !== right.number) {
      return left.number - right.number;
    }
    if (left.letters.length !== right.letters.length) {
      return right.letters.length - left.letters.length;
    }
    return left.letters.localeCompare(right.letters);
  }
  /**
   * String representation
   */
  toString() {
    return this.full;
  }
  static equals(left, right) {
    return left.number === right.number && left.letters === right.letters;
  }
  /**
   * Check equality
   */
  equals(other) {
    return _FractionalIndex.equals(this, other);
  }
};

// src/validations/domain/Slug.ts
var Slug = class _Slug {
  constructor(fractionalIndex, name) {
    this.fractionalIndex = fractionalIndex;
    this.name = name;
    if (!_Slug.isValidName(name)) {
      throw new Error(
        `Invalid slug name: "${name}". Only lowercase letters, digits, and hyphens are allowed`
      );
    }
  }
  /**
   * Get full slug as string
   * @returns string like "1a-intro", "2b-advanced"
   */
  get full() {
    return `${this.fractionalIndex.full}-${this.name}`;
  }
  /**
   * Parse a slug from string
   * @param input - string like "1a-intro", "2b-advanced"
   * @returns Slug instance
   * @throws Error if format is invalid
   */
  static parse(input) {
    const match = input.match(/^(\d+[a-z]+)-([a-z0-9-]+)$/);
    if (!match || !match[1] || !match[2]) {
      throw new Error(
        `Invalid slug format: "${input}". Expected format: <number><letters>-<name> (e.g., 1a-intro)`
      );
    }
    const fractionalIndex = FractionalIndex.parse(match[1]);
    const name = match[2];
    return new _Slug(fractionalIndex, name);
  }
  /**
   * Check if a string is a valid slug
   * @param input - string to validate
   * @returns true if valid
   */
  static isValid(input) {
    return /^(\d+[a-z]+)-([a-z0-9-]+)$/.test(input);
  }
  /**
   * Check if a name is valid (lowercase letters, digits, hyphens only)
   * @param name - name to validate
   * @returns true if valid
   */
  static isValidName(name) {
    return /^[a-z0-9-]+$/.test(name);
  }
  /**
   * Compare this slug with another
   * @param other - another Slug to compare with
   * @returns negative if this < other, 0 if equal, positive if this > other
   */
  compareTo(other) {
    return _Slug.compare(this, other);
  }
  static compare(left, right) {
    const indexComparison = left.fractionalIndex.compareTo(right.fractionalIndex);
    if (indexComparison !== 0) {
      return indexComparison;
    }
    return left.name.localeCompare(right.name);
  }
  /**
   * String representation
   */
  toString() {
    return this.full;
  }
  static equals(left, right) {
    return FractionalIndex.equals(left.fractionalIndex, right.fractionalIndex) && left.name === right.name;
  }
  /**
   * Check equality
   */
  equals(other) {
    return _Slug.equals(this, other);
  }
};

// src/validations/domain/ContentPath.ts
var ContentPath = class _ContentPath {
  constructor(locale, segments) {
    this.locale = locale;
    this.segments = segments;
    if (!_ContentPath.isValidLocale(locale)) {
      throw new Error(
        `Invalid locale format: "${locale}". Expected format: xx-XX (e.g., en-US, uk-UA)`
      );
    }
  }
  /**
   * Parse a content path from string
   * @param path - path string like "en-US/1a-web-dev/2b-html"
   * @returns ContentPath instance
   * @throws Error if format is invalid
   */
  static parse(path8) {
    const parts = path8.split("/").filter(Boolean);
    if (parts.length === 0) {
      throw new Error("Content path cannot be empty");
    }
    const locale = parts[0];
    if (!locale || !_ContentPath.isValidLocale(locale)) {
      throw new Error(`Invalid locale format: "${locale}". Expected format: xx-XX`);
    }
    const segments = parts.slice(1).map((part) => Slug.parse(part));
    return new _ContentPath(locale, segments);
  }
  /**
   * Create a ContentPath from locale only (root path)
   * @param locale - locale string like "en-US"
   * @returns ContentPath instance
   */
  static fromLocale(locale) {
    return new _ContentPath(locale, []);
  }
  /**
   * Check if a string is a valid locale format
   * @param locale - string to validate
   * @returns true if valid
   */
  static isValidLocale(locale) {
    return /^[a-z]{2}-[A-Z]{2}$/.test(locale);
  }
  /**
   * Get full path as array of strings
   * @returns array like ["en-US", "1a-web-dev", "2b-html"]
   */
  get path() {
    return [this.locale, ...this.segments.map((s) => s.full)];
  }
  /**
   * String representation
   * @returns path string like "en-US/1a-web-dev/2b-html"
   */
  toString() {
    return this.path.join("/");
  }
  /**
   * Get parent path
   * @returns parent ContentPath or null if at root
   */
  getParent() {
    if (this.segments.length === 0) return null;
    return new _ContentPath(this.locale, this.segments.slice(0, -1));
  }
  /**
   * Append a slug to the path
   * @param slug - Slug to append
   * @returns new ContentPath with appended slug
   */
  append(slug) {
    return new _ContentPath(this.locale, [...this.segments, slug]);
  }
  /**
   * Get depth of the path (0 = locale root, 1 = first level, etc.)
   * @returns depth as number
   */
  get depth() {
    return this.segments.length;
  }
  /**
   * Check if this is a root path (locale only)
   * @returns true if root
   */
  get isRoot() {
    return this.segments.length === 0;
  }
  static equals(left, right) {
    if (left.locale !== right.locale) return false;
    if (left.segments.length !== right.segments.length) return false;
    return left.segments.every((seg, i) => {
      const otherSeg = right.segments[i];
      return otherSeg && seg.equals(otherSeg);
    });
  }
  /**
   * Check equality
   * @param other - another ContentPath to compare with
   * @returns true if equal
   */
  equals(other) {
    return _ContentPath.equals(this, other);
  }
};

// src/validations/domain/ULID.ts
import { ulid as generateUlid } from "ulid";
var ULID = class _ULID {
  constructor(value) {
    this.value = value;
    if (!_ULID.isValid(value)) {
      throw new Error(`Invalid ULID format: "${value}". Expected 26 base32 characters`);
    }
  }
  /**
   * Generate a new ULID
   * @returns new ULID instance
   */
  static generate() {
    return new _ULID(generateUlid());
  }
  /**
   * Create ULID from existing value
   * @param value - ULID string
   * @returns ULID instance
   * @throws Error if invalid format
   */
  static from(value) {
    return new _ULID(value);
  }
  /**
   * Check if a string is a valid ULID
   * @param value - string to validate
   * @returns true if valid
   */
  static isValid(value) {
    return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value);
  }
  /**
   * String representation
   */
  toString() {
    return this.value;
  }
  /**
   * Check equality
   * @param other - another ULID to compare with
   * @returns true if equal
   */
  equals(other) {
    return this.value === other.value;
  }
  /**
   * Get timestamp from ULID
   * @returns Date object
   */
  getTimestamp() {
    const timestampPart = this.value.substring(0, 10);
    const base32Chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    let timestamp = 0;
    for (let i = 0; i < timestampPart.length; i++) {
      const char = timestampPart[i];
      if (!char) continue;
      const charValue = base32Chars.indexOf(char);
      timestamp = timestamp * 32 + charValue;
    }
    return new Date(timestamp);
  }
};

// src/validations/elements/RepositoryElement.ts
var RepositoryElement = class {
  constructor(path8, frontmatter, stats) {
    this.path = path8;
    this.frontmatter = frontmatter;
    this.stats = stats;
  }
  get id() {
    return ULID.from(this.frontmatter.id);
  }
  get slug() {
    return this.path.path;
  }
  get createdAt() {
    return this.stats.createdAt;
  }
  get updatedAt() {
    return this.stats.updatedAt;
  }
  get contentPath() {
    return this.path;
  }
};

// src/validations/elements/IndexElement.ts
var IndexElement = class extends RepositoryElement {
  children = [];
  constructor(path8, frontmatter, stats) {
    super(path8, frontmatter, stats);
  }
  get markdownFilePath() {
    return [this.path.locale, ...this.path.segments.map((x) => x.full), "index.md"].join("/");
  }
  get jsonFilePath() {
    return [this.path.locale, ...this.path.segments.map((x) => x.full), "index.json"].join("/");
  }
};

// src/validations/elements/LocaleElement.ts
var LocaleElement = class extends IndexElement {
  children = [];
  constructor(path8, frontmatter, stats) {
    super(path8, frontmatter, stats);
  }
  get type() {
    return "locale";
  }
  get markdownFilePath() {
    return [this.path.locale, "index.md"].join("/");
  }
  get jsonFilePath() {
    return [this.path.locale, "index.json"].join("/");
  }
  /**
   * Add a chapter to this locale
   * @param chapter - ChapterElement to add
   * @throws Error if trying to add non-chapter element
   */
  addChild(chapter) {
    if (chapter.type !== "chapter") {
      throw new Error("Locale can only contain chapters");
    }
    this.children.push(chapter);
  }
  /**
   * Get all children
   * @returns readonly array of chapters
   */
  getChildren() {
    return this.children;
  }
  /**
   * Validate this locale element
   * @returns array of validation errors
   */
  *validate() {
    if (this.frontmatter.type !== "locale") {
      yield {
        message: `Invalid type for locale. Expected "locale", got "${this.frontmatter.type}"`,
        path: this.path.toString(),
        start: { line: 1, column: 1, offset: 0 },
        severity: "error",
        code: "INVALID_TYPE" /* INVALID_TYPE */,
        title: "Invalid Element Type"
      };
    }
    if (!ContentPath.isValidLocale(this.path.locale)) {
      yield {
        message: `Invalid locale format: ${this.path.locale}. Expected format: xx-XX (e.g., en-US)`,
        path: this.path.toString(),
        start: { line: 1, column: 1, offset: 0 },
        severity: "error",
        code: "INVALID_LOCALE_FORMAT" /* INVALID_LOCALE_FORMAT */,
        title: "Invalid Locale Format"
      };
    }
    for (const child of this.children) {
      yield* child.validate();
    }
  }
  /**
   * Generate metadata for this locale
   * Children include only chapter hierarchy without articles/directories
   * @returns LocaleFullMetadata
   */
  generateMetadata() {
    const sortedChildren = this.sortChildren();
    const localeFrontmatter = this.frontmatter;
    return {
      id: this.id.toString(),
      title: localeFrontmatter.title,
      description: localeFrontmatter.description,
      cover_url: localeFrontmatter.cover_url,
      type: "locale",
      aliases: localeFrontmatter.aliases,
      locale: this.path.locale,
      slug: [],
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
      children: sortedChildren.map((child) => child.generateMetadataWithoutArticles())
    };
  }
  /**
   * Accept a visitor
   * @param visitor - ContentVisitor to accept
   */
  accept(visitor) {
    if (visitor && typeof visitor === "object" && "visitLocale" in visitor) {
      visitor.visitLocale(this);
    }
  }
  /**
   * Sort children by fractional index
   * @returns sorted array of chapters
   */
  sortChildren() {
    return [...this.children].sort((a, b) => {
      const aSlug = a.contentPath.segments[0];
      const bSlug = b.contentPath.segments[0];
      if (!aSlug || !bSlug) return 0;
      return aSlug.compareTo(bSlug);
    });
  }
};

// src/validations/elements/ChapterElement.ts
var ChapterElement = class _ChapterElement extends IndexElement {
  children = [];
  parent;
  constructor(path8, frontmatter, stats, parent) {
    super(path8, frontmatter, stats);
    this.parent = parent;
  }
  get type() {
    return "chapter";
  }
  /**
   * Add a child element
   * @param element - child element to add
   */
  addChild(element) {
    this.children.push(element);
  }
  /**
   * Get all children
   * @returns readonly array of children
   */
  getChildren() {
    return this.children;
  }
  /**
   * Get parent element
   * @returns parent locale or chapter
   */
  getParent() {
    return this.parent;
  }
  /**
   * Validate this chapter element
   * @returns array of validation errors
   */
  *validate() {
    if (this.frontmatter.type !== "chapter") {
      yield {
        message: `Invalid type for chapter. Expected "chapter", got "${this.frontmatter.type}"`,
        path: this.path.toString(),
        start: { line: 1, column: 1, offset: 0 },
        severity: "error",
        code: "INVALID_TYPE" /* INVALID_TYPE */,
        title: "Invalid Element Type"
      };
    }
    for (const child of this.children) {
      yield* child.validate();
    }
  }
  /**
   * Generate full metadata with all children
   * Nested chapters include only metadata without their children
   * @returns ChapterFullMetadata
   */
  generateMetadata() {
    const sortedChildren = this.sortChildren();
    const chapterFrontmatter = this.frontmatter;
    return {
      id: this.id.toString(),
      title: chapterFrontmatter.title,
      description: chapterFrontmatter.description,
      cover_url: chapterFrontmatter.cover_url,
      type: "chapter",
      locale: this.path.locale,
      slug: this.slug,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
      children: sortedChildren.map((child) => {
        if (child instanceof _ChapterElement) {
          return child.generateMetadataWithoutChildren();
        }
        return child.generateMetadata();
      })
    };
  }
  /**
   * Generate metadata without children (for nested chapters)
   * @returns ChapterMetadata
   */
  generateMetadataWithoutChildren() {
    const chapterFrontmatter = this.frontmatter;
    return {
      id: this.id.toString(),
      title: chapterFrontmatter.title,
      description: chapterFrontmatter.description,
      cover_url: chapterFrontmatter.cover_url,
      type: "chapter",
      locale: this.path.locale,
      slug: this.slug,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString()
    };
  }
  /**
   * Generate metadata without articles and directories (only chapter hierarchy)
   * Used for locale index.json
   * @returns ChapterFullMetadata with only chapter children
   */
  generateMetadataWithoutArticles() {
    const chapterChildren = this.sortChildren().filter(
      (child) => child instanceof _ChapterElement
    );
    const chapterFrontmatter = this.frontmatter;
    return {
      id: this.id.toString(),
      title: chapterFrontmatter.title,
      description: chapterFrontmatter.description,
      cover_url: chapterFrontmatter.cover_url,
      type: "chapter",
      locale: this.path.locale,
      slug: this.slug,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
      children: chapterChildren.map((child) => child.generateMetadataWithoutArticles())
    };
  }
  /**
   * Accept a visitor
   * @param visitor - ContentVisitor to accept
   */
  accept(visitor) {
    if (visitor && typeof visitor === "object" && "visitChapter" in visitor) {
      visitor.visitChapter(this);
    }
  }
  /**
   * Sort children by fractional index
   * @returns sorted array of children
   */
  sortChildren() {
    return [...this.children].sort((a, b) => {
      const aSlug = a.contentPath.segments[a.contentPath.segments.length - 1];
      const bSlug = b.contentPath.segments[b.contentPath.segments.length - 1];
      if (!aSlug || !bSlug) return 0;
      return aSlug.compareTo(bSlug);
    });
  }
};

// src/validations/elements/DirectoryElement.ts
var DirectoryElement = class extends IndexElement {
  children = [];
  parent;
  constructor(path8, frontmatter, stats, parent) {
    super(path8, frontmatter, stats);
    this.parent = parent;
  }
  get type() {
    return "directory";
  }
  /**
   * Add a child element
   * @param element - child element to add
   * @throws Error if trying to add chapter
   */
  addChild(element) {
    if (element.type === "chapter") {
      throw new Error("Directory cannot contain chapters");
    }
    this.children.push(element);
  }
  /**
   * Get all children
   * @returns readonly array of children
   */
  getChildren() {
    return this.children;
  }
  /**
   * Get parent element
   * @returns parent chapter or directory
   */
  getParent() {
    return this.parent;
  }
  /**
   * Validate this directory element
   * @returns array of validation errors
   */
  *validate() {
    if (this.frontmatter.type !== "directory") {
      yield {
        message: `Invalid type for directory. Expected "directory", got "${this.frontmatter.type}"`,
        path: this.path.toString(),
        start: { line: 1, column: 1, offset: 0 },
        severity: "error",
        code: "INVALID_TYPE" /* INVALID_TYPE */,
        title: "Invalid Element Type"
      };
    }
    const hasChapters = this.children.some((child) => child.type === "chapter");
    if (hasChapters) {
      yield {
        message: "Directory cannot contain chapters",
        path: this.path.toString(),
        start: { line: 1, column: 1, offset: 0 },
        severity: "error",
        code: "DIRECTORY_CONTAINS_CHAPTER" /* DIRECTORY_CONTAINS_CHAPTER */,
        title: "Invalid Hierarchy",
        suggestion: 'Change parent type to "chapter" or remove chapter children'
      };
    }
    for (const child of this.children) {
      yield* child.validate();
    }
  }
  /**
   * Generate full metadata with all children
   * @returns DirectoryFullMetadata
   */
  generateMetadata() {
    const sortedChildren = this.sortChildren();
    const directoryFrontmatter = this.frontmatter;
    return {
      id: this.id.toString(),
      title: directoryFrontmatter.title,
      description: directoryFrontmatter.description,
      cover_url: directoryFrontmatter.cover_url,
      type: "directory",
      locale: this.path.locale,
      slug: this.slug,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
      children: sortedChildren.map((child) => child.generateMetadata())
    };
  }
  /**
   * Accept a visitor
   * @param visitor - ContentVisitor to accept
   */
  accept(visitor) {
    if (visitor && typeof visitor === "object" && "visitDirectory" in visitor) {
      visitor.visitDirectory(this);
    }
  }
  /**
   * Sort children by fractional index
   * @returns sorted array of children
   */
  sortChildren() {
    return [...this.children].sort((a, b) => {
      const aSlug = a.contentPath.segments[a.contentPath.segments.length - 1];
      const bSlug = b.contentPath.segments[b.contentPath.segments.length - 1];
      if (!aSlug || !bSlug) return 0;
      return aSlug.compareTo(bSlug);
    });
  }
};

// src/validations/elements/ArticleElement.ts
var ArticleElement = class extends RepositoryElement {
  parent;
  constructor(path8, frontmatter, stats, parent) {
    super(path8, frontmatter, stats);
    this.parent = parent;
  }
  get type() {
    return "article";
  }
  get markdownFilePath() {
    const segments = this.path.segments.slice(0, -1);
    const last = this.path.segments.at(-1);
    if (last) {
      return [this.path.locale, ...segments.map((x) => x.full), `${last}.md`].join("/");
    }
    throw new Error("Invalid path: missing last segment");
  }
  /**
   * Get parent element
   * @returns parent chapter or directory
   */
  getParent() {
    return this.parent;
  }
  /**
   * Validate this article element
   * @returns array of validation errors
   */
  *validate() {
    if (this.frontmatter.type && this.frontmatter.type !== "article") {
      yield {
        message: `Invalid type for article. Expected "article" or undefined, got "${this.frontmatter.type}"`,
        path: this.path.toString(),
        start: { line: 1, column: 1, offset: 0 },
        severity: "error",
        code: "INVALID_TYPE" /* INVALID_TYPE */,
        title: "Invalid Element Type",
        suggestion: 'Remove type field or set it to "article"'
      };
    }
  }
  /**
   * Generate metadata for this article
   * @returns ArticleMetadata
   */
  generateMetadata() {
    const articleFrontmatter = this.frontmatter;
    return {
      id: this.id.toString(),
      title: articleFrontmatter.title,
      description: articleFrontmatter.description,
      cover_url: articleFrontmatter.cover_url,
      type: "article",
      locale: this.path.locale,
      slug: this.slug,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString()
    };
  }
  /**
   * Accept a visitor
   * @param visitor - ContentVisitor to accept
   */
  accept(visitor) {
    if (visitor && typeof visitor === "object" && "visitArticle" in visitor) {
      visitor.visitArticle(this);
    }
  }
};

// src/services/ContentScanner.ts
function isValidLocale(name) {
  return /^[a-z]{2}-[A-Z]{2}$/.test(name);
}
function isFractionalIndex(name) {
  return /^[0-9]+[a-z]?-.+$/.test(name);
}
async function scanRepository(repoRoot) {
  core2.info(`Scanning repository: ${repoRoot}`);
  const locales = [];
  for await (const locale of scanLocales(repoRoot)) {
    locales.push(locale);
  }
  return {
    root: repoRoot,
    locales
  };
}
async function* scanLocales(repoRoot) {
  const entries = await fs2.readdir(repoRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!isValidLocale(entry.name)) continue;
    const localePath = path3.join(repoRoot, entry.name);
    const localeFilePath = path3.join(localePath, "locale.md");
    try {
      await fs2.access(localeFilePath);
    } catch {
      core2.warning(`Skipping locale ${entry.name}: locale.md not found`);
      continue;
    }
    core2.info(`Found locale: ${entry.name}`);
    const [localeFileInfo, gitMetadata] = await Promise.all([
      loadLocalFile(localeFilePath),
      getGitFileMetadata(localeFilePath, repoRoot)
    ]);
    if (!localeFileInfo) {
      core2.warning(`Skipping locale ${entry.name}: failed to load locale.md`);
      continue;
    }
    const localeFile = {
      absolutePath: localeFilePath,
      relativePath: `${entry.name}/locale.md`,
      fileInfo: localeFileInfo,
      gitMetadata
    };
    const chapters = [];
    for await (const chapter of scanFolders(localePath, repoRoot, entry.name, true)) {
      chapters.push(chapter);
    }
    yield {
      absolutePath: localePath,
      name: entry.name,
      localeFile,
      chapters
    };
  }
}
async function* scanFolders(folderPath, repoRoot, relativePath, isLocaleRoot = false) {
  const entries = await fs2.readdir(folderPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "locale.md") continue;
    if (entry.name.endsWith(".json")) continue;
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      const subfolderPath = path3.join(folderPath, entry.name);
      const indexFilePath = path3.join(subfolderPath, "index.md");
      if (!isLocaleRoot && !isFractionalIndex(entry.name)) {
        core2.warning(`Folder ${entry.name} does not use fractional index naming`);
      }
      let indexFile;
      try {
        await fs2.access(indexFilePath);
        const indexFileInfo = await loadLocalFile(indexFilePath);
        if (!indexFileInfo) {
          core2.warning(`Skipping folder ${entry.name}: failed to load index.md`);
          continue;
        }
        const gitMetadata = await getGitFileMetadata(indexFilePath, repoRoot);
        indexFile = {
          absolutePath: indexFilePath,
          relativePath: `${relativePath}/${entry.name}/index.md`,
          fileInfo: indexFileInfo,
          gitMetadata
        };
      } catch {
        core2.warning(`Skipping folder ${entry.name}: index.md not found`);
        continue;
      }
      const articles = [];
      const subfolders = [];
      const subEntries = await fs2.readdir(subfolderPath, { withFileTypes: true });
      for (const subEntry of subEntries) {
        if (subEntry.name === "index.md") continue;
        if (subEntry.name.endsWith(".json")) continue;
        if (subEntry.name.startsWith(".")) continue;
        if (subEntry.isFile() && subEntry.name.endsWith(".md")) {
          const articlePath = path3.join(subfolderPath, subEntry.name);
          const articleName = subEntry.name.replace(/\.md$/, "");
          if (!isFractionalIndex(articleName)) {
            core2.warning(`Article ${subEntry.name} does not use fractional index naming`);
          }
          const articleFileInfo = await loadLocalFile(articlePath);
          if (!articleFileInfo) {
            core2.warning(`Failed to load article ${subEntry.name}`);
            continue;
          }
          const gitMetadata = await getGitFileMetadata(articlePath, repoRoot);
          articles.push({
            absolutePath: articlePath,
            relativePath: `${relativePath}/${entry.name}/${subEntry.name}`,
            fileInfo: articleFileInfo,
            gitMetadata
          });
        }
      }
      for (const subEntry of subEntries) {
        if (subEntry.isDirectory()) {
          for await (const subfolder of scanFolders(
            subfolderPath,
            repoRoot,
            `${relativePath}/${entry.name}`,
            false
          )) {
            subfolders.push(subfolder);
          }
        }
      }
      yield {
        absolutePath: subfolderPath,
        relativePath: `${relativePath}/${entry.name}`,
        name: entry.name,
        indexFile,
        articles,
        subfolders
      };
    }
  }
}

// src/services/MetadataGeneratorService.ts
import * as core3 from "@actions/core";
import * as path5 from "path";

// src/services/DomainServices.ts
import * as fs3 from "fs/promises";
var FractionalIndexSorter = class {
  sort(items) {
    return [...items].sort((a, b) => {
      const indexA = "fractionalIndex" in a && typeof a.fractionalIndex === "string" ? a.fractionalIndex : "";
      const indexB = "fractionalIndex" in b && typeof b.fractionalIndex === "string" ? b.fractionalIndex : "";
      return indexA.localeCompare(indexB);
    });
  }
};
var BaseMetadataBuilder = class {
  build(frontmatter, gitMetadata, locale, slug) {
    return {
      ...frontmatter,
      locale,
      slug,
      ...gitMetadata
    };
  }
};
var ArticleMetadataBuilder = class extends BaseMetadataBuilder {
};
var ChapterMetadataBuilder = class extends BaseMetadataBuilder {
};
var DirectoryMetadataBuilder = class extends BaseMetadataBuilder {
};
var LocaleMetadataBuilder = class extends BaseMetadataBuilder {
};
var JsonFileWriter = class {
  async write(filePath, data) {
    await fs3.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }
  async read(filePath) {
    try {
      const content = await fs3.readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
};

// src/services/AncestorBuilder.ts
import * as path4 from "path";
var AncestorBuilder = class {
  constructor(localeBuilder = new LocaleMetadataBuilder(), chapterBuilder = new ChapterMetadataBuilder(), directoryBuilder = new DirectoryMetadataBuilder()) {
    this.localeBuilder = localeBuilder;
    this.chapterBuilder = chapterBuilder;
    this.directoryBuilder = directoryBuilder;
  }
  /**
   * Build ancestors chain from locale to immediate parent
   */
  async buildAncestors(localeName, slugPath, repoRoot) {
    const ancestors = [];
    const localeAncestor = await this.buildLocaleAncestor(localeName, repoRoot);
    if (localeAncestor) {
      ancestors.push(localeAncestor);
    }
    await this.buildFolderAncestors(localeName, slugPath, repoRoot, ancestors);
    return ancestors;
  }
  /**
   * Build locale ancestor
   */
  async buildLocaleAncestor(localeName, repoRoot) {
    const localePath = path4.join(repoRoot, localeName, "locale.md");
    const [localeFileInfo, localeGitMetadata] = await Promise.all([
      loadLocalFile(localePath),
      getGitFileMetadata(localePath, repoRoot)
    ]);
    if (!localeFileInfo) {
      return null;
    }
    const frontmatter = localeFileInfo.frontmatter;
    if (frontmatter.type !== "locale") {
      throw new Error(`Expected locale frontmatter but got ${frontmatter.type}`);
    }
    return this.localeBuilder.build(frontmatter, localeGitMetadata, localeName, []);
  }
  /**
   * Build folder ancestors recursively
   */
  async buildFolderAncestors(localeName, slugPath, repoRoot, ancestors) {
    let currentPath = path4.join(repoRoot, localeName);
    const currentSlug = [];
    const ancestorPromises = slugPath.map(async (segment, index) => {
      const pathSegments = slugPath.slice(0, index + 1);
      const folderPath = path4.join(repoRoot, localeName, ...pathSegments);
      const indexPath = path4.join(folderPath, "index.md");
      const [indexFileInfo, indexGitMetadata] = await Promise.all([
        loadLocalFile(indexPath),
        getGitFileMetadata(indexPath, repoRoot)
      ]);
      return {
        segment,
        slug: [...pathSegments],
        indexFileInfo,
        indexGitMetadata
      };
    });
    const ancestorData = await Promise.all(ancestorPromises);
    for (const { segment, slug, indexFileInfo, indexGitMetadata } of ancestorData) {
      currentSlug.push(segment);
      if (!indexFileInfo) {
        continue;
      }
      const frontmatter = indexFileInfo.frontmatter;
      if (frontmatter.type === "chapter") {
        const ancestor = this.chapterBuilder.build(
          frontmatter,
          indexGitMetadata,
          localeName,
          [...currentSlug]
        );
        ancestors.push(ancestor);
      } else if (frontmatter.type === "directory") {
        const ancestor = this.directoryBuilder.build(
          frontmatter,
          indexGitMetadata,
          localeName,
          [...currentSlug]
        );
        ancestors.push(ancestor);
      }
    }
  }
};

// src/services/MetadataGeneratorService.ts
var MetadataGeneratorService = class _MetadataGeneratorService {
  constructor(jsonWriter, articleBuilder, chapterBuilder, directoryBuilder, localeBuilder, ancestorBuilder, sorter) {
    this.jsonWriter = jsonWriter;
    this.articleBuilder = articleBuilder;
    this.chapterBuilder = chapterBuilder;
    this.directoryBuilder = directoryBuilder;
    this.localeBuilder = localeBuilder;
    this.ancestorBuilder = ancestorBuilder;
    this.sorter = sorter;
  }
  /**
   * Factory method for creating a MetadataGeneratorService with default dependencies
   */
  static createDefault() {
    const jsonWriter = new JsonFileWriter();
    const articleBuilder = new ArticleMetadataBuilder();
    const chapterBuilder = new ChapterMetadataBuilder();
    const directoryBuilder = new DirectoryMetadataBuilder();
    const localeBuilder = new LocaleMetadataBuilder();
    const ancestorBuilder = new AncestorBuilder();
    const sorter = new FractionalIndexSorter();
    return new _MetadataGeneratorService(
      jsonWriter,
      articleBuilder,
      chapterBuilder,
      directoryBuilder,
      localeBuilder,
      ancestorBuilder,
      sorter
    );
  }
  /**
   * Generate all metadata JSON files for the repository
   */
  async generateMetadataFiles(scanned, repoRoot) {
    core3.info("Generating metadata files...");
    const localeIndices = /* @__PURE__ */ new Map();
    const folderIndices = /* @__PURE__ */ new Map();
    const localesJsonPath = await this.generateLocalesJson(scanned, repoRoot);
    await Promise.all(
      scanned.locales.map(async (locale) => {
        await this.generateLocaleIndices(locale, localeIndices, repoRoot, folderIndices);
      })
    );
    return {
      localesJson: localesJsonPath,
      localeIndices,
      folderIndices
    };
  }
  /**
   * Generate locales.json file
   */
  async generateLocalesJson(scanned, repoRoot) {
    const localesMetadata = scanned.locales.map((locale) => {
      const frontmatter = locale.localeFile.fileInfo.frontmatter;
      if (frontmatter.type !== "locale") {
        throw new Error(`Expected locale frontmatter but got ${frontmatter.type}`);
      }
      return this.localeBuilder.build(frontmatter, locale.localeFile.gitMetadata, locale.name, []);
    });
    const localesJsonPath = path5.join(repoRoot, "locales.json");
    await this.jsonWriter.write(localesJsonPath, localesMetadata);
    core3.info(`Generated: locales.json`);
    return localesJsonPath;
  }
  /**
   * Generate indices for a single locale
   */
  async generateLocaleIndices(locale, localeIndices, repoRoot, folderIndices) {
    const localePath = locale.absolutePath;
    const { full: fullChapters, shallow: shallowChapters } = await this.buildLocaleIndices(
      locale
    );
    const fullPath = path5.join(localePath, "index.full.json");
    const shallowPath = path5.join(localePath, "index.shallow.json");
    await Promise.all([
      this.jsonWriter.write(fullPath, fullChapters),
      this.jsonWriter.write(shallowPath, shallowChapters)
    ]);
    localeIndices.set(locale.name, { full: fullPath, shallow: shallowPath });
    core3.info(`Generated: ${locale.name}/index.full.json, index.shallow.json`);
    await Promise.all(
      locale.chapters.map(
        (chapter) => this.generateFolderIndices(chapter, locale.name, [], repoRoot, folderIndices)
      )
    );
  }
  /**
   * Build locale-level indices
   */
  async buildLocaleIndices(locale) {
    const full = [];
    const shallow = [];
    for (const chapter of locale.chapters) {
      const chapterSlug = [chapter.name];
      const frontmatter = chapter.indexFile.fileInfo.frontmatter;
      if (frontmatter.type !== "chapter") {
        throw new Error(`Expected chapter frontmatter but got ${frontmatter.type}`);
      }
      const shallowMetadata = this.chapterBuilder.build(
        frontmatter,
        chapter.indexFile.gitMetadata,
        locale.name,
        chapterSlug
      );
      shallow.push(shallowMetadata);
      const children = await this.buildChapterChildren(chapter, locale.name, chapterSlug);
      const fullMetadata = {
        ...shallowMetadata,
        children: this.sorter.sort(children)
      };
      full.push(fullMetadata);
    }
    return { full, shallow };
  }
  /**
   * Build children for a chapter
   */
  async buildChapterChildren(folder, locale, parentSlug) {
    const children = [];
    for (const article of folder.articles) {
      const articleMetadata = this.buildArticleMetadata(article, locale, parentSlug);
      children.push(articleMetadata);
    }
    for (const subfolder of folder.subfolders) {
      if (!subfolder.indexFile) continue;
      const subfolderSlug = [...parentSlug, subfolder.name];
      const frontmatter = subfolder.indexFile.fileInfo.frontmatter;
      const type = frontmatter.type;
      if (type === "chapter") {
        const chapterMetadata = this.chapterBuilder.build(
          frontmatter,
          subfolder.indexFile.gitMetadata,
          locale,
          subfolderSlug
        );
        children.push(chapterMetadata);
      } else if (type === "directory") {
        const directoryChildren = await this.buildDirectoryChildren(
          subfolder,
          locale,
          subfolderSlug
        );
        const directoryMetadata = {
          ...this.directoryBuilder.build(
            frontmatter,
            subfolder.indexFile.gitMetadata,
            locale,
            subfolderSlug
          ),
          children: this.sorter.sort(directoryChildren)
        };
        children.push(directoryMetadata);
      }
    }
    return children;
  }
  /**
   * Build children for a directory
   */
  async buildDirectoryChildren(folder, locale, parentSlug) {
    const children = [];
    for (const article of folder.articles) {
      if (article.fileInfo.frontmatter.type !== "article") continue;
      const articleMetadata = this.buildArticleMetadata(article, locale, parentSlug);
      children.push(articleMetadata);
    }
    for (const subfolder of folder.subfolders) {
      if (!subfolder.indexFile) continue;
      const type = subfolder.indexFile.fileInfo.frontmatter.type;
      if (type === "chapter") {
        core3.error(
          `Directory ${folder.name} contains chapter ${subfolder.name} - this is a validation error!`
        );
        continue;
      }
      const subfolderSlug = [...parentSlug, subfolder.name];
      const directoryChildren = await this.buildDirectoryChildren(subfolder, locale, subfolderSlug);
      const directoryMetadata = {
        ...this.directoryBuilder.build(
          subfolder.indexFile.fileInfo.frontmatter,
          subfolder.indexFile.gitMetadata,
          locale,
          subfolderSlug
        ),
        children: this.sorter.sort(directoryChildren)
      };
      children.push(directoryMetadata);
    }
    return children;
  }
  /**
   * Build article metadata
   */
  buildArticleMetadata(article, locale, parentSlug) {
    const articleName = path5.basename(article.relativePath, ".md");
    const articleSlug = [...parentSlug, articleName];
    return this.articleBuilder.build(
      article.fileInfo.frontmatter,
      article.gitMetadata,
      locale,
      articleSlug
    );
  }
  /**
   * Generate indices for a folder and its subfolders recursively
   */
  async generateFolderIndices(folder, locale, parentSlug, repoRoot, folderIndices) {
    if (!folder.indexFile) return;
    const folderSlug = [...parentSlug, folder.name];
    const frontmatter = folder.indexFile.fileInfo.frontmatter;
    const type = frontmatter.type;
    const [ancestors, children] = await Promise.all([
      this.ancestorBuilder.buildAncestors(locale, parentSlug, repoRoot),
      type === "chapter" ? this.buildChapterChildren(folder, locale, folderSlug) : this.buildDirectoryChildren(folder, locale, folderSlug)
    ]);
    const ancestorsPath = path5.join(folder.absolutePath, "ancestors.json");
    const shallowPath = path5.join(folder.absolutePath, "index.shallow.json");
    const fullPath = path5.join(folder.absolutePath, "index.full.json");
    const shallowMetadata = type === "chapter" ? this.chapterBuilder.build(
      frontmatter,
      folder.indexFile.gitMetadata,
      locale,
      folderSlug
    ) : this.directoryBuilder.build(
      frontmatter,
      folder.indexFile.gitMetadata,
      locale,
      folderSlug
    );
    const fullMetadata = {
      ...shallowMetadata,
      children: this.sorter.sort(children)
    };
    await Promise.all([
      this.jsonWriter.write(ancestorsPath, ancestors),
      this.jsonWriter.write(shallowPath, shallowMetadata),
      this.jsonWriter.write(fullPath, fullMetadata)
    ]);
    folderIndices.set(folderSlug.join("/"), {
      full: fullPath,
      shallow: shallowPath,
      ancestors: ancestorsPath
    });
    core3.info(`Generated: ${folderSlug.join("/")}/index.*.json`);
    await Promise.all(
      folder.subfolders.map(
        (subfolder) => this.generateFolderIndices(subfolder, locale, folderSlug, repoRoot, folderIndices)
      )
    );
  }
};
async function generateMetadataFiles(scanned, repoRoot) {
  const service = MetadataGeneratorService.createDefault();
  return service.generateMetadataFiles(scanned, repoRoot);
}

// src/utils/gitCommit.ts
import { execSync as execSync2 } from "child_process";
import * as core4 from "@actions/core";
var COMMIT_MESSAGE_PREFIX = "[auto:Amentor GitHub Content Manager Action]";
function isAutoCommit(repoRoot = process.cwd()) {
  try {
    const lastMessage = execSync2("git log -1 --pretty=%B", {
      encoding: "utf-8",
      cwd: repoRoot
    }).trim();
    return lastMessage.startsWith(COMMIT_MESSAGE_PREFIX);
  } catch {
    return false;
  }
}
async function commitGeneratedFiles(files, repoRoot = process.cwd()) {
  if (files.length === 0) {
    core4.info("No files to commit");
    return;
  }
  try {
    execSync2('git config user.name "github-actions[bot]"', { cwd: repoRoot });
    execSync2('git config user.email "github-actions[bot]@users.noreply.github.com"', {
      cwd: repoRoot
    });
    for (const file of files) {
      execSync2(`git add "${file}"`, { cwd: repoRoot });
    }
    const status = execSync2("git status --porcelain", {
      encoding: "utf-8",
      cwd: repoRoot
    }).trim();
    if (!status) {
      core4.info("No changes to commit (files are already up-to-date)");
      return;
    }
    const commitMessage = `${COMMIT_MESSAGE_PREFIX} Generated metadata files

Generated ${files.length} metadata files:
${files.map((f) => `- ${f}`).join("\n")}`;
    execSync2(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
      cwd: repoRoot,
      stdio: "inherit"
    });
    core4.info(`Committed ${files.length} generated files`);
    execSync2("git push", {
      cwd: repoRoot,
      stdio: "inherit"
    });
    core4.info("Pushed changes to remote repository");
  } catch (error5) {
    core4.error(`Failed to commit files: ${error5}`);
    throw error5;
  }
}

// src/validations/core/Validator.ts
var Validator = class {
  /**
   * Optional: Validates multiple elements at once for cross-element checks.
   * Default implementation validates each element independently.
   * @param elements - Iterable of elements to validate
   * @returns Generator of validation errors
   */
  *validateBatch(elements) {
    for (const element of elements) {
      yield* this.validate(element);
    }
  }
};

// src/validations/validators/FrontmatterValidator.ts
var FrontmatterValidator = class extends Validator {
  get name() {
    return "FrontmatterValidator";
  }
  *validate(element) {
    const frontmatter = element["frontmatter"];
    const path8 = element["path"];
    if (element instanceof LocaleElement) {
      yield* this.validateLocale(frontmatter, path8.path);
    } else if (element instanceof ChapterElement) {
      yield* this.validateChapter(frontmatter, path8.path);
    } else if (element instanceof DirectoryElement) {
      yield* this.validateDirectory(frontmatter, path8.path);
    } else if (element instanceof ArticleElement) {
      yield* this.validateArticle(frontmatter, path8.path);
    }
  }
  *validateLocale(frontmatter, path8) {
    if (frontmatter.type !== "locale") {
      yield this.createError(
        "INVALID_FRONTMATTER_TYPE" /* INVALID_FRONTMATTER_TYPE */,
        `Locale must have type="locale", got "${frontmatter.type}"`,
        path8
      );
    }
    if (!frontmatter.title || typeof frontmatter.title !== "string") {
      yield this.createError(
        "MISSING_REQUIRED_FIELD" /* MISSING_REQUIRED_FIELD */,
        "Locale must have a title",
        path8
      );
    }
    if (frontmatter.description && typeof frontmatter.description !== "string") {
      yield this.createError(
        "INVALID_FIELD_TYPE" /* INVALID_FIELD_TYPE */,
        "Locale description must be a string",
        path8
      );
    }
    if (!frontmatter.title || typeof frontmatter.title !== "string") {
      yield this.createError(
        "MISSING_REQUIRED_FIELD" /* MISSING_REQUIRED_FIELD */,
        "Locale must have a title",
        path8
      );
    }
    if (frontmatter.description && typeof frontmatter.description !== "string") {
      yield this.createError(
        "INVALID_FIELD_TYPE" /* INVALID_FIELD_TYPE */,
        "Locale description must be a string",
        path8
      );
    }
  }
  *validateChapter(frontmatter, path8) {
    if (frontmatter.type !== "chapter") {
      yield this.createError(
        "INVALID_FRONTMATTER_TYPE" /* INVALID_FRONTMATTER_TYPE */,
        `Chapter must have type="chapter", got "${frontmatter.type}"`,
        path8
      );
    }
    if (!frontmatter.title || typeof frontmatter.title !== "string") {
      yield this.createError(
        "MISSING_REQUIRED_FIELD" /* MISSING_REQUIRED_FIELD */,
        "Chapter must have a title",
        path8
      );
    }
    if (frontmatter.description && typeof frontmatter.description !== "string") {
      yield this.createError(
        "INVALID_FIELD_TYPE" /* INVALID_FIELD_TYPE */,
        "Chapter description must be a string",
        path8
      );
    }
  }
  *validateDirectory(frontmatter, path8) {
    if (frontmatter.type !== "directory") {
      yield this.createError(
        "INVALID_FRONTMATTER_TYPE" /* INVALID_FRONTMATTER_TYPE */,
        `Directory must have type="directory", got "${frontmatter.type}"`,
        path8
      );
    }
    if (!frontmatter.title || typeof frontmatter.title !== "string") {
      yield this.createError(
        "MISSING_REQUIRED_FIELD" /* MISSING_REQUIRED_FIELD */,
        "Directory must have a title",
        path8
      );
    }
    if (frontmatter.description && typeof frontmatter.description !== "string") {
      yield this.createError(
        "INVALID_FIELD_TYPE" /* INVALID_FIELD_TYPE */,
        "Directory description must be a string",
        path8
      );
    }
  }
  *validateArticle(frontmatter, path8) {
    if (frontmatter.type && frontmatter.type !== "article") {
      yield this.createError(
        "INVALID_FRONTMATTER_TYPE" /* INVALID_FRONTMATTER_TYPE */,
        `Article type must be "article" if specified, got "${frontmatter.type}"`,
        path8
      );
    }
    if (!frontmatter.title || typeof frontmatter.title !== "string") {
      yield this.createError(
        "MISSING_REQUIRED_FIELD" /* MISSING_REQUIRED_FIELD */,
        "Article must have a title",
        path8
      );
    }
    if (frontmatter.description && typeof frontmatter.description !== "string") {
      yield this.createError(
        "INVALID_FIELD_TYPE" /* INVALID_FIELD_TYPE */,
        "Article description must be a string",
        path8
      );
    }
    if (frontmatter.description && typeof frontmatter.description !== "string") {
      yield this.createError(
        "INVALID_FIELD_TYPE" /* INVALID_FIELD_TYPE */,
        "Article description must be a string",
        path8
      );
    }
  }
  createError(code, message, path8) {
    return {
      code,
      message,
      path: path8.join("/"),
      start: { line: 1, column: 1, offset: 0 },
      // Frontmatter is at top
      severity: "error"
    };
  }
};

// src/validations/validators/FileNameValidator.ts
var FileNameValidator = class _FileNameValidator extends Validator {
  static FILENAME_PATTERN = /^(\d+)([a-z]+)-([a-z0-9-]+)$/;
  static LOCALE_PATTERN = /^[a-z]{2}-[A-Z]{2}$/;
  get name() {
    return "FileNameValidator";
  }
  *validate(element) {
    const path8 = element["path"];
    const segments = path8.segments;
    const locale = path8.locale;
    if (!_FileNameValidator.LOCALE_PATTERN.test(locale)) {
      yield {
        code: "INVALID_FILE_NAME" /* INVALID_FILE_NAME */,
        message: `Invalid locale format: "${locale}". Expected format: xx-XX (e.g., en-US, uk-UA)`,
        path: path8.path.join("/"),
        start: { line: 0, column: 0, offset: 0 },
        severity: "error"
      };
    }
    for (let i = 0; i < segments.length; i++) {
      const slug = segments[i];
      if (!slug) continue;
      const fullSlug = slug.full;
      const match = _FileNameValidator.FILENAME_PATTERN.exec(fullSlug);
      if (!match) {
        yield {
          code: "INVALID_FILE_NAME" /* INVALID_FILE_NAME */,
          message: `Invalid filename format: "${fullSlug}". Expected format: <number><letters>-<name> (e.g., 1a-intro, 2b-advanced). Letters are mandatory.`,
          path: path8.path.slice(0, i + 1).join("/"),
          start: { line: 0, column: 0, offset: 0 },
          severity: "error"
        };
        continue;
      }
      const [, , letters, name] = match;
      if (!letters || letters.length === 0) {
        yield {
          code: "INVALID_FILE_NAME" /* INVALID_FILE_NAME */,
          message: `Fractional index must include letters: "${fullSlug}". Letters are mandatory (e.g., 1a, 2b, 10aa).`,
          path: path8.path.slice(0, i + 1).join("/"),
          start: { line: 0, column: 0, offset: 0 },
          severity: "error"
        };
      }
      if (name && !/^[a-z0-9-]+$/.test(name)) {
        yield {
          code: "INVALID_FILE_NAME" /* INVALID_FILE_NAME */,
          message: `Slug name contains invalid characters: "${name}". Only lowercase letters, digits, and hyphens are allowed.`,
          path: path8.path.slice(0, i + 1).join("/"),
          start: { line: 0, column: 0, offset: 0 },
          severity: "error"
        };
      }
      if (name && (name.startsWith("-") || name.endsWith("-"))) {
        yield {
          code: "INVALID_FILE_NAME" /* INVALID_FILE_NAME */,
          message: `Slug name cannot start or end with hyphen: "${name}"`,
          path: path8.path.slice(0, i + 1).join("/"),
          start: { line: 0, column: 0, offset: 0 },
          severity: "error"
        };
      }
      if (name && name.includes("--")) {
        yield {
          code: "INVALID_FILE_NAME" /* INVALID_FILE_NAME */,
          message: `Slug name cannot contain consecutive hyphens: "${name}"`,
          path: path8.path.slice(0, i + 1).join("/"),
          start: { line: 0, column: 0, offset: 0 },
          severity: "error"
        };
      }
    }
  }
};

// src/validations/validators/HierarchyValidator.ts
var HierarchyValidator = class extends Validator {
  get name() {
    return "HierarchyValidator";
  }
  *validate(element) {
    const path8 = element["path"];
    if (element instanceof LocaleElement) {
      const children = element["children"];
      for (const child of children) {
        if (!(child instanceof ChapterElement)) {
          const childElement = child;
          yield {
            code: "INVALID_HIERARCHY" /* INVALID_HIERARCHY */,
            message: `Locale can only contain Chapters. Found ${childElement.type} at ${childElement["path"].path.join("/")}`,
            path: path8.path.join("/"),
            start: { line: 0, column: 0, offset: 0 },
            severity: "error"
          };
        }
      }
    } else if (element instanceof ChapterElement) {
    } else if (element instanceof DirectoryElement) {
      const children = element["children"];
      for (const child of children) {
        if (child instanceof ChapterElement) {
          const childElement = child;
          yield {
            code: "INVALID_HIERARCHY" /* INVALID_HIERARCHY */,
            message: `Directory cannot contain Chapters. Found Chapter at ${childElement["path"].path.join("/")}`,
            path: path8.path.join("/"),
            start: { line: 0, column: 0, offset: 0 },
            severity: "error"
          };
        }
      }
    } else if (element instanceof ArticleElement) {
    }
  }
  /**
   * Override validateBatch to check parent-child relationships across elements.
   */
  *validateBatch(elements) {
    const errors = super.validateBatch(elements);
    const elementMap = /* @__PURE__ */ new Map();
    for (const element of elements) {
      const path8 = element["path"];
      elementMap.set(path8.path.join("/"), element);
    }
    for (const element of elements) {
      const path8 = element["path"];
      const parentPath = path8.getParent();
      if (!parentPath) {
        continue;
      }
      const parent = elementMap.get(parentPath.path.join("/"));
      if (!parent) {
        continue;
      }
      if (parent instanceof DirectoryElement && element instanceof ChapterElement) {
        yield {
          code: "INVALID_HIERARCHY" /* INVALID_HIERARCHY */,
          message: `Chapter cannot be placed under Directory. Path: ${path8.path.join("/")}`,
          path: path8.path.join("/"),
          start: { line: 0, column: 0, offset: 0 },
          severity: "error" /* Error */
        };
      }
      if (parent instanceof ArticleElement) {
        yield {
          code: "INVALID_HIERARCHY" /* INVALID_HIERARCHY */,
          message: `Article cannot contain children. Path: ${path8.path.join("/")}`,
          path: parentPath.path.join("/"),
          start: { line: 0, column: 0, offset: 0 },
          severity: "error" /* Error */
        };
      }
      if (parent instanceof LocaleElement && !(element instanceof ChapterElement)) {
        yield {
          code: "INVALID_HIERARCHY" /* INVALID_HIERARCHY */,
          message: `Locale can only contain Chapters. Found ${element.type} at ${path8.path.join("/")}`,
          path: path8.path.join("/"),
          start: { line: 0, column: 0, offset: 0 },
          severity: "error" /* Error */
        };
      }
    }
    return errors;
  }
};

// src/validations/validators/DuplicateIdValidator.ts
var DuplicateIdValidator = class extends Validator {
  get name() {
    return "DuplicateIdValidator";
  }
  /**
   * Single element validation cannot detect duplicates.
   * Returns empty array - use validateBatch instead.
   */
  *validate(_element) {
  }
  /**
   * Validates that all IDs are unique across the batch.
   */
  *validateBatch(elements) {
    const idMap = /* @__PURE__ */ new Map();
    for (const element of elements) {
      const id = element.id.toString();
      const path8 = element["path"].path.join("/");
      if (!idMap.has(id)) {
        idMap.set(id, []);
      }
      idMap.get(id).push(path8);
    }
    for (const [id, paths] of idMap.entries()) {
      if (paths.length > 1) {
        for (const path8 of paths) {
          yield {
            code: "DUPLICATE_ID" /* DUPLICATE_ID */,
            message: `Duplicate ID "${id}" found at multiple paths: ${paths.join(", ")}`,
            path: path8,
            start: { line: 1, column: 1, offset: 0 },
            // ID is in frontmatter at top
            severity: "error"
          };
        }
      }
    }
  }
};

// src/validations/validators/ValidationPipeline.ts
var ValidationPipeline = class {
  validators;
  options;
  constructor(options = {}) {
    this.options = {
      enabledValidators: {
        frontmatter: true,
        fileName: true,
        hierarchy: true,
        duplicateId: true,
        ...options.enabledValidators
      },
      strictMode: options.strictMode ?? false,
      maxErrors: options.maxErrors ?? 0
    };
    this.validators = this.createValidators();
  }
  /**
   * Creates validator instances based on configuration.
   */
  createValidators() {
    const validators = [];
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
  validate(element) {
    const errors = [];
    const warnings = [];
    const infos = [];
    for (const validator of this.validators) {
      const validatorErrors = validator.validate(element);
      errors.push(...validatorErrors);
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
          articles: 0
        },
        generated: {
          locales: 0,
          chapters: 0,
          directories: 0,
          articles: 0
        },
        ignored: {
          locales: 0,
          chapters: 0,
          directories: 0,
          articles: 0
        },
        modified: {
          locales: 0,
          chapters: 0,
          directories: 0,
          articles: 0
        }
      }
    };
  }
  /**
   * Validates multiple elements through all validators.
   * This allows validators to perform cross-element checks.
   */
  validateBatch(elements) {
    const errors = [];
    const warnings = [];
    const infos = [];
    for (const validator of this.validators) {
      const validatorErrors = validator.validateBatch(elements);
      errors.push(...validatorErrors);
      if (this.options.maxErrors > 0 && errors.length >= this.options.maxErrors) {
        break;
      }
    }
    const stats = {
      checked: {
        locales: 0,
        chapters: 0,
        directories: 0,
        articles: 0
      },
      generated: {
        locales: 0,
        chapters: 0,
        directories: 0,
        articles: 0
      },
      ignored: {
        locales: 0,
        chapters: 0,
        directories: 0,
        articles: 0
      },
      modified: {
        locales: 0,
        chapters: 0,
        directories: 0,
        articles: 0
      }
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
      stats
    };
  }
  /**
   * Adds a custom validator to the pipeline.
   */
  addValidator(validator) {
    this.validators.push(validator);
  }
  /**
   * Removes a validator from the pipeline by name.
   */
  removeValidator(name) {
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
  getValidators() {
    return this.validators;
  }
};

// src/services/ChangeDetector.ts
import { execSync as execSync3 } from "child_process";
import * as path6 from "path";
import * as core5 from "@actions/core";
async function detectChanges(repoRoot, beforeSha, afterSha) {
  core5.info(`Detecting changes between ${beforeSha} and ${afterSha}`);
  const changes = [];
  try {
    const diffOutput = execSync3(
      `git diff --name-status --find-renames ${beforeSha} ${afterSha}`,
      { encoding: "utf8", cwd: repoRoot }
    ).trim();
    if (!diffOutput) {
      core5.info("No changes detected");
      return createEmptyChangeSet(beforeSha, afterSha);
    }
    const lines = diffOutput.split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split("	");
      const statusCode = parts[0];
      const filePath = parts[1];
      if (!filePath.endsWith(".md")) continue;
      const fileChange = parseFileChange(statusCode, parts, repoRoot);
      if (fileChange) {
        changes.push(fileChange);
      }
    }
    core5.info(`Detected ${changes.length} changes`);
  } catch (error5) {
    core5.error(`Failed to detect changes: ${error5}`);
    throw error5;
  }
  return buildChangeSet(beforeSha, afterSha, changes);
}
function parseFileChange(statusCode, parts, repoRoot) {
  let changeType;
  let filePath;
  let oldPath;
  if (statusCode === "A") {
    changeType = "added";
    filePath = parts[1];
  } else if (statusCode === "M") {
    changeType = "modified";
    filePath = parts[1];
  } else if (statusCode === "D") {
    changeType = "deleted";
    filePath = parts[1];
  } else if (statusCode.startsWith("R")) {
    changeType = "renamed";
    oldPath = parts[1];
    filePath = parts[2];
  } else {
    return null;
  }
  const absolutePath = path6.join(repoRoot, filePath);
  const contentInfo = parseContentPath(filePath);
  return {
    changeType,
    filePath: absolutePath,
    relativePath: filePath,
    oldPath,
    ...contentInfo
  };
}
function parseContentPath(relativePath) {
  const parts = relativePath.split("/");
  if (parts.length < 2) {
    return {};
  }
  const locale = parts[0];
  if (!/^[a-z]{2}-[A-Z]{2}$/.test(locale)) {
    return {};
  }
  const fileName = parts[parts.length - 1];
  let contentType;
  let slug = [];
  if (fileName === "locale.md") {
    contentType = "locale";
    slug = [];
  } else if (fileName === "index.md") {
    contentType = "chapter";
    slug = parts.slice(1, -1);
  } else if (fileName.endsWith(".md")) {
    contentType = "article";
    const articleName = fileName.replace(/\.md$/, "");
    slug = [...parts.slice(1, -1), articleName];
  }
  return {
    contentType,
    locale,
    slug
  };
}
function buildChangeSet(beforeSha, afterSha, files) {
  const byType = {
    added: files.filter((f) => f.changeType === "added"),
    modified: files.filter((f) => f.changeType === "modified"),
    deleted: files.filter((f) => f.changeType === "deleted"),
    renamed: files.filter((f) => f.changeType === "renamed")
  };
  const byContentType = {
    locale: files.filter((f) => f.contentType === "locale"),
    chapter: files.filter((f) => f.contentType === "chapter"),
    directory: files.filter((f) => f.contentType === "directory"),
    article: files.filter((f) => f.contentType === "article")
  };
  return {
    beforeCommit: beforeSha,
    afterCommit: afterSha,
    timestamp: /* @__PURE__ */ new Date(),
    files,
    byType,
    byContentType
  };
}
function createEmptyChangeSet(beforeSha, afterSha) {
  return {
    beforeCommit: beforeSha,
    afterCommit: afterSha,
    timestamp: /* @__PURE__ */ new Date(),
    files: [],
    byType: {
      added: [],
      modified: [],
      deleted: [],
      renamed: []
    },
    byContentType: {
      locale: [],
      chapter: [],
      directory: [],
      article: []
    }
  };
}
async function getAllMarkdownFiles(repoRoot) {
  core5.info("No before SHA - treating all files as added");
  try {
    const output = execSync3(
      'git ls-files "*.md"',
      { encoding: "utf8", cwd: repoRoot }
    ).trim();
    if (!output) {
      return [];
    }
    const files = output.split("\n").map((relativePath) => {
      const absolutePath = path6.join(repoRoot, relativePath);
      const contentInfo = parseContentPath(relativePath);
      return {
        changeType: "added",
        filePath: absolutePath,
        relativePath,
        ...contentInfo
      };
    });
    return files;
  } catch (error5) {
    core5.error(`Failed to list all files: ${error5}`);
    return [];
  }
}

// src/services/IncrementalMetadataUpdaterService.ts
import * as path7 from "path";
import * as core6 from "@actions/core";
var UpdateStatistics = class {
  constructor(localesUpdated = 0, foldersUpdated = 0, filesProcessed = 0) {
    this.localesUpdated = localesUpdated;
    this.foldersUpdated = foldersUpdated;
    this.filesProcessed = filesProcessed;
  }
  incrementLocales() {
    this.localesUpdated++;
  }
  incrementFolders() {
    this.foldersUpdated++;
  }
  incrementFiles() {
    this.filesProcessed++;
  }
  toObject() {
    return {
      localesUpdated: this.localesUpdated,
      foldersUpdated: this.foldersUpdated,
      filesProcessed: this.filesProcessed
    };
  }
};
var LocaleChangeGrouper = class {
  groupByLocale(changes) {
    const grouped = /* @__PURE__ */ new Map();
    for (const change of changes.files) {
      if (!change.locale) continue;
      if (!grouped.has(change.locale)) {
        grouped.set(change.locale, []);
      }
      grouped.get(change.locale).push(change);
    }
    return grouped;
  }
};
var IncrementalMetadataUpdaterService = class _IncrementalMetadataUpdaterService {
  constructor(jsonWriter, articleBuilder, chapterBuilder, directoryBuilder, localeBuilder, sorter, grouper) {
    this.jsonWriter = jsonWriter;
    this.articleBuilder = articleBuilder;
    this.chapterBuilder = chapterBuilder;
    this.directoryBuilder = directoryBuilder;
    this.localeBuilder = localeBuilder;
    this.sorter = sorter;
    this.grouper = grouper;
  }
  /**
   * Factory method for creating with default dependencies
   */
  static createDefault() {
    return new _IncrementalMetadataUpdaterService(
      new JsonFileWriter(),
      new ArticleMetadataBuilder(),
      new ChapterMetadataBuilder(),
      new DirectoryMetadataBuilder(),
      new LocaleMetadataBuilder(),
      new FractionalIndexSorter(),
      new LocaleChangeGrouper()
    );
  }
  /**
   * Update metadata incrementally based on detected changes
   */
  async updateMetadataIncrementally(changes, repoRoot) {
    core6.info(`Incrementally updating metadata for ${changes.files.length} changes`);
    const updatedFiles = /* @__PURE__ */ new Set();
    const stats = new UpdateStatistics();
    const changesByLocale = this.grouper.groupByLocale(changes);
    await Promise.all(
      Array.from(changesByLocale.entries()).map(async ([locale, localeChanges]) => {
        core6.info(`Processing ${localeChanges.length} changes for locale ${locale}`);
        await this.processLocaleChanges(localeChanges, repoRoot, updatedFiles, stats);
        stats.incrementLocales();
      })
    );
    return {
      updatedFiles: Array.from(updatedFiles),
      fullRegeneration: false,
      stats: stats.toObject()
    };
  }
  /**
   * Process all changes for a specific locale
   */
  async processLocaleChanges(changes, repoRoot, updatedFiles, stats) {
    await Promise.all(
      changes.map((change) => this.processFileChange(change, repoRoot, updatedFiles, stats))
    );
  }
  /**
   * Process a single file change
   */
  async processFileChange(change, repoRoot, updatedFiles, stats) {
    if (!change.locale) return;
    const filename = path7.basename(change.file);
    const fileType = filename === "locale.md" ? "locale" : filename === "index.md" ? "index" : "article";
    switch (fileType) {
      case "locale":
        await this.updateLocaleMetadata(change, repoRoot, updatedFiles);
        break;
      case "index":
        await this.updateFolderMetadata(change, repoRoot, updatedFiles, stats);
        break;
      case "article":
        await this.updateArticleMetadata(change, repoRoot, updatedFiles, stats);
        break;
    }
    stats.incrementFiles();
  }
  /**
   * Update locale.md metadata
   */
  async updateLocaleMetadata(change, repoRoot, updatedFiles) {
    if (!change.locale) return;
    core6.info(`Updating locale metadata: ${change.locale}`);
    const localesJsonPath = path7.join(repoRoot, "locales.json");
    const localesJson = await this.jsonWriter.read(localesJsonPath);
    if (!localesJson) {
      core6.warning(`locales.json not found, skipping update`);
      return;
    }
    if (change.status === "removed") {
      const filtered = localesJson.filter((l) => l.locale !== change.locale);
      await this.jsonWriter.write(localesJsonPath, filtered);
    } else {
      const localePath = path7.join(repoRoot, change.file);
      const [localeFile, gitMetadata] = await Promise.all([
        loadLocalFile(localePath),
        getGitFileMetadata(localePath, repoRoot)
      ]);
      if (!localeFile) {
        core6.warning(`Could not load locale file: ${localePath}`);
        return;
      }
      const frontmatter = localeFile.frontmatter;
      const localeMetadata = this.localeBuilder.build(frontmatter, gitMetadata, change.locale, []);
      const index = localesJson.findIndex((l) => l.locale === change.locale);
      if (index >= 0) {
        localesJson[index] = localeMetadata;
      } else {
        localesJson.push(localeMetadata);
      }
      await this.jsonWriter.write(localesJsonPath, localesJson);
    }
    updatedFiles.add(localesJsonPath);
  }
  /**
   * Update folder index.md metadata
   */
  async updateFolderMetadata(change, repoRoot, updatedFiles, stats) {
    if (!change.locale) return;
    const folderPath = path7.dirname(path7.join(repoRoot, change.file));
    core6.info(`Updating folder metadata: ${folderPath}`);
    const fullPath = path7.join(folderPath, "index.full.json");
    const shallowPath = path7.join(folderPath, "index.shallow.json");
    const ancestorsPath = path7.join(folderPath, "ancestors.json");
    if (change.status === "removed") {
      core6.warning(`Folder removal handling not yet implemented`);
      return;
    }
    const indexPath = path7.join(folderPath, "index.md");
    const [fullMetadata, shallowMetadata, indexFile, gitMetadata] = await Promise.all([
      this.jsonWriter.read(fullPath),
      this.jsonWriter.read(shallowPath),
      loadLocalFile(indexPath),
      getGitFileMetadata(indexPath, repoRoot)
    ]);
    if (!fullMetadata || !shallowMetadata) {
      core6.warning(`Metadata files not found for ${folderPath}, skipping`);
      return;
    }
    if (!indexFile) {
      core6.warning(`Could not load index file: ${indexPath}`);
      return;
    }
    const frontmatter = indexFile.frontmatter;
    const updatedMetadata = frontmatter.type === "chapter" ? this.chapterBuilder.build(frontmatter, gitMetadata, change.locale, shallowMetadata.slug) : this.directoryBuilder.build(frontmatter, gitMetadata, change.locale, shallowMetadata.slug);
    await this.jsonWriter.write(shallowPath, updatedMetadata);
    updatedFiles.add(shallowPath);
    const updatedFull = {
      ...updatedMetadata,
      children: fullMetadata.children
    };
    await this.jsonWriter.write(fullPath, updatedFull);
    updatedFiles.add(fullPath);
    stats.incrementFolders();
  }
  /**
   * Update article metadata
   */
  async updateArticleMetadata(change, repoRoot, updatedFiles, stats) {
    if (!change.locale) return;
    const folderPath = path7.dirname(path7.join(repoRoot, change.file));
    const articleName = path7.basename(change.file, ".md");
    core6.info(`Updating article metadata: ${change.file}`);
    const fullPath = path7.join(folderPath, "index.full.json");
    const shallowPath = path7.join(folderPath, "index.shallow.json");
    const [fullMetadata, shallowMetadata] = await Promise.all([
      this.jsonWriter.read(fullPath),
      this.jsonWriter.read(shallowPath)
    ]);
    if (!fullMetadata || !shallowMetadata) {
      core6.warning(`Metadata files not found for ${folderPath}, skipping`);
      return;
    }
    if (change.status === "removed") {
      fullMetadata.children = fullMetadata.children.filter(
        (child) => child.slug[child.slug.length - 1] !== articleName
      );
      shallowMetadata.children = shallowMetadata.children.filter(
        (child) => child.slug[child.slug.length - 1] !== articleName
      );
    } else {
      const articlePath = path7.join(repoRoot, change.file);
      const [articleFile, gitMetadata] = await Promise.all([
        loadLocalFile(articlePath),
        getGitFileMetadata(articlePath, repoRoot)
      ]);
      if (!articleFile) {
        core6.warning(`Could not load article file: ${articlePath}`);
        return;
      }
      const frontmatter = articleFile.frontmatter;
      const articleSlug = [...shallowMetadata.slug, articleName];
      const articleMetadata = this.articleBuilder.build(frontmatter, gitMetadata, change.locale, articleSlug);
      const fullIndex = fullMetadata.children.findIndex(
        (child) => child.slug[child.slug.length - 1] === articleName
      );
      const shallowIndex = shallowMetadata.children.findIndex(
        (child) => child.slug[child.slug.length - 1] === articleName
      );
      if (fullIndex >= 0) {
        fullMetadata.children[fullIndex] = articleMetadata;
      } else {
        fullMetadata.children.push(articleMetadata);
      }
      if (shallowIndex >= 0) {
        shallowMetadata.children[shallowIndex] = articleMetadata;
      } else {
        shallowMetadata.children.push(articleMetadata);
      }
      fullMetadata.children = this.sorter.sort(fullMetadata.children);
      shallowMetadata.children = this.sorter.sort(shallowMetadata.children);
    }
    await Promise.all([
      this.jsonWriter.write(fullPath, fullMetadata),
      this.jsonWriter.write(shallowPath, shallowMetadata)
    ]);
    updatedFiles.add(fullPath);
    updatedFiles.add(shallowPath);
    stats.incrementFolders();
  }
};
async function updateMetadataIncrementally(changes, repoRoot) {
  const service = IncrementalMetadataUpdaterService.createDefault();
  return service.updateMetadataIncrementally(changes, repoRoot);
}

// src/index.ts
async function run() {
  try {
    const context2 = github.context;
    const autoCommit = core7.getInput("auto-commit") === "true";
    core7.info(`Event: ${context2.eventName || "undefined"}`);
    core7.info(`Action: ${context2.payload.action || "N/A"}`);
    core7.info(`Auto-commit: ${autoCommit}`);
    const commitMessage = context2.payload.head_commit?.message || context2.payload.commits?.[0]?.message || "";
    if (isAutoCommit(process.cwd())) {
      core7.info(`Skipping: commit is from this action`);
      return;
    }
    if (commitMessage.match(/\[(skip ci|skip validation|no-validate)\]/i)) {
      core7.info(`Skipping validation: commit message contains skip flag`);
      return;
    }
    let owner;
    let repo;
    if (process.env.GITHUB_REPOSITORY) {
      [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
    } else if (context2.repo?.owner && context2.repo?.repo) {
      owner = context2.repo.owner;
      repo = context2.repo.repo;
    } else {
      const { execSync: execSync4 } = await import("child_process");
      try {
        const remote = execSync4("git remote get-url origin", { encoding: "utf8" }).trim();
        const match = remote.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
        if (match) {
          owner = match[1];
          repo = match[2];
        } else {
          throw new Error("Could not parse repository from git remote");
        }
      } catch (error5) {
        throw new Error("GITHUB_REPOSITORY environment variable is required or must be run in a git repository");
      }
    }
    core7.info(`Repository: ${owner}/${repo}`);
    const hasLocalCheckout = fs4.existsSync(".git");
    if (!hasLocalCheckout) {
      core7.warning("No local checkout detected! Please add checkout step before this action.");
      core7.warning("Example: uses: actions/checkout@v4 with fetch-depth: 0");
      throw new Error("Local checkout is required for this action to work");
    }
    const repoRoot = process.cwd();
    core7.info("\u{1F50D} Step 1: Detecting changes...");
    let changes;
    let beforeSha = "";
    let afterSha = "";
    if (context2.eventName === "push") {
      beforeSha = context2.payload.before || "";
      afterSha = context2.payload.after || context2.sha;
      if (beforeSha === "0000000000000000000000000000000000000000") {
        core7.info("New branch detected (before SHA is all zeros)");
        beforeSha = "";
      }
      core7.info(`Push event: ${beforeSha ? beforeSha.substring(0, 7) + "..." : "initial"}${afterSha.substring(0, 7)}`);
    } else if (context2.eventName === "pull_request") {
      const action = context2.payload.action;
      core7.info(`Pull request ${action}`);
      const pr = context2.payload.pull_request;
      if (!pr) {
        core7.warning("No pull request data in payload");
        return;
      }
      switch (action) {
        case "opened":
        case "reopened":
        case "synchronize":
          beforeSha = pr.base.sha;
          afterSha = pr.head.sha;
          core7.info(`Comparing base ${beforeSha.substring(0, 7)} with head ${afterSha.substring(0, 7)}`);
          break;
        case "closed":
          if (pr.merged) {
            core7.info("PR was merged - processing merge changes");
            beforeSha = pr.base.sha;
            afterSha = pr.merge_commit_sha || pr.head.sha;
          } else {
            core7.info("PR was closed without merging - skipping");
            return;
          }
          break;
        default:
          core7.info(`PR action '${action}' does not require processing - skipping`);
          return;
      }
    } else {
      core7.warning(`Unsupported event type: ${context2.eventName}`);
      return;
    }
    if (beforeSha && afterSha) {
      core7.info(`Detecting changes: ${beforeSha.substring(0, 7)}...${afterSha.substring(0, 7)}`);
      changes = await detectChanges(repoRoot, beforeSha, afterSha);
    } else {
      core7.info("No before SHA - treating all files as new");
      const allFiles = await getAllMarkdownFiles(repoRoot);
      changes = {
        beforeCommit: "",
        afterCommit: afterSha,
        timestamp: /* @__PURE__ */ new Date(),
        files: allFiles,
        byType: {
          added: allFiles,
          modified: [],
          deleted: [],
          renamed: []
        },
        byContentType: {
          locale: allFiles.filter((f) => f.contentType === "locale"),
          chapter: allFiles.filter((f) => f.contentType === "chapter"),
          directory: allFiles.filter((f) => f.contentType === "directory"),
          article: allFiles.filter((f) => f.contentType === "article")
        }
      };
    }
    core7.info(`Changes detected: ${changes.files.length} files`);
    core7.info(`  Added: ${changes.byType.added.length}`);
    core7.info(`  Modified: ${changes.byType.modified.length}`);
    core7.info(`  Deleted: ${changes.byType.deleted.length}`);
    core7.info(`  Renamed: ${changes.byType.renamed.length}`);
    if (changes.files.length === 0) {
      core7.info("No changes detected, skipping processing");
      return;
    }
    core7.info("\u2705 Step 2: Validating changes...");
    const pipeline = new ValidationPipeline({
      enabledValidators: {
        frontmatter: true,
        fileName: true,
        hierarchy: true,
        duplicateId: true
      },
      strictMode: false
    });
    let totalErrors = 0;
    let totalWarnings = 0;
    core7.info(`Validated ${changes.files.length} files`);
    if (totalErrors > 0) {
      core7.setFailed(`Validation failed with ${totalErrors} errors`);
      return;
    }
    core7.info("\u{1F4DD} Step 3: Updating metadata incrementally...");
    let allUpdatedFiles;
    let useIncrementalUpdate = beforeSha !== "";
    if (useIncrementalUpdate) {
      core7.info("Using incremental update mode");
      const updateResult = await updateMetadataIncrementally(changes, repoRoot);
      allUpdatedFiles = updateResult.updatedFiles;
      core7.info(`Updated ${updateResult.stats.filesProcessed} files, ${updateResult.stats.foldersUpdated} folders`);
    } else {
      core7.info("Using full regeneration mode (no before SHA)");
      const scannedRepo = await scanRepository(repoRoot);
      const generated = await generateMetadataFiles(scannedRepo, repoRoot);
      allUpdatedFiles = [generated.localesJson];
      for (const [, paths] of generated.localeIndices) {
        allUpdatedFiles.push(paths.full, paths.shallow);
      }
      for (const [, paths] of generated.folderIndices) {
        allUpdatedFiles.push(paths.full, paths.shallow, paths.ancestors);
      }
    }
    core7.info(`Total updated files: ${allUpdatedFiles.length}`);
    if (autoCommit) {
      core7.info("\u{1F4BE} Step 4: Committing generated files...");
      await commitGeneratedFiles(allUpdatedFiles, repoRoot);
      core7.info("\u2728 Changes committed and pushed successfully");
    } else {
      core7.info("\u23ED\uFE0F  Step 4: Skipping commit (auto-commit is disabled)");
      core7.info("Updated files:");
      allUpdatedFiles.forEach((file) => core7.info(`  - ${file}`));
    }
    core7.setOutput("total-changes", changes.files.length);
    core7.setOutput("total-files", allUpdatedFiles.length);
    core7.setOutput("validation-errors", totalErrors);
    core7.setOutput("validation-warnings", totalWarnings);
    core7.setOutput("conclusion", "success");
    core7.setOutput("changes", JSON.stringify(changes));
    core7.info("\u2705 Action completed successfully");
  } catch (error5) {
    if (error5 instanceof Error) {
      core7.setFailed(`Action failed: ${error5.message}`);
    } else {
      core7.setFailed("Action failed with unknown error");
    }
  }
}
if (import.meta.url === `file://${process.argv[1]}` || !import.meta.url) {
  run();
}
export {
  run
};
//# sourceMappingURL=index.js.map