"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactFlow, {
  Background,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
  type EdgeTypes,
} from "reactflow";
import "reactflow/dist/style.css";

import { useGraph } from "./_hooks/use-graph";
import { GraphNode } from "./_components/graph-node";
import { GraphEdge } from "./_components/graph-edge";
import { IntroNode } from "./_components/intro-node";
import { applyDagreLayout } from "./_lib/graph-layout";
import { cn } from "@/app/lib/cn";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTransitionStore } from "@/app/stores/transition-store";

// Define custom node and edge types
const nodeTypes: NodeTypes = {
  position: GraphNode,
  intro: IntroNode,
};

const edgeTypes: EdgeTypes = {
  move: GraphEdge,
};

interface ChildOption {
  nodeId: string;
  moveSan: string;
}

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fitView, setCenter } = useReactFlow();
  const previousPositions = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );

  // Get focus FEN from URL params (when returning from Analyze)
  const focusFen = searchParams.get("focus")
    ? decodeURIComponent(searchParams.get("focus")!)
    : null;

  const isTransitioning = useTransitionStore((s) => s.isTransitioning);

  // Child selection state
  const [childSelectOpen, setChildSelectOpen] = useState(false);
  const [childOptions, setChildOptions] = useState<ChildOption[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);

  const {
    nodes,
    edges,
    currentPositionId,
    pathPositionIds,
    isLoading,
    isLoadingChildren,
    navigateToChild,
    navigateToAncestor,
    navigateBack,
    resetToStart,
  } = useGraph();

  // Apply dagre layout to nodes (horizontal: left-to-right)
  const layoutedPositionNodes = applyDagreLayout(
    nodes,
    edges,
    { direction: "LR", nodeSep: 60, rankSep: 100 },
    previousPositions.current,
  ).map((node) => ({
    ...node,
    // Sync selection state with ReactFlow
    selected: node.id === currentPositionId,
  }));

  // Add intro node positioned to the left of the start node
  const layoutedNodes = useMemo(() => {
    const startNode = layoutedPositionNodes.find((n) => !n.data.moveSan);
    if (!startNode) return layoutedPositionNodes;

    const introNode = {
      id: "intro",
      type: "intro",
      position: {
        x: startNode.position.x - 280,
        y: startNode.position.y + 60,
      },
      data: {},
      selectable: false,
      draggable: false,
    };

    return [introNode, ...layoutedPositionNodes];
  }, [layoutedPositionNodes]);

  // Store positions for next render
  useEffect(() => {
    const newPositions = new Map<string, { x: number; y: number }>();
    layoutedNodes.forEach((node) => {
      newPositions.set(node.id, node.position);
    });
    previousPositions.current = newPositions;
  }, [layoutedNodes]);

  // Zoom to a node
  const zoomToNode = useCallback(
    (nodeId: string, updateUrl = true) => {
      const nodeData = layoutedPositionNodes.find((n) => n.id === nodeId);
      if (nodeData) {
        setCenter(nodeData.position.x + 90, nodeData.position.y + 140, {
          zoom: 1.5,
          duration: 500,
        });
        // Update URL with FEN (skip for start position to keep URL clean)
        if (updateUrl && nodeData.data.moveSan) {
          router.replace(`/explore?focus=${encodeURIComponent(nodeData.data.fen)}`, { scroll: false });
        } else if (updateUrl) {
          router.replace("/explore", { scroll: false });
        }
      }
    },
    [layoutedPositionNodes, setCenter, router],
  );

  // Initial focus: zoom to current position
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current || isLoading || isTransitioning) return;
    if (layoutedPositionNodes.length === 0) return;

    hasInitialized.current = true;

    // Find target node: either the focus target or the start node
    const targetNode = focusFen
      ? layoutedPositionNodes.find((n) => n.data.fen === focusFen)
      : layoutedPositionNodes.find((n) => !n.data.moveSan);

    if (targetNode) {
      const timeoutId = setTimeout(() => {
        zoomToNode(targetNode.id, false);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [layoutedPositionNodes, isLoading, isTransitioning, focusFen, zoomToNode]);

  // Zoom to current position when it changes
  useEffect(() => {
    if (currentPositionId && !isLoading) {
      zoomToNode(currentPositionId);
    }
  }, [currentPositionId, isLoading, zoomToNode]);

  // Get child nodes of current selection (for keyboard navigation)
  const getChildNodes = useCallback((): ChildOption[] => {
    if (!currentPositionId) return [];
    const childEdges = edges.filter((e) => e.source === currentPositionId);
    return childEdges.map((e) => ({
      nodeId: e.target,
      moveSan: e.data?.moveSan || "?",
    }));
  }, [currentPositionId, edges]);

  // Handle node click
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setChildSelectOpen(false);

      // Check if this is a path node (ancestor) or a child node
      const isPathNode = pathPositionIds.includes(node.id);
      const isCurrentNode = node.id === currentPositionId;

      if (isCurrentNode) {
        // Already selected, do nothing
        return;
      } else if (isPathNode) {
        // Navigate back to ancestor
        navigateToAncestor(node.id);
      } else {
        // Navigate to child
        navigateToChild(node.id);
      }
    },
    [pathPositionIds, currentPositionId, navigateToAncestor, navigateToChild],
  );

  // Handle node double click - go to analyze
  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      const nodeData = nodes.find((n) => n.id === node.id);
      if (nodeData) {
        const fen = encodeURIComponent(nodeData.data.fen);
        router.push(`/analyze?fen=${fen}`);
      }
    },
    [nodes, router],
  );

  // Handle background click (do nothing - keep selection)
  const onPaneClick = useCallback(() => {
    setChildSelectOpen(false);
  }, []);

  // Handle analyze button
  const handleAnalyze = useCallback(() => {
    if (currentPositionId) {
      const node = nodes.find((n) => n.id === currentPositionId);
      if (node) {
        const fen = encodeURIComponent(node.data.fen);
        router.push(`/analyze?fen=${fen}`);
      }
    }
  }, [currentPositionId, nodes, router]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (e.target instanceof HTMLInputElement) return;

      // Handle child selection popup navigation
      if (childSelectOpen) {
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            setSelectedChildIndex((prev) =>
              prev > 0 ? prev - 1 : childOptions.length - 1,
            );
            return;
          case "ArrowDown":
            e.preventDefault();
            setSelectedChildIndex((prev) =>
              prev < childOptions.length - 1 ? prev + 1 : 0,
            );
            return;
          case "Enter":
            e.preventDefault();
            if (childOptions[selectedChildIndex]) {
              navigateToChild(childOptions[selectedChildIndex].nodeId);
              setChildSelectOpen(false);
            }
            return;
          case "Escape":
            e.preventDefault();
            setChildSelectOpen(false);
            return;
        }
      }

      // Regular keyboard navigation
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          resetToStart();
          break;

        case "ArrowLeft":
          e.preventDefault();
          navigateBack();
          break;

        case "ArrowRight":
          e.preventDefault();
          const children = getChildNodes();
          if (children.length === 1) {
            // Single child - navigate directly
            navigateToChild(children[0].nodeId);
          } else if (children.length > 1) {
            // Multiple children - open selection (sorted alphabetically)
            setChildOptions([...children].sort((a, b) => a.moveSan.localeCompare(b.moveSan)));
            setSelectedChildIndex(0);
            setChildSelectOpen(true);
          }
          break;

        case "a":
        case "Enter":
          e.preventDefault();
          if (currentPositionId) {
            handleAnalyze();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentPositionId,
    handleAnalyze,
    childSelectOpen,
    childOptions,
    selectedChildIndex,
    getChildNodes,
    navigateToChild,
    navigateBack,
    resetToStart,
  ]);

  return (
    <div className="h-screen w-full">
      <ReactFlow
        nodes={layoutedNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "move",
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--border-subtle))" gap={20} />
      </ReactFlow>

      {/* Loading indicator for children */}
      {isLoadingChildren && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-surface/90 backdrop-blur px-3 py-2 rounded-lg border border-border-default shadow-md">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          <span className="text-sm text-secondary">Loading moves...</span>
        </div>
      )}

      {/* Child selection popup */}
      {childSelectOpen && childOptions.length > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="bg-surface border border-border-default rounded-lg shadow-xl p-2 min-w-[160px]">
            <div className="text-xs text-tertiary px-2 py-1 mb-1">
              Select move (↑↓ Enter)
            </div>
            {childOptions.map((option, index) => (
              <div
                key={option.nodeId}
                className={cn(
                  "px-3 py-2 rounded cursor-pointer font-mono text-sm",
                  index === selectedChildIndex
                    ? "bg-accent text-white"
                    : "hover:bg-surface-hover",
                )}
                onClick={() => {
                  navigateToChild(option.nodeId);
                  setChildSelectOpen(false);
                }}
              >
                {option.moveSan}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile navigation arrows */}
      {currentPositionId && (
        <div className="lg:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4">
          <button
            onClick={() => navigateBack()}
            disabled={pathPositionIds.length <= 1}
            className="w-14 h-14 rounded-full bg-zinc-900/80 dark:bg-zinc-100/80 flex items-center justify-center active:scale-95 disabled:opacity-30 disabled:active:scale-100 touch-manipulation shadow-lg"
            aria-label="Previous move"
          >
            <ChevronLeft className="h-8 w-8 text-white dark:text-zinc-900" />
          </button>
          <button
            onClick={() => {
              const children = getChildNodes();
              if (children.length === 1) {
                navigateToChild(children[0].nodeId);
              } else if (children.length > 1) {
                setChildOptions([...children].sort((a, b) => a.moveSan.localeCompare(b.moveSan)));
                setSelectedChildIndex(0);
                setChildSelectOpen(true);
              }
            }}
            disabled={getChildNodes().length === 0}
            className="w-14 h-14 rounded-full bg-zinc-900/80 dark:bg-zinc-100/80 flex items-center justify-center active:scale-95 disabled:opacity-30 disabled:active:scale-100 touch-manipulation shadow-lg"
            aria-label="Next move"
          >
            <ChevronRight className="h-8 w-8 text-white dark:text-zinc-900" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <ReactFlowProvider>
      <Suspense
        fallback={
          <div className="flex h-screen w-full items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100" />
          </div>
        }
      >
        <ExploreContent />
      </Suspense>
    </ReactFlowProvider>
  );
}
