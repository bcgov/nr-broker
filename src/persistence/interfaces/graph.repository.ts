import { EdgeDto } from '../dto/edge.dto';
import { VertexDto } from '../dto/vertex.dto';

export abstract class GraphRepository {
  // Data for graph
  public abstract getData(includeCollection: boolean): Promise<string>;
  // Edge
  public abstract addEdge(edge: EdgeDto): Promise<boolean>;
  public abstract deleteEdge(id: string): Promise<boolean>;
  public abstract getEdge(id: string): Promise<EdgeDto>;
  // Vertex
  public abstract addVertex(vertex: VertexDto): Promise<boolean>;
  public abstract editVertex(id: string, vertex: VertexDto): Promise<boolean>;
  public abstract deleteVertex(id: string): Promise<boolean>;
  public abstract getVertex(id: string): Promise<VertexDto>;
}
