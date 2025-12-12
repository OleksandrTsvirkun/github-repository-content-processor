import Slug from "./Slug";

/**
 * ContentPath - represents a path to content in the repository
 * Format: <locale>/<slug>/<slug>/...
 * Example: en-US/1a-web-dev/2b-html/3a-intro
 *
 * Locale format: xx-XX (e.g., en-US, uk-UA)
 */
export default class ContentPath {
  private constructor(
    public readonly locale: string,
    public readonly segments: Slug[]
  ) {
    if (!ContentPath.isValidLocale(locale)) {
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
  static parse(path: string): ContentPath {
    const parts = path.split("/").filter(Boolean);

    if (parts.length === 0) {
      throw new Error("Content path cannot be empty");
    }

    // First part is locale
    const locale = parts[0];
    if (!locale || !ContentPath.isValidLocale(locale)) {
      throw new Error(`Invalid locale format: "${locale}". Expected format: xx-XX`);
    }

    // Rest are slugs
    const segments = parts.slice(1).map((part) => Slug.parse(part));

    return new ContentPath(locale, segments);
  }

  /**
   * Create a ContentPath from locale only (root path)
   * @param locale - locale string like "en-US"
   * @returns ContentPath instance
   */
  static fromLocale(locale: string): ContentPath {
    return new ContentPath(locale, []);
  }

  /**
   * Check if a string is a valid locale format
   * @param locale - string to validate
   * @returns true if valid
   */
  static isValidLocale(locale: string): boolean {
    return /^[a-z]{2}-[A-Z]{2}$/.test(locale);
  }

  /**
   * Get full path as array of strings
   * @returns array like ["en-US", "1a-web-dev", "2b-html"]
   */
  get path(): string[] {
    return [this.locale, ...this.segments.map((s) => s.full)];
  }

  /**
   * String representation
   * @returns path string like "en-US/1a-web-dev/2b-html"
   */
  toString(): string {
    return this.path.join("/");
  }

  /**
   * Get parent path
   * @returns parent ContentPath or null if at root
   */
  getParent(): ContentPath | null {
    if (this.segments.length === 0) return null;
    return new ContentPath(this.locale, this.segments.slice(0, -1));
  }

  /**
   * Append a slug to the path
   * @param slug - Slug to append
   * @returns new ContentPath with appended slug
   */
  append(slug: Slug): ContentPath {
    return new ContentPath(this.locale, [...this.segments, slug]);
  }

  /**
   * Get depth of the path (0 = locale root, 1 = first level, etc.)
   * @returns depth as number
   */
  get depth(): number {
    return this.segments.length;
  }

  /**
   * Check if this is a root path (locale only)
   * @returns true if root
   */
  get isRoot(): boolean {
    return this.segments.length === 0;
  }

  static equals(left: ContentPath, right: ContentPath): boolean {
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
  equals(other: ContentPath): boolean {
    return ContentPath.equals(this, other);
  }
}
