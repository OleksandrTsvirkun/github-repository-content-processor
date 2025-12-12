import { ChapterFrontMatter, DirectoryFrontMatter, LocaleFrontMatter } from "../../types";
import ContentPath from "../domain/ContentPath";
import RepositoryElement from "./RepositoryElement";
import FileStats from "../domain/FileStats";

export default abstract class IndexElement extends RepositoryElement {
  protected children: unknown[] = [];

  constructor(
    path: ContentPath,
    frontmatter: LocaleFrontMatter | ChapterFrontMatter | DirectoryFrontMatter,
    stats: FileStats
  ) {
    super(path, frontmatter, stats);
  }

  get markdownFilePath(): string {
    return [this.path.locale, ...this.path.segments.map((x) => x.full), "index.md"].join("/");
  }

  get jsonFilePath(): string {
    return [this.path.locale, ...this.path.segments.map((x) => x.full), "index.json"].join("/");
  }
}
