export interface RoadNode {
    id: string;
    x: number;
    y: number;
    connections: string[]; // Array of Node IDs
}

export interface RoadGraph {
    nodes: { [id: string]: RoadNode };
}

// Heuristic function for A* (Euclidean distance)
const heuristic = (a: RoadNode, b: RoadNode): number => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};

export const findPath = (graph: RoadGraph, startId: string, endId: string): string[] | null => {
    const openSet = new Set<string>([startId]);
    const cameFrom: { [id: string]: string } = {};

    const gScore: { [id: string]: number } = {};
    gScore[startId] = 0;

    const fScore: { [id: string]: number } = {};
    fScore[startId] = heuristic(graph.nodes[startId], graph.nodes[endId]);

    while (openSet.size > 0) {
        // Find node in openSet with lowest fScore
        let currentId: string | null = null;
        let minF = Infinity;

        openSet.forEach(id => {
            const score = fScore[id] ?? Infinity;
            if (score < minF) {
                minF = score;
                currentId = id;
            }
        });

        if (!currentId) break;

        if (currentId === endId) {
            // Reconstruct path
            const path = [currentId];
            while (currentId! in cameFrom) {
                currentId = cameFrom[currentId!];
                path.unshift(currentId!);
            }
            return path;
        }

        openSet.delete(currentId);

        const currentNode = graph.nodes[currentId];
        if (!currentNode) continue;

        for (const neighborId of currentNode.connections) {
            const neighbor = graph.nodes[neighborId];
            if (!neighbor) continue;

            const tentativeGScore = (gScore[currentId] ?? Infinity) + heuristic(currentNode, neighbor);

            if (tentativeGScore < (gScore[neighborId] ?? Infinity)) {
                cameFrom[neighborId] = currentId;
                gScore[neighborId] = tentativeGScore;
                fScore[neighborId] = tentativeGScore + heuristic(neighbor, graph.nodes[endId]);

                if (!openSet.has(neighborId)) {
                    openSet.add(neighborId);
                }
            }
        }
    }

    return null; // No path found
};

export const findNearestNode = (graph: RoadGraph, x: number, y: number): string | null => {
    let nearestId: string | null = null;
    let minDist = Infinity;

    Object.values(graph.nodes).forEach(node => {
        const dx = node.x - x;
        const dy = node.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
            minDist = dist;
            nearestId = node.id;
        }
    });

    return nearestId;
};
