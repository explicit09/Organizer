import type {
  DependencyGraph,
  GraphNode,
  DependencyEdge,
  BlockedChain,
  ContextItem,
} from "../context/types";
import { listItems } from "../../items";
import { getDb } from "../../db";

export function analyzeDependencies(userId: string): DependencyGraph {
  const items = listItems(undefined, { userId });
  const openItems = items.filter((i) => i.status !== "completed");

  const db = getDb();
  const dependencies = db
    .prepare(
      `
      SELECT blocker_id, blocked_id, 'blocks' as type
      FROM dependencies
      WHERE user_id = ?
    `
    )
    .all(userId) as Array<{ blocker_id: string; blocked_id: string; type: string }>;

  // Build graph
  const nodes = new Map<string, GraphNode>();
  const edges: DependencyEdge[] = [];

  // Initialize nodes
  for (const item of openItems) {
    const contextItem: ContextItem = {
      id: item.id,
      title: item.title,
      type: item.type,
      status: item.status,
      priority: item.priority,
      dueAt: item.dueAt,
      estimatedMinutes: item.estimatedMinutes,
    };

    nodes.set(item.id, {
      item: contextItem,
      inDegree: 0,
      outDegree: 0,
      depth: 0,
      isCritical: false,
      estimatedUnblockDate: null,
    });
  }

  // Add edges and calculate degrees
  for (const dep of dependencies) {
    const blocker = nodes.get(dep.blocker_id);
    const blocked = nodes.get(dep.blocked_id);

    if (blocker && blocked) {
      blocker.outDegree++;
      blocked.inDegree++;
      edges.push({
        from: dep.blocker_id,
        to: dep.blocked_id,
        type: dep.type,
      });
    }
  }

  // Calculate depths using BFS
  const roots = [...nodes.values()].filter((n) => n.inDegree === 0);
  const queue = roots.map((n) => ({ node: n, depth: 0 }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;

    if (visited.has(node.item.id)) continue;
    visited.add(node.item.id);

    node.depth = Math.max(node.depth, depth);

    // Find items this node blocks
    const blockedIds = edges.filter((e) => e.from === node.item.id).map((e) => e.to);
    for (const blockedId of blockedIds) {
      const blockedNode = nodes.get(blockedId);
      if (blockedNode && !visited.has(blockedId)) {
        queue.push({ node: blockedNode, depth: depth + 1 });
      }
    }
  }

  // Find critical path
  const criticalPath = findCriticalPath(nodes, edges);

  // Mark critical nodes
  for (const itemId of criticalPath) {
    const node = nodes.get(itemId);
    if (node) node.isCritical = true;
  }

  // Estimate unblock dates
  for (const node of nodes.values()) {
    node.estimatedUnblockDate = estimateUnblockDate(node, nodes, edges);
  }

  // Find blocked chains
  const blockedChains = findBlockedChains(nodes, edges);

  return {
    nodes,
    edges,
    criticalPath,
    blockedChains,
  };
}

function findCriticalPath(
  nodes: Map<string, GraphNode>,
  edges: DependencyEdge[]
): string[] {
  const memo = new Map<string, { length: number; path: string[] }>();

  function dfs(nodeId: string): { length: number; path: string[] } {
    if (memo.has(nodeId)) return memo.get(nodeId)!;

    const node = nodes.get(nodeId);
    if (!node) return { length: 0, path: [] };

    // Find all items this blocks
    const blockedIds = edges.filter((e) => e.from === nodeId).map((e) => e.to);

    if (blockedIds.length === 0) {
      const result = { length: 1, path: [nodeId] };
      memo.set(nodeId, result);
      return result;
    }

    // Find longest path through children
    let longest = { length: 0, path: [] as string[] };
    for (const blockedId of blockedIds) {
      const childResult = dfs(blockedId);
      if (childResult.length > longest.length) {
        longest = childResult;
      }
    }

    const result = {
      length: longest.length + 1,
      path: [nodeId, ...longest.path],
    };
    memo.set(nodeId, result);
    return result;
  }

  // Start from all roots
  const roots = [...nodes.values()].filter((n) => n.inDegree === 0);
  let criticalPath: string[] = [];

  for (const root of roots) {
    const result = dfs(root.item.id);
    if (result.path.length > criticalPath.length) {
      criticalPath = result.path;
    }
  }

  return criticalPath;
}

function findBlockedChains(
  nodes: Map<string, GraphNode>,
  edges: DependencyEdge[]
): BlockedChain[] {
  const chains: BlockedChain[] = [];

  // Find root blockers (items that block others but aren't blocked)
  const rootBlockers = [...nodes.values()].filter(
    (n) => n.outDegree > 0 && n.inDegree === 0
  );

  for (const root of rootBlockers) {
    // BFS to find all downstream blocked items
    const visited = new Set<string>();
    const queue = [root.item.id];
    let totalItems = 0;
    let totalHours = 0;
    let maxDepth = 0;

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const node = nodes.get(currentId);
      if (!node) continue;

      totalItems++;
      totalHours += (node.item.estimatedMinutes || 60) / 60;
      maxDepth = Math.max(maxDepth, node.depth);

      // Add blocked items to queue
      const blockedIds = edges.filter((e) => e.from === currentId).map((e) => e.to);
      queue.push(...blockedIds);
    }

    // Don't count the root itself
    totalItems--;
    totalHours -= (root.item.estimatedMinutes || 60) / 60;

    if (totalItems > 0) {
      chains.push({
        rootBlocker: root.item,
        chainLength: maxDepth,
        totalBlockedItems: totalItems,
        totalBlockedHours: totalHours,
        unblockImpact: `Completing "${root.item.title}" unblocks ${totalItems} tasks (${totalHours.toFixed(1)}h of work)`,
      });
    }
  }

  // Sort by impact
  return chains.sort((a, b) => b.totalBlockedHours - a.totalBlockedHours);
}

function estimateUnblockDate(
  node: GraphNode,
  nodes: Map<string, GraphNode>,
  edges: DependencyEdge[]
): Date | null {
  if (node.inDegree === 0) {
    // Not blocked
    return null;
  }

  // Find all blockers
  const blockerIds = edges.filter((e) => e.to === node.item.id).map((e) => e.from);

  let latestUnblock = new Date();

  for (const blockerId of blockerIds) {
    const blocker = nodes.get(blockerId);
    if (!blocker) continue;

    // Estimate when blocker will be done
    const blockerDue = blocker.item.dueAt
      ? new Date(blocker.item.dueAt)
      : new Date(Date.now() + (blocker.item.estimatedMinutes || 60) * 60 * 1000);

    if (blockerDue > latestUnblock) {
      latestUnblock = blockerDue;
    }
  }

  return latestUnblock;
}

export function generateDependencyRecommendations(graph: DependencyGraph): string[] {
  const recommendations: string[] = [];

  // Recommend tackling high-impact blockers
  if (graph.blockedChains.length > 0) {
    const topBlocker = graph.blockedChains[0];
    recommendations.push(
      `Focus on "${topBlocker.rootBlocker.title}" - it unblocks ${topBlocker.totalBlockedItems} other tasks`
    );
  }

  // Warn about long critical paths
  if (graph.criticalPath.length > 5) {
    recommendations.push(
      `Long dependency chain detected (${graph.criticalPath.length} items). Consider parallelizing some work.`
    );
  }

  // Find items close to being unblocked
  const almostUnblocked = [...graph.nodes.values()].filter(
    (n) => n.inDegree === 1 && n.item.status !== "completed"
  );
  if (almostUnblocked.length > 0) {
    const item = almostUnblocked[0];
    recommendations.push(
      `"${item.item.title}" is waiting on just 1 item - close to being unblocked`
    );
  }

  return recommendations;
}
