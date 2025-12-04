import { GraphTypeaheadResult } from '../../graph/dto/graph-typeahead-result.dto';
import { EdgeInsertDto } from '../dto/edge.dto';
import { EdgeEntity } from '../entity/edge.entity';
import {
  BrokerAccountProjectMapDto,
  GraphDataResponseDto,
  GraphDeleteResponseDto,
} from '../dto/graph-data.dto';
import { VertexInfoDto } from '../dto/vertex-info.dto';
import { VertexSearchDto } from '../dto/vertex.dto';
import { GraphProjectServicesResponseDto } from '../dto/graph-project-services.dto';
import { GraphServerInstallsResponseDto } from '../dto/graph-server-installs.dto';
import { ServiceDetailsResponseDto, ServiceDto } from '../dto/service.dto';
import { GraphUpDownDto } from '../dto/graph-updown.dto';
import { ServiceInstanceDetailsResponseDto } from '../dto/service-instance.dto';
import { CollectionEntityUnion } from '../entity/collection-entity-union.type';
import { UserPermissionDto } from '../dto/user-permission.dto';
import { VertexEntity } from '../entity/vertex.entity';
import { GraphVertexConnections } from '../../persistence/dto/collection-combo.dto';
import { VertexPointerDto } from '../dto/vertex-pointer.dto';
import { CollectionConfigInstanceDto } from '../dto/collection-config.dto';

export abstract class GraphRepository {
  // Data for graph
  public abstract getData(
    includeCollection: boolean,
  ): Promise<GraphDataResponseDto>;
  public abstract getDataSlice(
    collections: string[],
  ): Promise<GraphDataResponseDto>;
  public abstract getProjectServices(): Promise<
    GraphProjectServicesResponseDto[]
  >;
  public abstract getServerInstalls(): Promise<
    GraphServerInstallsResponseDto[]
  >;
  public abstract getServiceDetails(
    id: string,
  ): Promise<ServiceDetailsResponseDto>;
  public abstract getServiceInstanceDetails(
    id: string,
  ): Promise<ServiceInstanceDetailsResponseDto>;
  public abstract getUserPermissions(id: string): Promise<UserPermissionDto>;
  public abstract getTeamUserPermissions(
    teamVertexId: string,
    roleName: string,
  ): Promise<UserPermissionDto>;
  // Edge
  public abstract addEdge(edge: EdgeInsertDto): Promise<EdgeEntity>;
  public abstract editEdge(
    id: string,
    edge: EdgeInsertDto,
  ): Promise<EdgeEntity>;
  public abstract deleteEdge(id: string): Promise<GraphDeleteResponseDto>;
  public abstract getEdge(id: string): Promise<EdgeEntity | null>;
  public abstract getEdgeByNameAndVertices(
    name: string,
    source: string,
    target: string,
  ): Promise<EdgeEntity>;
  public abstract searchEdgesShallow(
    name: string,
    source?: string,
    target?: string,
  ): Promise<EdgeEntity[]>;
  public abstract getEdgeConfigByVertex(
    sourceId: string,
    targetCollection?: string,
    edgeName?: string,
  ): Promise<CollectionConfigInstanceDto[]>;
  // Vertex
  public abstract addVertex(
    vertex: VertexEntity,
    collection: CollectionEntityUnion[typeof vertex.collection],
  ): Promise<VertexEntity>;
  public abstract editVertex(
    id: string,
    vertex: VertexEntity,
    collection: CollectionEntityUnion[typeof vertex.collection],
    ignoreBlankFields?: boolean,
  ): Promise<VertexEntity>;
  public abstract deleteVertex(id: string): Promise<GraphDeleteResponseDto>;
  public abstract getVertex(id: string): Promise<VertexEntity | null>;
  public abstract getVertexByName(
    collection: keyof CollectionEntityUnion,
    name: string,
  ): Promise<VertexEntity | null>;
  public abstract getVertexConnections(
    id: string,
  ): Promise<GraphVertexConnections>;
  public abstract getVertexInfo(id: string): Promise<VertexInfoDto>;
  public abstract searchVertex(
    collection: keyof CollectionEntityUnion,
    edgeName?: string,
    edgeTarget?: string,
  ): Promise<VertexSearchDto[]>;
  public abstract getUserConnectedVertex(id: string): Promise<string[]>;
  public abstract getVertexByParentIdAndName(
    collection: keyof CollectionEntityUnion,
    parentId: string,
    name: string,
  ): Promise<VertexEntity | null>;
  public abstract getUpstreamVertex<T extends VertexPointerDto>(
    id: string,
    index: number,
    matchEdgeNames?: string[] | null,
    allowRestrictedEdges?: boolean,
  ): Promise<GraphUpDownDto<T>[]>;
  public abstract getDownstreamVertex<T extends VertexPointerDto>(
    id: string,
    index: number,
    maxDepth: number,
    allowRestrictedEdges?: boolean,
  ): Promise<GraphUpDownDto<T>[]>;
  public abstract getBrokerAccountServices(
    id: string,
  ): Promise<BrokerAccountProjectMapDto>;
  public abstract getTargetServices(
    id: string,
  ): Promise<GraphUpDownDto<ServiceDto>[]>;

  public abstract vertexTypeahead<T extends keyof CollectionEntityUnion>(
    text: string,
    collections?: T[],
    offset?: number,
    limit?: number,
  ): Promise<GraphTypeaheadResult>;

  public abstract reindexCache(): Promise<boolean>;
}
