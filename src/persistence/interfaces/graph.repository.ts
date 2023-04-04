export abstract class GraphRepository {
  public abstract getData(includeNodeData: boolean): Promise<string>;
}
