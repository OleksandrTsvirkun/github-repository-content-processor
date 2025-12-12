export default class FileStats {
  constructor(
    public size: number,
    public createdAt: Date,
    public updatedAt: Date,
    public sha: string
  ) {}
}
