import { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { AlertCircle, Trash2 } from 'lucide-react'

import { UnionFind } from '@/utils/UnionFind'

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
  '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#1ABC9C'
]

function App() {
  const cyRef = useRef<HTMLDivElement>(null)
  const [cy, setCy] = useState<cytoscape.Core | null>(null)
  const [nodeName, setNodeName] = useState('')
  const [sourceNode, setSourceNode] = useState('')
  const [targetNode, setTargetNode] = useState('')
  const [nextNodeId, setNextNodeId] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!cyRef.current) return

    const cyInstance = cytoscape({
      container: cyRef.current,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'label': 'data(id)',
            'font-size': '12px',
            'text-valign': 'center',
            'text-halign': 'center',
            'width': '40px',
            'height': '40px',
            'border-width': 2,
            'border-color': '#666',
            'border-opacity': 0.5
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#000',
            'border-opacity': 1
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#666',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#666',
            'arrow-scale': 1.5
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'width': 4,
            'line-color': '#000',
            'target-arrow-color': '#000'
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: false,
        randomize: true,
        nodeDimensionsIncludeLabels: true
      }
    })

    // Enable box selection
    cyInstance.on('boxstart', () => {
      cyInstance.elements().unselect()
    })

    // Delete selected elements on Delete key press
    document.addEventListener('keydown', (evt) => {
      if (evt.key === 'Delete' || evt.key === 'Backspace') {
        evt.preventDefault()
        cyInstance.elements(':selected').remove()
        updateSubgraphColors()
      }
    })

    setCy(cyInstance)

    return () => {
      cyInstance.destroy()
    }
  }, [])

  const updateSubgraphColors = () => {
    if (!cy) return

    const uf = new UnionFind()
    
    // First pass: union all connected nodes
    cy.edges().forEach(edge => {
      const source = edge.source().id()
      const target = edge.target().id()
      uf.union(source, target)
    })

    // Second pass: assign colors to subgraphs
    const subgraphs: { [key: string]: string[] } = {}
    cy.nodes().forEach(node => {
      const root = uf.find(node.id())
      if (!subgraphs[root]) {
        subgraphs[root] = []
      }
      subgraphs[root].push(node.id())
    })

    // Assign colors to each subgraph
    Object.values(subgraphs).forEach((nodes, index) => {
      const color = COLORS[index % COLORS.length]
      nodes.forEach(nodeId => {
        cy.getElementById(nodeId).style('background-color', color)
      })
    })
  }

  const addNode = () => {
    if (!cy) return
    
    const id = nodeName || `v${nextNodeId}`
    
    if (cy.getElementById(id).length > 0) {
      setError('Um vértice com este nome já existe')
      return
    }

    cy.add({
      group: 'nodes',
      data: { 
        id,
        color: COLORS[0]
      },
      position: { 
        x: Math.random() * cyRef.current!.clientWidth * 0.8, 
        y: Math.random() * cyRef.current!.clientHeight * 0.8 
      }
    })

    setNodeName('')
    setNextNodeId(prev => prev + 1)
    setError('')
    updateSubgraphColors()
  }

  const addEdge = () => {
    if (!cy || !sourceNode || !targetNode) return

    if (sourceNode === targetNode) {
      setError('Não é possível criar uma aresta para o mesmo vértice')
      return
    }

    const source = cy.getElementById(sourceNode)
    const target = cy.getElementById(targetNode)

    if (source.length === 0 || target.length === 0) {
      setError('Vértice de origem ou destino não existe')
      return
    }

    if (cy.getElementById(`${sourceNode}-${targetNode}`).length > 0) {
      setError('Esta aresta já existe')
      return
    }

    cy.add({
      group: 'edges',
      data: {
        id: `${sourceNode}-${targetNode}`,
        source: sourceNode,
        target: targetNode
      }
    })

    setSourceNode('')
    setTargetNode('')
    setError('')
    updateSubgraphColors()
  }

  const deleteSelected = () => {
    if (!cy) return
    cy.elements(':selected').remove()
    updateSubgraphColors()
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col gap-4">
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                Adicionar Vértice
              </h2>
              <div className="flex gap-2">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="nodeName">Nome do Vértice</Label>
                  <Input
                    id="nodeName"
                    value={nodeName}
                    onChange={(e) => setNodeName(e.target.value)}
                    placeholder={`v${nextNodeId}`}
                    className="flex-1"
                  />
                </div>
                <Button onClick={addNode} className="mt-6">Adicionar</Button>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold">Adicionar Aresta</h2>
              <div className="flex gap-2">
                <div className="space-y-1">
                  <Label htmlFor="sourceNode">Origem</Label>
                  <Input
                    id="sourceNode"
                    value={sourceNode}
                    onChange={(e) => setSourceNode(e.target.value)}
                    placeholder="Vértice origem"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="targetNode">Destino</Label>
                  <Input
                    id="targetNode"
                    value={targetNode}
                    onChange={(e) => setTargetNode(e.target.value)}
                    placeholder="Vértice destino"
                  />
                </div>
                <Button onClick={addEdge} className="mt-6">Adicionar</Button>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </Card>

        <div className="flex justify-end gap-2">
          <Button 
            variant="destructive" 
            onClick={deleteSelected}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Excluir Selecionados
          </Button>
        </div>

        <Card>
          <div 
            ref={cyRef} 
            className="w-full h-[600px] rounded-lg"
          />
        </Card>

        <div className="text-sm text-gray-500">
          <p>Dicas:</p>
          <ul className="list-disc list-inside">
            <li>Clique e arraste para mover vértices</li>
            <li>Clique para selecionar elementos</li>
            <li>Pressione Delete para excluir elementos selecionados</li>
            <li>Clique e arraste no espaço vazio para selecionar múltiplos elementos</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default App
