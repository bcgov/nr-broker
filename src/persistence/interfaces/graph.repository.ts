import { GraphTypeaheadResult } from '../../graph/dto/graph-typeahead-result.dto';
import { CollectionDtoUnion } from '../dto/collection-dto-union.type';
import { CollectionConfigInstanceDto } from '../dto/collection-config.dto';
import { EdgeInsertDto } from '../dto/edge-rest.dto';
import { EdgeDto } from '../dto/edge.dto';
import {
  BrokerAccountProjectMapDto,
  GraphDataResponseDto,
  GraphDeleteResponseDto,
  UpstreamResponseDto,
} from '../dto/graph-data.dto';
import { VertexInfoDto } from '../dto/vertex-info.dto';
import { VertexPointerDto } from '../dto/vertex-pointer.dto';
import { VertexSearchDto } from '../dto/vertex-rest.dto';
import { VertexDto } from '../dto/vertex.dto';
import { GraphProjectServicesResponseDto } from '../dto/graph-project-services-rest.dto';

export abstract class GraphRepository {
  // Data for graph
  public abstract getData(
    includeCollection: boolean,
  ): Promise<GraphDataResponseDto>;
  public abstract getProjectServices(): Promise<
    GraphProjectServicesResponseDto[]
  >;
  // Edge
  public abstract addEdge(edge: EdgeInsertDto): Promise<EdgeDto>;
  public abstract editEdge(id: string, edge: EdgeInsertDto): Promise<EdgeDto>;
  public abstract deleteEdge(id: string): Promise<GraphDeleteResponseDto>;
  public abstract getEdge(id: string): Promise<EdgeDto | null>;
  public abstract getEdgeByNameAndVertices(
    name: string,
    source: string,
    target: string,
  ): Promise<EdgeDto>;
  public abstract searchEdgesShallow(
    name: string,
    source?: string,
    target?: string,
  ): Promise<EdgeDto[]>;
  public abstract getEdgeConfigByVertex(
    sourceId: string,
    targetCollection?: string,
    edgeName?: string,
  ): Promise<CollectionConfigInstanceDto[]>;
  // Vertex
  public abstract addVertex(
    vertex: VertexDto,
    collection: CollectionDtoUnion[typeof vertex.collection],
  ): Promise<VertexDto>;
  public abstract editVertex(
    id: string,
    vertex: VertexDto,
    collection: CollectionDtoUnion[typeof vertex.collection],
    ignoreBlankFields?: boolean,
  ): Promise<VertexDto>;
  public abstract deleteVertex(id: string): Promise<GraphDeleteResponseDto>;
  public abstract getVertex(id: string): Promise<VertexDto | null>;
  public abstract getVertexByName(
    collection: keyof CollectionDtoUnion,
    name: string,
  ): Promise<VertexDto | null>;
  public abstract getVertexInfo(id: string): Promise<VertexInfoDto>;
  public abstract searchVertex(
    collection: keyof CollectionDtoUnion,
    edgeName?: string,
    edgeTarget?: string,
  ): Promise<VertexSearchDto[]>;
  public abstract getVertexByParentIdAndName(
    collection: keyof CollectionDtoUnion,
    parentId: string,
    name: string,
  ): Promise<VertexDto | null>;
  public abstract getUpstreamVertex<T extends VertexPointerDto>(
    id: string,
    index: number,
    matchEdgeNames: string[] | null,
  ): Promise<UpstreamResponseDto<T>[]>;
  public abstract getDownstreamVertex<T extends VertexPointerDto>(
    id: string,
    index: number,
    maxDepth: number,
  ): Promise<UpstreamResponseDto<T>[]>;
  public abstract getBrokerAccountServices(
    id: string,
  ): Promise<BrokerAccountProjectMapDto>;

  public abstract vertexTypeahead<T extends keyof CollectionDtoUnion>(
    text: string,
    collections?: T[],
    offset?: number,
    limit?: number,
  ): Promise<GraphTypeaheadResult>;

  public abstract reindexCache(): Promise<boolean>;
}
