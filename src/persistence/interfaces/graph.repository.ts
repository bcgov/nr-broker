export abstract class GraphRepository {
  public abstract getData(includeCollection: boolean): Promise<string>;
}
