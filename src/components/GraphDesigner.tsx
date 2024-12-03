import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Trash2, Info, ExternalLink, ZoomIn } from "lucide-react";
import { UnionFind } from "@/utils/UnionFind";

const COLORS = [
  "#FF6B6B",
  "#4ECDC4", 
  "#45B7D1",
  "#96CEB4",
  "#FFEEAD",
  "#D4A5A5",
  "#9B59B6",
  "#3498DB",
  "#E67E22",
  "#1ABC9C",
];

export function GraphDesigner() {
  const cyRef = useRef<HTMLDivElement>(null);
  const [cy, setCy] = useState<cytoscape.Core | null>(null);
  const [nodeName, setNodeName] = useState("");
  const [sourceNode, setSourceNode] = useState("");
  const [targetNode, setTargetNode] = useState("");
  const [nextNodeId, setNextNodeId] = useState(1);
  const [error, setError] = useState("");
  const [ufState, setUfState] = useState<{
    parent: Record<string, string>;
    rank: Record<string, number>;
  }>({ parent: {}, rank: {} });
  const [lastOperation, setLastOperation] = useState<string>("");

  const updateSubgraphColors = () => {
    if (!cy) return;

    const uf = new UnionFind();
    let operations: string[] = [];
    
    // Add all nodes to UnionFind
    cy.nodes().forEach(node => {
      uf.makeSet(node.id());
      operations.push(`Adding vertex ${node.id()} to Union-Find`);
    });

    // Union connected nodes
    cy.edges().forEach(edge => {
      const source = edge.source().id();
      const target = edge.target().id();
      operations.push(`Union of vertices ${source} and ${target}`);
      uf.union(source, target);
    });

    // Get all components
    const components = new Map<string, string[]>();
    cy.nodes().forEach(node => {
      const root = uf.find(node.id());
      if (!components.has(root)) {
        components.set(root, []);
      }
      components.get(root)?.push(node.id());
    });

    // Assign colors to components
    let colorIndex = 0;
    components.forEach((nodes, root) => {
      const color = COLORS[colorIndex % COLORS.length];
      operations.push(`Component ${root}: ${nodes.join(", ")} (${color})`);
      nodes.forEach(nodeId => {
        cy.getElementById(nodeId).style('background-color', color);
      });
      colorIndex++;
    });

    setLastOperation(operations.join("\n"));
    setUfState({
      parent: uf.getParentState(),
      rank: uf.getRankState()
    });
  };

  const addNode = () => {
    if (!cy) return;

    const id = nodeName || `v${nextNodeId}`;

    if (cy.getElementById(id).length > 0) {
      setError(`Vertex "${id}" already exists`);
      return;
    }

    // Get viewport center
    const center = {
      x: cy.width() / 2,
      y: cy.height() / 2
    };

    cy.add({
      group: 'nodes',
      data: { id, color: COLORS[0] },
      position: center
    });

    setNodeName("");
    setNextNodeId(prev => prev + 1);
    setError("");
    updateSubgraphColors();
  };

  const addEdge = () => {
    if (!cy) return;

    if (!sourceNode || !targetNode) {
      setError("Please specify both source and target vertices");
      return;
    }

    const source = cy.getElementById(sourceNode);
    const target = cy.getElementById(targetNode);

    if (source.length === 0) {
      setError(`Source vertex "${sourceNode}" not found`);
      return;
    }

    if (target.length === 0) {
      setError(`Target vertex "${targetNode}" not found`);
      return;
    }

    if (source.edgesTo(target).length > 0) {
      setError("Edge already exists");
      return;
    }

    cy.add({
      group: 'edges',
      data: {
        source: sourceNode,
        target: targetNode
      }
    });

    setSourceNode("");
    setTargetNode("");
    setError("");
    updateSubgraphColors();
  };

  const deleteSelected = () => {
    if (!cy) return;
    cy.elements(":selected").remove();
    updateSubgraphColors();
  };

  const fitGraph = () => {
    if (!cy) return;
    cy.fit();
  };

  useEffect(() => {
    if (!cyRef.current) return;

    const cyInstance = cytoscape({
      container: cyRef.current,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            label: "data(id)",
            "font-size": "12px",
            "text-valign": "center",
            "text-halign": "center",
            width: "40px",
            height: "40px",
            "border-width": 2,
            "border-color": "#666",
            "border-opacity": 0.5,
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 4,
            "border-color": "#000",
            "border-opacity": 1,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#666",
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "target-arrow-color": "#666",
            "arrow-scale": 1.5,
          },
        },
        {
          selector: "edge:selected",
          style: {
            width: 4,
            "line-color": "#000",
            "target-arrow-color": "#000",
          },
        },
      ],
      layout: {
        name: "preset",
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: true,
    });

    cyInstance.on("boxstart", () => {
      cyInstance.elements().unselect();
    });

    document.addEventListener("keydown", (evt) => {
      if (evt.key === "Delete" || evt.key === "Backspace") {
        evt.preventDefault();
        cyInstance.elements(":selected").remove();
        updateSubgraphColors();
      }
    });

    setCy(cyInstance);

    return () => {
      cyInstance.destroy();
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 max-w-6xl mx-auto px-2">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="h-[700px] relative">
            <div ref={cyRef} className="w-full h-full" />
            <Button 
              onClick={fitGraph}
              className="absolute top-4 right-4 bg-white"
              title="Fit Graph"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-4">Graph Controls</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Add Vertex</h3>
                <div className="flex gap-2">
                  <Input
                    value={nodeName}
                    onChange={(e) => setNodeName(e.target.value)}
                    placeholder={`v${nextNodeId}`}
                    className="flex-1"
                  />
                  <Button onClick={addNode}>Add</Button>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Add Edge</h3>
                <div className="space-y-2">
                  <Input
                    value={sourceNode}
                    onChange={(e) => setSourceNode(e.target.value)}
                    placeholder="Source vertex"
                  />
                  <Input
                    value={targetNode}
                    onChange={(e) => setTargetNode(e.target.value)}
                    placeholder="Target vertex"
                  />
                  <Button onClick={addEdge} className="w-full">Add Edge</Button>
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={deleteSelected}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-bold mb-2">Union-Find State</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm mb-1">Parent Array</h3>
                <pre className="bg-gray-50 p-2 rounded text-xs">
                  {JSON.stringify(ufState.parent, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-medium text-sm mb-1">Rank Array</h3>
                <pre className="bg-gray-50 p-2 rounded text-xs">
                  {JSON.stringify(ufState.rank, null, 2)}
                </pre>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-bold mb-2">Operations Log</h2>
            <pre className="bg-gray-50 p-2 rounded text-xs whitespace-pre-wrap">
              {lastOperation || "No operations performed yet"}
            </pre>
          </Card>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          About Union-Find
          <Info className="w-4 h-4 text-gray-400" />
        </h2>
        <div className="prose prose-sm max-w-none">
          <p>
            Union-Find is a powerful data structure used to track disjoint sets and their connections. It's particularly useful in:
          </p>
          <ul>
            <li>Finding connected components in graphs</li>
            <li>Detecting cycles in graphs</li>
            <li>Building minimum spanning trees</li>
          </ul>
          <p>
            The visualization above shows how Union-Find maintains sets using a tree structure, with each set having a representative element (root).
          </p>
        </div>
      </Card>
    </div>
  );
}