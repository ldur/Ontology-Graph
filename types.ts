export interface OntologyNode {
  id: string;
  label: string;
  type: 'class' | 'instance' | 'literal' | 'concept';
  description?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface OntologyEdge {
  id: string;
  source: string | OntologyNode; // d3 modifies this to be the node object
  target: string | OntologyNode; // d3 modifies this to be the node object
  label: string;
}

export interface OntologyGraph {
  nodes: OntologyNode[];
  edges: OntologyEdge[];
}

export interface SavedOntology {
  id: string;
  name: string;
  timestamp: number;
  data: OntologyGraph;
}