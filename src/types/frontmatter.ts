export interface BaseFrontMatter {
  id: string;
  title: string;
  description?: string | undefined;
  cover_url?: string | undefined;
}

export interface ArticleFrontMatter extends BaseFrontMatter {
  type: "article";
}

export interface DirectoryFrontMatter extends BaseFrontMatter {
  type: "directory";
}

export interface ChapterFrontMatter extends BaseFrontMatter {
  type: "chapter";
}

export interface LocaleFrontMatter extends BaseFrontMatter {
  type: "locale";
  aliases?: string[] | undefined;
}

export interface FrontMatterMap {
  article: ArticleFrontMatter;
  directory: DirectoryFrontMatter;
  chapter: ChapterFrontMatter;
  locale: LocaleFrontMatter;
}

export type FrontMatter = FrontMatterMap[keyof FrontMatterMap];
