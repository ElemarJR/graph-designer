import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Trash2, Info, ExternalLink, Search, Maximize2 } from "lucide-react";
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
    const operations: string[] = [];
    
    // Add nodes to UnionFind
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

    // Update colors
    const components = new Map<string, string[]>();
    cy.nodes().forEach(node => {
      const root = uf.find(node.id());
      if (!components.has(root)) {
        components.set(root, []);
      }
      components.get(root)?.push(node.id());
    });

    let colorIndex = 0;
    components.forEach((nodes, root) => {
      const color = COLORS[colorIndex % COLORS.length];
      operations.push(`Component ${root}: ${nodes.join(", ")} (${color})`);
      
      nodes.forEach(nodeId => {
        cy.$id(nodeId).style({
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

    const id = nodeName.trim() || `v${nextNodeId}`;
    
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      setError("Vertex name can only contain letters, numbers, underscores and hyphens");
      return;
    }

    if (cy.getElementById(id).length > 0) {
      setError(`Vertex "${id}" already exists`);
      return;
    }

    // Get viewport center
    const center = {
      x: cy.width() / 2,
      y: cy.height() / 2
    };

    // Calculate position in a circle around the center
    const radius = 100; // raio do círculo
    const nodeCount = cy.nodes().length;
    const angle = (2 * Math.PI * nodeCount) / (nodeCount + 1); // distribuir uniformemente

    const position = {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle)
    };

    cy.add({
      group: 'nodes',
      data: { id, color: COLORS[0] },
      position: position
    });

    setNodeName("");
    setNextNodeId(prev => prev + 1);
    setError("");
    updateSubgraphColors();
  };

  const addEdge = () => {
    if (!cy || selectedNodes.length !== 2) return;

    const [sourceNode, targetNode] = selectedNodes;
    
    // Prevenir self-loops
    if (sourceNode === targetNode) {
      setError("Self-loops are not allowed");
      return;
    }

    try {
      // Verificar aresta existente
      const existingEdges = cy.edges().filter(edge => {
        const s = edge.source().id();
        const t = edge.target().id();
        return (s === sourceNode && t === targetNode) || (s === targetNode && t === sourceNode);
      });

      if (existingEdges.length > 0) {
        setError("Edge already exists");
        return;
      }

      // Preparar dados da aresta
      const edgeData: cytoscape.ElementDefinition = {
        group: 'edges' as 'edges',
        data: { 
          source: sourceNode, 
          target: targetNode 
        }
      };

      // Adicionar aresta primeiro
      const newEdge = cy.add(edgeData);

      // Depois aplicar os estilos
      newEdge.style({
        'curve-style': 'bezier',
        'target-arrow-shape': 'none',
        'line-color': '#666',
        'width': 2
      });

      // Limpar seleção
      cy.elements().unselect();
      setSelectedNodes([]);
      setError("");
      
      // Atualizar cores
      updateSubgraphColors();

    } catch (error) {
      console.error("Error adding edge:", error);
      setError("Failed to add edge");
    }
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
            "target-arrow-color": "#666",
            "target-arrow-shape": "none"
          },
        },
        {
          selector: "edge:selected",
          style: {
            width: 4,
            "line-color": "#000",
            "target-arrow-color": "#000",
            "overlay-opacity": 0.2
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

  useEffect(() => {
    const handleKeyDown = (evt: KeyboardEvent) => {
      if ((evt.ctrlKey || evt.metaKey) && evt.key === 'z') {
        evt.preventDefault();
        // Implementar lógica de undo aqui
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cy]);

  return (
    <div className="h-screen flex flex-col p-4">
      <div className="flex-1 grid grid-cols-[1fr,300px] gap-4">
        <Card className="relative">
          <div ref={cyRef} className="w-full h-full" />
          <Button 
            onClick={fitGraph}
            className="absolute top-4 right-4 bg-black hover:bg-gray-800 text-white"
            size="sm"
            title="Fit Graph"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </Card>

        <div className="space-y-2 overflow-auto">
          <Card className="p-3">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Add Vertex</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={nodeName}
                    onChange={(e) => setNodeName(e.target.value)}
                    placeholder={`v${nextNodeId}`}
                    className="flex-1"
                  />
                  <Button onClick={addNode} size="sm">Add</Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Add Edge</Label>
                <div className="space-y-1 mt-1">
                  <Input
                    value={selectedNodes[0] || ""}
                    readOnly
                    placeholder="First vertex"
                    className="text-sm"
                  />
                  <Input
                    value={selectedNodes[1] || ""}
                    readOnly
                    placeholder="Second vertex"
                    className="text-sm"
                  />
                  <Button 
                    onClick={addEdge}
                    disabled={selectedNodes.length !== 2}
                    size="sm"
                    className="w-full"
                  >
                    Add Edge
                  </Button>
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={deleteSelected}
                size="sm"
                className="w-full"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete Selected
              </Button>
            </div>
          </Card>

          <Card className="p-3">
            <Label className="text-sm font-medium">Union-Find State</Label>
            <div className="space-y-2 mt-2">
              <pre className="bg-slate-50 p-2 rounded text-xs">
                {JSON.stringify(ufState.parent, null, 2)}
              </pre>
              <pre className="bg-slate-50 p-2 rounded text-xs">
                {JSON.stringify(ufState.rank, null, 2)}
              </pre>
            </div>
          </Card>

          <Card className="p-3">
            <Label className="text-sm font-medium">Operations Log</Label>
            <pre className="bg-slate-50 p-2 rounded text-xs whitespace-pre-wrap mt-2">
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