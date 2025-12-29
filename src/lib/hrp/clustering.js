/**
 * HRP Hierarchical Clustering Module
 * Implements single-linkage clustering and quasi-diagonalization
 */

/**
 * Find minimum distance pair in distance matrix
 * @param {number[][]} distMatrix
 * @param {Set} activeClusters
 * @returns {{ i: number, j: number, dist: number }}
 */
function findMinDistance(distMatrix, activeClusters) {
    let minDist = Infinity;
    let minI = -1;
    let minJ = -1;

    const active = Array.from(activeClusters);
    for (let a = 0; a < active.length; a++) {
        for (let b = a + 1; b < active.length; b++) {
            const i = active[a];
            const j = active[b];
            if (distMatrix[i][j] < minDist) {
                minDist = distMatrix[i][j];
                minI = i;
                minJ = j;
            }
        }
    }

    return { i: minI, j: minJ, dist: minDist };
}

/**
 * Perform hierarchical clustering (single linkage)
 * @param {number[][]} distMatrix - Distance matrix
 * @returns {Object[]} - Linkage matrix: [{ i, j, dist, size }]
 */
export function hierarchicalCluster(distMatrix) {
    const n = distMatrix.length;
    if (n <= 1) return [];

    // Deep copy distance matrix
    const dist = distMatrix.map(row => [...row]);

    // Track active clusters
    const activeClusters = new Set(Array.from({ length: n }, (_, i) => i));

    // Track cluster sizes
    const clusterSizes = Array(2 * n - 1).fill(1);

    // Track cluster members for each cluster ID
    const clusterMembers = Array.from({ length: n }, (_, i) => [i]);

    const linkage = [];
    let nextCluster = n;

    while (activeClusters.size > 1) {
        // Find closest pair
        const { i, j, dist: d } = findMinDistance(dist, activeClusters);

        if (i === -1 || j === -1) break;

        // Record linkage
        linkage.push({
            i: Math.min(i, j),
            j: Math.max(i, j),
            dist: d,
            size: clusterSizes[i] + clusterSizes[j],
        });

        // Merge clusters: update distance matrix with single linkage (minimum)
        const newCluster = nextCluster++;
        clusterSizes[newCluster] = clusterSizes[i] + clusterSizes[j];
        clusterMembers[newCluster] = [...(clusterMembers[i] || [i]), ...(clusterMembers[j] || [j])];

        // Add new row/column for the merged cluster
        const newRow = [];
        for (let k = 0; k < dist.length; k++) {
            if (k === i || k === j) {
                newRow.push(Infinity);
            } else {
                // Single linkage: take minimum distance
                newRow.push(Math.min(dist[i][k], dist[j][k]));
            }
        }
        newRow.push(0); // Distance to self

        // Update matrix
        dist.push(newRow);
        for (let k = 0; k < dist.length - 1; k++) {
            dist[k].push(newRow[k]);
        }

        // Mark old clusters as merged
        for (let k = 0; k < dist.length; k++) {
            dist[i][k] = Infinity;
            dist[k][i] = Infinity;
            dist[j][k] = Infinity;
            dist[k][j] = Infinity;
        }

        // Update active clusters
        activeClusters.delete(i);
        activeClusters.delete(j);
        activeClusters.add(newCluster);
    }

    return linkage;
}

/**
 * Build cluster tree from linkage matrix
 * @param {Object[]} linkage
 * @param {number} n - Number of original items
 * @returns {Object} - Tree structure
 */
export function buildClusterTree(linkage, n) {
    const nodes = {};

    // Initialize leaf nodes
    for (let i = 0; i < n; i++) {
        nodes[i] = { id: i, isLeaf: true, items: [i] };
    }

    // Build internal nodes from linkage
    for (let k = 0; k < linkage.length; k++) {
        const { i, j, dist } = linkage[k];
        const newId = n + k;

        const leftItems = nodes[i]?.items || [i];
        const rightItems = nodes[j]?.items || [j];

        nodes[newId] = {
            id: newId,
            isLeaf: false,
            left: i,
            right: j,
            dist,
            items: [...leftItems, ...rightItems],
        };
    }

    // Root is the last cluster
    const rootId = n + linkage.length - 1;
    return nodes[rootId] || nodes[0];
}

/**
 * Get quasi-diagonal order (seriation) from linkage
 * This reorders assets so that similar assets are adjacent
 * @param {Object[]} linkage
 * @param {number} n - Number of original items
 * @returns {number[]} - Ordered indices
 */
export function getQuasiDiagonalOrder(linkage, n) {
    if (n <= 1) return [0];
    if (linkage.length === 0) return Array.from({ length: n }, (_, i) => i);

    // Build tree and traverse in order
    const tree = buildClusterTree(linkage, n);

    function traverse(node) {
        if (!node) return [];

        if (node.isLeaf) {
            return [node.id];
        }

        const leftOrder = traverse(
            typeof node.left === 'number' && node.left < n
                ? { id: node.left, isLeaf: true, items: [node.left] }
                : buildClusterTree(linkage.slice(0, node.left - n + 1), n)
        );

        const rightOrder = traverse(
            typeof node.right === 'number' && node.right < n
                ? { id: node.right, isLeaf: true, items: [node.right] }
                : buildClusterTree(linkage.slice(0, node.right - n + 1), n)
        );

        return [...leftOrder, ...rightOrder];
    }

    // Simpler approach: use items from tree
    return tree.items || Array.from({ length: n }, (_, i) => i);
}

/**
 * Convert linkage matrix to D3 hierarchy format
 * @param {Object[]} linkage
 * @param {string[]} symbols
 * @returns {Object} - D3 hierarchy-compatible object
 */
export function linkageToHierarchy(linkage, symbols) {
    const n = symbols.length;

    if (n === 0) return { name: 'root', children: [] };
    if (n === 1) return { name: symbols[0], value: 1 };

    const nodes = {};

    // Create leaf nodes
    for (let i = 0; i < n; i++) {
        nodes[i] = { name: symbols[i], value: 1 };
    }

    // Create internal nodes
    for (let k = 0; k < linkage.length; k++) {
        const { i, j, dist } = linkage[k];
        const newId = n + k;

        nodes[newId] = {
            name: `Cluster ${k + 1}`,
            dist,
            children: [nodes[i], nodes[j]],
        };
    }

    // Return root
    return nodes[n + linkage.length - 1] || nodes[0];
}

/**
 * Get cluster assignments at a given distance threshold
 * @param {Object[]} linkage
 * @param {number} n
 * @param {number} threshold
 * @returns {number[]} - Cluster assignment for each item
 */
export function getClustersAtThreshold(linkage, n, threshold) {
    const assignments = Array.from({ length: n }, (_, i) => i);

    for (const { i, j, dist } of linkage) {
        if (dist > threshold) break;

        // Merge: assign all items in cluster j to cluster i
        const targetCluster = assignments[i < n ? i : assignments.findIndex(a => a === i)];
        const sourceCluster = assignments[j < n ? j : assignments.findIndex(a => a === j)];

        for (let k = 0; k < n; k++) {
            if (assignments[k] === sourceCluster) {
                assignments[k] = targetCluster;
            }
        }
    }

    // Renumber clusters to be sequential
    const uniqueClusters = [...new Set(assignments)];
    const clusterMap = Object.fromEntries(uniqueClusters.map((c, i) => [c, i]));

    return assignments.map(a => clusterMap[a]);
}
