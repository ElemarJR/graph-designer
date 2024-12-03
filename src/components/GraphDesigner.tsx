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
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
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

    // Get all components and their roots
    const components = new Map<string, string[]>();
    cy.nodes().forEach(node => {
      const root = uf.find(node.id());
      if (!components.has(root)) {
        components.set(root, []);
      }
      components.get(root)?.push(node.id());
    });

    // Assign colors to components and highlight roots
    let colorIndex = 0;
    components.forEach((nodes, root) => {
      const color = COLORS[colorIndex % COLORS.length];
      operations.push(`Component ${root}: ${nodes.join(", ")} (${color})`);
      nodes.forEach(nodeId => {
        const node = cy.getElementById(nodeId);
        node.style({
          'background-color': color,
          'border-width': nodeId === root ? 6 : 2,
          'border-color': nodeId === root ? '#000' : '#666',
          'border-style': nodeId === root ? 'double' : 'solid'
        });
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

  const addEdge = (directed: boolean) => {
    if (!cy || selectedNodes.length !== 2) return;

    const [sourceNode, targetNode] = selectedNodes;
    const source = cy.getElementById(sourceNode);
    const target = cy.getElementById(targetNode);

    // Check if edge already exists in either direction for undirected graphs
    const edgeExists = directed 
      ? source.edgesTo(target).length > 0
      : (source.edgesTo(target).length > 0 || target.edgesTo(source).length > 0);

    if (edgeExists) {
      setError("Edge already exists");
      return;
    }

    // Calculate edge position to avoid overlapping
    const existingEdges = cy.edges();
    let offset = 0;
    existingEdges.forEach(edge => {
      if ((edge.source().id() === sourceNode && edge.target().id() === targetNode) ||
          (!directed && edge.source().id() === targetNode && edge.target().id() === sourceNode)) {
        offset += 20;
      }
    });

    if (!directed) {
      // For undirected edges, add two directed edges
      cy.add([
        {
          group: 'edges',
          data: { source: sourceNode, target: targetNode },
          style: {
            'curve-style': 'bezier',
            'control-point-distance': offset
          }
        },
        {
          group: 'edges',
          data: { source: targetNode, target: sourceNode },
          style: {
            'curve-style': 'bezier',
            'control-point-distance': -offset
          }
        }
      ]);
    } else {
      cy.add({
        group: 'edges',
        data: { source: sourceNode, target: targetNode },
        style: {
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'control-point-distance': offset
        }
      });
    }

    setSelectedNodes([]);
    setError("");
    updateSubgraphColors();
  };

  const deleteSelected = () => {
    if (!cy) return;
    cy.elements(":selected").remove();
    updateSubgraphColors();
    setSelectedNodes([]);
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
            "border-width": 6,
            "border-color": "#000",
            "border-opacity": 1,
            "background-opacity": 0.8,
            "overlay-opacity": 0.2,
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#666",
            "curve-style": "bezier",
          },
        },
        {
          selector: "edge:selected",
          style: {
            width: 4,
            "line-color": "#000",
            "target-arrow-color": "#000",
            "overlay-opacity": 0.2,
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

    cyInstance.on("select", "node", (evt) => {
      const nodeId = evt.target.id();
      setSelectedNodes(prev => {
        if (prev.includes(nodeId)) return prev;
        return [...prev.slice(-1), nodeId].slice(0, 2);
      });
    });

    cyInstance.on("unselect", "node", (evt) => {
      const nodeId = evt.target.id();
      setSelectedNodes(prev => prev.filter(id => id !== nodeId));
    });

    cyInstance.on("boxstart", () => {
      cyInstance.elements().unselect();
      setSelectedNodes([]);
    });

    document.addEventListener("keydown", (evt) => {
      if (evt.key === "Delete" || evt.key === "Backspace") {
        evt.preventDefault();
        cyInstance.elements(":selected").remove();
        updateSubgraphColors();
        setSelectedNodes([]);
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
                    value={selectedNodes[0] || ""}
                    readOnly
                    placeholder="First vertex (select on graph)"
                  />
                  <Input
                    value={selectedNodes[1] || ""}
                    readOnly
                    placeholder="Second vertex (select on graph)"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      onClick={() => addEdge(true)}
                      disabled={selectedNodes.length !== 2}
                    >
                      Add Directed Edge
                    </Button>
                    <Button 
                      onClick={() => addEdge(false)}
                      disabled={selectedNodes.length !== 2}
                    >
                      Add Undirected Edge
                    </Button>
                  </div>
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
    </div>
  );
}