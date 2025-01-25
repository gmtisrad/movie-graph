"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GremlinClient = void 0;
const gremlin_1 = require("gremlin");
const config_1 = __importDefault(require("../../config"));
const { Graph } = gremlin_1.structure;
const { t: { id, label }, statics: { outV, inV } } = gremlin_1.process;
class GremlinClient {
    constructor() {
        this.connection = new gremlin_1.driver.DriverRemoteConnection(`wss://${config_1.default.neptune.endpoint}:${config_1.default.neptune.port}/gremlin`, {
            mimeType: 'application/vnd.gremlin-v2.0+json',
            headers: {} // We'll add AWS IAM auth headers if needed
        });
        this.g = new Graph().traversal().withRemote(this.connection);
    }
    async getVertex(vertexId) {
        try {
            const result = await this.g.V(vertexId)
                .project('id', 'label')
                .by(id)
                .by(label)
                .next();
            return result.value ? result.value : null;
        }
        catch (error) {
            console.error('Error fetching vertex:', error);
            throw error;
        }
    }
    async getVertexNeighbors(vertexId, direction = 'both', vertexLabel) {
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
            return results.map(r => r);
        }
        catch (error) {
            console.error('Error fetching neighbors:', error);
            throw error;
        }
    }
    async getEdges(vertexId, direction = 'both') {
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
            return results.map(r => r);
        }
        catch (error) {
            console.error('Error fetching edges:', error);
            throw error;
        }
    }
    async searchVertices(vertexLabel, limit = 10, offset = 0) {
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
                total: total.value,
                results: vertices.map(v => v)
            };
        }
        catch (error) {
            console.error('Error searching vertices:', error);
            throw error;
        }
    }
    async close() {
        try {
            await this.connection.close();
        }
        catch (error) {
            console.error('Error closing connection:', error);
            throw error;
        }
    }
}
exports.GremlinClient = GremlinClient;
