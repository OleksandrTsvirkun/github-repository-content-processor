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
