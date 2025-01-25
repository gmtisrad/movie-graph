"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("../services/graph/client");
const router = (0, express_1.Router)();
const client = new client_1.GremlinClient();
// Input validation schemas
const DirectionSchema = zod_1.z.enum(['in', 'out', 'both']).default('both');
const LabelSchema = zod_1.z.enum(['movie', 'person']).optional();
const PaginationSchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().min(1).max(100).default(10),
    offset: zod_1.z.coerce.number().min(0).default(0)
});
// Get vertex by ID
router.get('/vertices/:id', async (req, res) => {
    try {
        const vertex = await client.getVertex(req.params.id);
        if (!vertex) {
            return res.status(404).json({ error: 'Vertex not found' });
        }
        res.json(vertex);
    }
    catch (error) {
        console.error('Error in /vertices/:id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get edges for a vertex
router.get('/vertices/:id/edges', async (req, res) => {
    try {
        const direction = DirectionSchema.parse(req.query.direction);
        const edges = await client.getEdges(req.params.id, direction);
        res.json(edges);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Invalid parameters',
                code: 'VALIDATION_ERROR',
                details: error.errors
            });
        }
        console.error('Error in /vertices/:id/edges:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get neighboring vertices
router.get('/vertices/:id/neighbors', async (req, res) => {
    try {
        const direction = DirectionSchema.parse(req.query.direction);
        const label = LabelSchema.parse(req.query.label);
        const neighbors = await client.getVertexNeighbors(req.params.id, direction, label);
        res.json(neighbors);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Invalid parameters',
                code: 'VALIDATION_ERROR',
                details: error.errors
            });
        }
        console.error('Error in /vertices/:id/neighbors:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Search vertices
router.get('/search', async (req, res) => {
    try {
        const label = LabelSchema.parse(req.query.label);
        if (!label) {
            return res.status(400).json({
                error: 'Label parameter is required',
                code: 'MISSING_PARAMETER'
            });
        }
        const { limit, offset } = PaginationSchema.parse(req.query);
        const results = await client.searchVertices(label, limit, offset);
        res.json(results);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Invalid parameters',
                code: 'VALIDATION_ERROR',
                details: error.errors
            });
        }
        console.error('Error in /search:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
