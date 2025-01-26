import { driver, process as gprocess, structure } from 'gremlin';
import { EventEmitter } from 'events';
import { Edge, Movie, PaginatedResponse, Person, Vertex } from '@movie-graph/types';
import config from '../../config';

export class GraphClient {
  private client: driver.Client & EventEmitter;

  constructor(endpoint: string) {
    this.client = new driver.Client(endpoint) as driver.Client & EventEmitter;
  }

  async getMovieCast(movieId: string, limit: number = 10, offset: number = 0): Promise<PaginatedResponse<Person>> {
    const query = `g.V('${movieId}').outE('ACTED_IN').inV().range(${offset}, ${offset + limit})`;
    const results = await this.client.submit(query);
    const data = results.toArray().map((vertex: any) => ({
      id: vertex.id,
      label: vertex.label,
      properties: vertex.properties
    }));
    
    return {
      data,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      total: data.length // Note: This is not accurate, we need a count query
    };
  }

  async getPersonMovies(personId: string, limit: number = 10, offset: number = 0): Promise<PaginatedResponse<Movie>> {
    const query = `g.V('${personId}').inE('ACTED_IN').outV().range(${offset}, ${offset + limit})`;
    const results = await this.client.submit(query);
    const data = results.toArray().map((vertex: any) => ({
      id: vertex.id,
      label: vertex.label,
      properties: vertex.properties
    }));
    
    return {
      data,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      total: data.length // Note: This is not accurate, we need a count query
    };
  }

  async getMovieRecommendations(movieId: string, limit: number = 10): Promise<PaginatedResponse<Movie>> {
    const query = `g.V('${movieId}').out('ACTED_IN').in('ACTED_IN').where(neq('${movieId}')).dedup().limit(${limit})`;
    const results = await this.client.submit(query);
    const data = results.toArray().map((vertex: any) => ({
      id: vertex.id,
      label: vertex.label,
      properties: vertex.properties
    }));
    
    return {
      data,
      page: 1,
      pageSize: limit,
      total: data.length
    };
  }

  async getVertex(vertexId: string): Promise<Vertex | null> {
    try {
      const result = await this.client.submit(`g.V('${vertexId}').project('id', 'label').by(id).by(label).next()`);
      return result.toArray().length > 0 ? result.toArray()[0] as Vertex : null;
    } catch (error) {
      console.error('Error fetching vertex:', error);
      return null;
    }
  }

  async getConnectedVertices(
    vertexId: string,
    direction: 'in' | 'out' | 'both',
    vertexLabel?: string
  ): Promise<Vertex[]> {
    try {
      let query = `g.V('${vertexId}').project('id', 'label').by(id).by(label)`;
      
      switch (direction) {
        case 'in':
          query = `g.V('${vertexId}').in_().project('id', 'label').by(id).by(label)`;
          break;
        case 'out':
          query = `g.V('${vertexId}').out().project('id', 'label').by(id).by(label)`;
          break;
        case 'both':
          query = `g.V('${vertexId}').both().project('id', 'label').by(id).by(label)`;
          break;
      }

      if (vertexLabel) {
        query = `g.V('${vertexId}').hasLabel('${vertexLabel}').project('id', 'label').by(id).by(label)`;
      }

      const results = await this.client.submit(query);
      return results.toArray().map((r: any) => r as Vertex);
    } catch (error) {
      console.error('Error fetching connected vertices:', error);
      return [];
    }
  }

  async getConnectedEdges(
    vertexId: string,
    direction: 'in' | 'out' | 'both'
  ): Promise<Edge[]> {
    try {
      let query = `g.V('${vertexId}').project('id', 'from', 'to', 'label').by(id).by(outV().id()).by(inV().id()).by(label)`;
      
      switch (direction) {
        case 'in':
          query = `g.V('${vertexId}').inE().project('id', 'from', 'to', 'label').by(id).by(outV().id()).by(inV().id()).by(label)`;
          break;
        case 'out':
          query = `g.V('${vertexId}').outE().project('id', 'from', 'to', 'label').by(id).by(outV().id()).by(inV().id()).by(label)`;
          break;
        case 'both':
          query = `g.V('${vertexId}').bothE().project('id', 'from', 'to', 'label').by(id).by(outV().id()).by(inV().id()).by(label)`;
          break;
      }

      const results = await this.client.submit(query);
      return results.toArray().map((r: any) => r as Edge);
    } catch (error) {
      console.error('Error fetching connected edges:', error);
      return [];
    }
  }

  async getVerticesByLabel(
    vertexLabel: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<PaginatedResponse<Vertex>> {
    try {
      const totalResult = await this.client.submit(`g.V().hasLabel('${vertexLabel}').count().next()`);
      const total = totalResult.toArray()[0] as number;

      const vertices = await this.client.submit(`g.V().hasLabel('${vertexLabel}').range(${offset}, ${offset + limit}).project('id', 'label').by(id).by(label).toList()`);
      const data = vertices.toArray().map((v: any) => v as Vertex);

      return {
        data,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        total
      };
    } catch (error) {
      console.error('Error fetching vertices by label:', error);
      return {
        data: [],
        page: 1,
        pageSize: limit,
        total: 0
      };
    }
  }

  async close() {
    try {
      await this.client.close();
    } catch (error) {
      console.error('Error closing connection:', error);
    }
  }
} 