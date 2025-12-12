# Repository Content Structure Requirements

## Overview

This document defines the complete structure and requirements for content repositories managed by the Amentor GitHub Content Manager Action.

## File Naming Convention: Fractional Index

All files and folders (except special files) use **fractional index** naming:

### What is Fractional Index?
- A positioning system that allows inserting elements between existing ones without renumbering
- Format: `<number><optional-letter>[-name]`
- Examples: `1`, `1a`, `1b`, `2`, `2a`, `10`, `10a`
- Common pattern: `1-intro`, `1a-basics`, `2b-advanced`, `10-conclusion`

### Naming Rules
- **Folders (Chapter/Directory)**: `<fractional-index>/` (e.g., `1-csharp/`, `1a-basics/`, `2b-advanced/`)
- **Articles**: `<fractional-index>.md` (e.g., `1-intro.md`, `2a-variables.md`, `3b-functions.md`)
- **Special files**: `locale.md`, `index.md` (these DO NOT use fractional index)
- **Generated files**: `locales.json`, `index.full.json`, `index.shallow.json`, `ancestors.json`

## Repository Structure

### Level 1: Root
```
repository/
├── locales.json          # List of all locales (REQUIRED)
├── uk-UA/               # Locale folder
├── en-US/               # Locale folder
└── ...
```

**locales.json** format:
```json
[
  {
    "id": "01K1EJAZ9CB3WQ3KZFEBGJT3XR",
    "type": "locale",
    "title": "Українська",
    "description": "Опис локалі",
    "cover_url": null,
    "aliases": ["uk", "ua"],
    "slug": [],
    "locale": "uk-UA",
    "created_at": "2025-08-14T17:15:48.8048105+03:00",
    "updated_at": "2025-08-14T17:15:48.8048127+03:00",
    "sha": "d4d90fb0fa2a3e8412a401e103f116377d7bcf55",
    "size": 157
  }
]
```

### Level 2: Locale (uk-UA/, en-US/)

Each locale folder **MUST** contain:

```
uk-UA/
├── locale.md             # Locale description (REQUIRED)
├── index.full.json       # Full hierarchical index of chapters (REQUIRED)
├── index.shallow.json    # Shallow index of chapters (REQUIRED)
├── 1-chapter/           # Chapter folder
├── 2-chapter/           # Chapter folder
└── ...
```

#### locale.md
```yaml
---
id: 01K1EJAZ9CB3WQ3KZFEBGJT3XR
title: Українська
type: locale
description: Опис локалі
aliases:
  - uk
  - ua
cover_url: null
---
```
- Folder name (e.g., `uk-UA`) becomes the slug
- Format: `xx-XX` (e.g., `en-US`, `uk-UA`)

#### index.full.json
Array of `ChapterFullMetadata[]` with full hierarchy:
```json
[
  {
    "id": "01K18NDENK2VKZPQAS50KTESA0",
    "type": "chapter",
    "title": "С#",
    "description": "Розділ про С#",
    "cover_url": null,
    "locale": "uk-UA",
    "slug": ["1-csharp"],
    "created_at": "2025-08-14T17:15:48.8048105+03:00",
    "updated_at": "2025-08-14T17:15:48.8048127+03:00",
    "sha": "9679c784978dd8be0d831afef90662b40d87492b",
    "size": 113,
    "children": [
      // Full hierarchy: Directory (with full children), Article, nested Chapter (metadata only, no children)
    ]
  }
]
```

#### index.shallow.json
Array of `ChapterMetadata[]` (first level only, no children):
```json
[
  {
    "id": "01K18NDENK2VKZPQAS50KTESA0",
    "type": "chapter",
    "title": "С#",
    "description": "Розділ про С#",
    "cover_url": null,
    "locale": "uk-UA",
    "slug": ["1-csharp"],
    "created_at": "2025-08-14T17:15:48.8048105+03:00",
    "updated_at": "2025-08-14T17:15:48.8048127+03:00",
    "sha": "9679c784978dd8be0d831afef90662b40d87492b",
    "size": 113
  }
]
```

### Level 3+: Folders (Chapter/Directory)

Each folder **MUST** contain:

```
1-csharp/
├── index.md              # Folder description (REQUIRED, or folder is ignored)
├── index.full.json       # Full hierarchical index (GENERATED)
├── index.shallow.json    # Shallow index of direct children (GENERATED)
├── ancestors.json        # Parent metadata chain (GENERATED)
├── 1-intro.md           # Article
├── 2-basics/            # Subfolder (Chapter or Directory)
└── ...
```

#### index.md
```yaml
---
id: 01K18NDENK2VKZPQAS50KTESA0
title: С#
type: chapter  # or "directory"
description: Розділ про С#
cover_url: null
---
```
- **CRITICAL**: If `index.md` is missing, the folder is **IGNORED**
- `type` must be either `"chapter"` or `"directory"`

#### index.full.json
- For **Chapter**: Contains full hierarchy
  - Nested **Directory**: Full children hierarchy
  - Nested **Article**: Full metadata
  - Nested **Chapter**: Metadata ONLY (no children - use their own index.full.json)
- For **Directory**: Contains full hierarchy
  - Nested **Directory**: Full children hierarchy
  - Nested **Article**: Full metadata
  - **CANNOT** contain Chapter (validation error)

Example for Chapter:
```json
{
  "id": "01K18NDENK2VKZPQAS50KTESA0",
  "type": "chapter",
  "title": "С#",
  "locale": "uk-UA",
  "slug": ["1-csharp"],
  "created_at": "2025-08-14T17:15:48.8048105+03:00",
  "updated_at": "2025-08-14T17:15:48.8048893+03:00",
  "sha": "9679c784978dd8be0d831afef90662b40d87492b",
  "size": 113,
  "children": [
    {
      "id": "...",
      "type": "directory",
      "title": "Основи",
      "slug": ["1-csharp", "1-basics"],
      "children": [
        // Full hierarchy of articles and directories
      ]
    },
    {
      "id": "...",
      "type": "chapter",
      "title": "Просунутий рівень",
      "slug": ["1-csharp", "2-advanced"]
      // NO children - nested chapter's children are in its own index.full.json
    },
    {
      "id": "...",
      "type": "article",
      "title": "Вступ",
      "slug": ["1-csharp", "1-intro"]
    }
  ]
}
```

#### index.shallow.json
Array of direct children metadata (no nested children):
- Articles (`.md` files in this folder)
- Folders with `index.md` (metadata from their `index.md`)

Example:
```json
[
  {
    "id": "01K1EJERW10E4D1RPBXDA5SMZG",
    "type": "article",
    "title": "Вступ",
    "locale": "uk-UA",
    "slug": ["1-csharp", "1-basics", "1-intro"],
    "created_at": "2025-08-14T17:15:40.9219229+03:00",
    "updated_at": "2025-08-14T17:15:40.9219255+03:00",
    "sha": "eacda26535ed29156e69c27f8f6773fd9e1adbeb",
    "size": 137
  },
  {
    "id": "01K18NB3EHNAJ3WNQZMPWDX7Y4",
    "type": "directory",
    "title": "Типи даних",
    "locale": "uk-UA",
    "slug": ["1-csharp", "1-basics", "1-types"],
    "created_at": "2025-08-14T17:15:40.9170654+03:00",
    "updated_at": "2025-08-14T17:15:40.9220997+03:00",
    "sha": "c269d9e90a2a756bc21d5702925788363e55bf96",
    "size": 155
  }
]
```

#### ancestors.json
Array of parent metadata from locale to immediate parent:

For `uk-UA/1-csharp/1-basics/1-types/`:
```json
[
  {
    "id": "...",
    "type": "locale",
    "title": "Українська",
    "locale": "uk-UA",
    "slug": []
  },
  {
    "id": "...",
    "type": "chapter",
    "title": "С#",
    "locale": "uk-UA",
    "slug": ["1-csharp"]
  },
  {
    "id": "...",
    "type": "directory",
    "title": "Основи",
    "locale": "uk-UA",
    "slug": ["1-csharp", "1-basics"]
  }
]
```
- Does **NOT** include the folder itself (only parents)
- Created for each **folder** (Chapter/Directory)
- **NOT** created for Article files

### Articles

Files: `<fractional-index>.md`

Example: `1-intro.md`
```yaml
---
id: 01K1EJERW10E4D1RPBXDA5SMZG
title: Вступ до С#
type: article
description: Вступна стаття
cover_url: null
---

Article content here...
```

- **CANNOT** be named `index.md` (reserved)
- **CANNOT** be named `locale.md` (reserved)

## Hierarchy Rules

```
Locale
  └── Chapter
        ├── Chapter (nested)
        ├── Directory
        └── Article

Directory
  ├── Directory (nested)
  └── Article
  ❌ Chapter (VALIDATION ERROR)
```

### Rules Summary:
- **Locale** → contains **Chapter** only
- **Chapter** → can contain **Chapter**, **Directory**, **Article**
- **Directory** → can contain **Directory**, **Article** (❌ **CANNOT** contain **Chapter**)
- **Article** → leaf element, no children

## Slug Formation

Slug is formed from parent folder names + file name (without extension):

Examples:
- `uk-UA/` → `slug: []`
- `uk-UA/1-csharp/` → `slug: ["1-csharp"]`
- `uk-UA/1-csharp/1-basics/` → `slug: ["1-csharp", "1-basics"]`
- `uk-UA/1-csharp/1-basics/1-intro.md` → `slug: ["1-csharp", "1-basics", "1-intro"]`

## Metadata Fields

### BaseMetadata (inherited by all metadata types)
```typescript
{
  locale: string;           // e.g., "uk-UA"
  slug: string[];          // Path segments
  created_at: string;      // ISO 8601 timestamp from Git
  updated_at: string;      // ISO 8601 timestamp from Git
  sha: string;             // Git SHA hash for change detection
  size: number;            // File size in bytes
  validationResult?: FileValidationResult;
}
```

### Frontmatter Fields
```typescript
{
  id: string;              // ULID
  title: string;
  type: "locale" | "chapter" | "directory" | "article";
  description?: string;
  cover_url?: string;
  aliases?: string[];      // Only for locale
}
```

### Full Metadata
BaseMetadata + Frontmatter + `children: Array<...>`

### Shallow Metadata
BaseMetadata + Frontmatter + `children: Array<...>` (first level only)

### Parent Metadata (for ancestors.json)
BaseMetadata + Frontmatter (no children)

## Git Metadata Sources

- `created_at`: First commit timestamp of the file
- `updated_at`: Last commit timestamp of the file
- `sha`: Current Git blob SHA
- `size`: File size in bytes

Retrieved from:
- GitHub webhook event payload
- Git commands (local)
- GitHub API (fallback)

## Validation Rules

1. **File existence**: `locale.md` must exist in locale folders
2. **File existence**: `index.md` must exist in Chapter/Directory folders (or folder ignored)
3. **Fractional index**: All folders and articles must use valid fractional index naming
4. **Hierarchy**: Directory cannot contain Chapter
5. **Naming**: Articles cannot be named `index.md` or `locale.md`
6. **Frontmatter**: All required fields must be present (id, title, type)
7. **Type consistency**: `type` in frontmatter must match folder purpose
8. **Locale format**: Must be `xx-XX` format (e.g., `en-US`, `uk-UA`)

## Auto-Commit

When `auto-commit: true` is enabled:

1. **Validate** all content using ValidationPipeline
2. **Generate** all JSON files if validation succeeds:
   - `locales.json`
   - `index.full.json` and `index.shallow.json` for each locale and folder
   - `ancestors.json` for each folder
3. **Commit** all changes in a single commit
4. **Commit message format**: `[auto:Amentor GitHub Content Manager Action] Generated metadata`
5. **Skip trigger**: Workflow should ignore commits with `[auto:Amentor GitHub Content Manager Action]` prefix

### Configuration
```yaml
# action.yml
inputs:
  token:
    description: 'GitHub token'
    required: true
    default: ${{ github.token }}
  auto-commit:
    description: 'Automatically commit generated files'
    required: false
    default: 'false'
```

## Example Complete Structure

```
repository/
├── locales.json
├── uk-UA/
│   ├── locale.md
│   ├── index.full.json
│   ├── index.shallow.json
│   └── 1-csharp/
│       ├── index.md (type: chapter)
│       ├── index.full.json
│       ├── index.shallow.json
│       ├── ancestors.json
│       ├── 1-intro.md
│       ├── 1-basics/
│       │   ├── index.md (type: directory)
│       │   ├── index.full.json
│       │   ├── index.shallow.json
│       │   ├── ancestors.json
│       │   ├── 1-variables.md
│       │   └── 1-types/
│       │       ├── index.md (type: directory)
│       │       ├── index.full.json
│       │       ├── index.shallow.json
│       │       ├── ancestors.json
│       │       └── 1-int.md
│       └── 2-advanced/
│           ├── index.md (type: chapter)
│           ├── index.full.json
│           ├── index.shallow.json
│           └── ancestors.json
└── en-US/
    ├── locale.md
    ├── index.full.json
    ├── index.shallow.json
    └── ...
```

## TypeScript Type Definitions

See `src/types/metadata.ts` and `src/types/frontmatter.ts` for complete type definitions.

Key types:
- `LocaleMetadata`, `ChapterMetadata`, `DirectoryMetadata`, `ArticleMetadata`
- `LocaleFullMetadata`, `ChapterFullMetadata`, `DirectoryFullMetadata`
- `LocaleShallowMetadata`, `ChapterShallowMetadata`, `DirectoryShallowMetadata`
- `Parents` (for ancestors.json)
- `LocaleFrontMatter`, `ChapterFrontMatter`, `DirectoryFrontMatter`, `ArticleFrontMatter`

## Notes

- Field naming: Use `snake_case` for `created_at`/`updated_at` (convenient for YAML)
- All timestamps: ISO 8601 format with timezone
- All IDs: ULID format
- All paths: Use forward slashes `/` (normalized on all platforms)
