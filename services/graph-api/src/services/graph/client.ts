import { driver, process as gprocess, structure } from 'gremlin';
import { Vertex, Edge, PaginatedResponse } from '@movie-graph/types';
import config from '../../config';

const { Graph } = structure;
const { t: { id, label }, statics: { outV, inV } } = gprocess;

export class GremlinClient {
  private connection: driver.DriverRemoteConnection;
  private g: gprocess.GraphTraversalSource;

  constructor() {
    this.connection = new driver.DriverRemoteConnection(
      `wss://${config.neptune.endpoint}:${config.neptune.port}/gremlin`,
      { 
        mimeType: 'application/vnd.gremlin-v2.0+json',
        headers: {} // We'll add AWS IAM auth headers if needed
      }
    );

    this.g = new Graph().traversal().withRemote(this.connection);
  }

  async getVertex(vertexId: string): Promise<Vertex | null> {
    try {
      const result = await this.g.V(vertexId)
        .project('id', 'label')
        .by(id)
        .by(label)
        .next();
      
      return result.value ? result.value as Vertex : null;
    } catch (error) {
      console.error('Error fetching vertex:', error);
      throw error;
    }
  }

  async getVertexNeighbors(
    vertexId: string, 
    direction: 'in' | 'out' | 'both' = 'both', 
    vertexLabel?: 'movie' | 'person'
  ): Promise<Vertex[]> {
    try {
      let traversal = this.g.V(vertexId);
      
      switch (direction) {
        case 'in':
          traversal = traversal.in_();
          break;
        case 'out':
          traversal = traversal.out();
          break;
        case 'both':
          traversal = traversal.both();
          break;
      }

      if (vertexLabel) {
        traversal = traversal.hasLabel(vertexLabel);
      }

      traversal = traversal
        .project('id', 'label')
        .by(id)
        .by(label);

      const results = await traversal.toList();
      return results.map(r => r as Vertex);
    } catch (error) {
      console.error('Error fetching neighbors:', error);
      throw error;
    }
  }

  async getEdges(
    vertexId: string, 
    direction: 'in' | 'out' | 'both' = 'both'
  ): Promise<Edge[]> {
    try {
      let traversal = this.g.V(vertexId);
      
      switch (direction) {
        case 'in':
          traversal = traversal.inE();
          break;
        case 'out':
          traversal = traversal.outE();
          break;
        case 'both':
          traversal = traversal.bothE();
          break;
      }

      traversal = traversal
        .project('id', 'from', 'to', 'label')
        .by(id)
        .by(outV().id())
        .by(inV().id())
        .by(label);

      const results = await traversal.toList();
      return results.map(r => r as Edge);
    } catch (error) {
      console.error('Error fetching edges:', error);
      throw error;
    }
  }

  async searchVertices(
    vertexLabel: 'movie' | 'person', 
    limit: number = 10, 
    offset: number = 0
  ): Promise<PaginatedResponse<Vertex>> {
    try {
      const total = await this.g.V()
        .hasLabel(vertexLabel)
        .count()
        .next();

      const vertices = await this.g.V()
        .hasLabel(vertexLabel)
        .range(offset, offset + limit)
        .project('id', 'label')
        .by(id)
        .by(label)
        .toList();

      return {
        total: total.value as number,
        results: vertices.map(v => v as Vertex)
      };
    } catch (error) {
      console.error('Error searching vertices:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.connection.close();
    } catch (error) {
      console.error('Error closing connection:', error);
      throw error;
    }
  }
} 