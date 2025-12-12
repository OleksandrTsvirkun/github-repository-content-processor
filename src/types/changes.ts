export type FileChangeType = 'added' | 'modified' | 'deleted' | 'renamed';

/**
 * Represents a single file change detected by git
 */
export interface FileChange {
  /** Type of change */
  changeType: FileChangeType;
  
  /** Absolute path to the file */
  filePath: string;
  
  /** Relative path from repo root */
  relativePath: string;
  
  /** Previous path (for renamed files) */
  oldPath?: string;
  
  /** Git SHA before change (for modified/deleted) */
  beforeSha?: string;
  
  /** Git SHA after change (for added/modified) */
  afterSha?: string;
  
  /** File type (locale, chapter, directory, article) */
  contentType?: 'locale' | 'chapter' | 'directory' | 'article';
  
  /** Parsed locale code */
  locale?: string;
  
  /** Parsed slug path */
  slug?: string[];
}

/**
 * Collection of all detected changes
 */
export interface ChangeSet {
  /** Commit SHA before changes */
  beforeCommit: string;
  
  /** Commit SHA after changes */
  afterCommit: string;
  
  /** Timestamp when changes were detected */
  timestamp: Date;
  
  /** All detected file changes */
  files: FileChange[];
  
  /** Changes grouped by type for quick access */
  byType: {
    added: FileChange[];
    modified: FileChange[];
    deleted: FileChange[];
    renamed: FileChange[];
  };
  
  /** Changes grouped by content type */
  byContentType: {
    locale: FileChange[];
    chapter: FileChange[];
    directory: FileChange[];
    article: FileChange[];
  };
}

// Legacy types - keeping for compatibility
export interface ChangeTypeMap {
  added: AddedChangeEntry;
  modified: ModifiedChangeEntry;
  renamed: RenamedChangeEntry;
  deleted: DeletedChangeEntry;
}

export type ChangeType = keyof ChangeTypeMap;

export interface BaseChangeEntry {
  type: "article" | "chapter" | "directory";
  locale: string;
  id: string;
}

export interface AddedChangeEntry extends BaseChangeEntry {
  slug: string[];
}

export interface ModifiedChangeEntry extends BaseChangeEntry {
  slug: string[];
}

export interface RenamedChangeEntry extends BaseChangeEntry {
  slug: {
    old: string;
    new: string;
  }[];
}

export interface DeletedChangeEntry extends BaseChangeEntry {
  slug: string[];
}

export interface ChangeManifest {
  timestamp: string;
  changes: {
    [K in ChangeType]: ChangeTypeMap[K][];
  };
}
