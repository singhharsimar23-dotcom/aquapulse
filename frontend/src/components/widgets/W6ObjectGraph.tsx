import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3-force';
import { ComputedDashboardModel } from '../../lib/snapshotLoader';
import { useStore } from '../../store/useStore';
import { checkInterference } from '@aquapulse/core';
import { Exempt } from '../Exempt';
import { Chip } from '../../design';

interface W6ObjectGraphProps {
  model: ComputedDashboardModel;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'farmer' | 'well' | 'feeder' | 'zone';
  farmerId?: string;
  x?: number;
  y?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'operates' | 'powers' | 'interference';
}

export const W6ObjectGraph: React.FC<W6ObjectGraphProps> = ({ model }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { selectedFarmerId, setSelectedFarmerId, assumptions } = useStore();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);

  useEffect(() => {
    // 1. Build nodes
    const graphNodes: GraphNode[] = [];
    const graphLinks: GraphLink[] = [];

    // Feeder Node
    graphNodes.push({
      id: 'feeder-1',
      label: 'Feeder Wardha-East',
      type: 'feeder',
    });

    // Zone Node
    graphNodes.push({
      id: 'zone-1',
      label: model.zone,
      type: 'zone',
    });

    // Well & Farmer nodes
    model.farmers.forEach((f) => {
      const farmerNodeId = `farmer-${f.id}`;
      const wellNodeId = `well-${f.id}`;

      graphNodes.push({
        id: farmerNodeId,
        label: `Farmer ${f.id}`,
        type: 'farmer',
        farmerId: f.id,
      });

      graphNodes.push({
        id: wellNodeId,
        label: `Well ${f.id}`,
        type: 'well',
        farmerId: f.id,
      });

      // Farmer operates Well
      graphLinks.push({
        source: farmerNodeId,
        target: wellNodeId,
        type: 'operates',
      });

      // Feeder powers Well
      graphLinks.push({
        source: 'feeder-1',
        target: wellNodeId,
        type: 'powers',
      });
    });

    // 2. Compute well interference arcs using @aquapulse/core checkInterference
    const wellObservations = model.farmers.map((f) => ({
      x: f.coords[0] * 111000 * Math.cos((f.coords[1] * Math.PI) / 180),
      y: f.coords[1] * 111000,
      Q_m3d: f.Q * f.U,
    }));

    const pairs = checkInterference(
      wellObservations,
      assumptions.T_m2d ?? 45.0,
      assumptions.S_storativity ?? 0.005,
      7,
      assumptions.s_thresh ?? 0.1
    );

    pairs.forEach((p) => {
      if (p.interferes) {
        const wellA = `well-${model.farmers[p.i].id}`;
        const wellB = `well-${model.farmers[p.j].id}`;
        graphLinks.push({
          source: wellA,
          target: wellB,
          type: 'interference',
        });
      }
    });

    // 3. Run d3 force simulation
    const width = 440;
    const height = 300;

    const simulation = d3
      .forceSimulation<GraphNode>(graphNodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(graphLinks)
          .id((d) => d.id)
          .distance((d) => (d.type === 'interference' ? 70 : 50))
      )
      .force('charge', d3.forceManyBody().strength(-140))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .stop();

    for (let i = 0; i < 120; ++i) simulation.tick();

    setNodes([...graphNodes]);
    setLinks([...graphLinks]);
  }, [model, assumptions]);

  const getNodeColor = (node: GraphNode) => {
    if (node.type === 'farmer') return '#3DDC97';
    if (node.type === 'well') return '#00E5FF';
    if (node.type === 'feeder') return '#FFB547';
    return '#A371F7';
  };

  return (
    <div className="w6-object-graph" role="region" aria-label="W6 Object Graph">
      <div className="graph-legend">
        <div className="legend-item">
          <span className="dot dot-farmer" />
          <span className="text-2">Farmer</span>
        </div>
        <div className="legend-item">
          <span className="dot dot-well" />
          <span className="text-2">Well</span>
        </div>
        <div className="legend-item">
          <span className="dot dot-feeder" />
          <span className="text-2">Feeder</span>
        </div>
        <div className="legend-item">
          <span className="line line-interference" />
          <span className="text-2">Interference Arc (§6.6)</span>
        </div>
      </div>

      <svg ref={svgRef} viewBox="0 0 440 300" className="graph-svg">
        {/* Links */}
        <g className="graph-links">
          {links.map((link, idx) => {
            const source = link.source as GraphNode;
            const target = link.target as GraphNode;
            if (source.x === undefined || target.x === undefined) return null;

            const isInterference = link.type === 'interference';
            return (
              <line
                key={`link-${idx}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={isInterference ? '#FF7B72' : '#30363D'}
                strokeWidth={isInterference ? 2.5 : 1.2}
                strokeDasharray={isInterference ? '4,4' : undefined}
                className={isInterference ? 'interference-link-pulse' : ''}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g className="graph-nodes">
          {nodes.map((node) => {
            if (node.x === undefined || node.y === undefined) return null;
            const isSelected = selectedFarmerId === node.farmerId;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className={`graph-node-group ${isSelected ? 'node-selected' : ''}`}
                onClick={() => node.farmerId && setSelectedFarmerId(isSelected ? null : node.farmerId)}
                style={{ cursor: node.farmerId ? 'pointer' : 'default' }}
              >
                <circle
                  r={node.type === 'zone' ? 14 : node.type === 'feeder' ? 12 : 9}
                  fill={getNodeColor(node)}
                  stroke={isSelected ? '#FFFFFF' : '#0D1117'}
                  strokeWidth={isSelected ? 3 : 1.5}
                />
                <text
                  y={18}
                  textAnchor="middle"
                  className="graph-node-label"
                  fill="#C9D1D9"
                  fontSize="10"
                >
                  <Exempt reason="id">{node.label}</Exempt>
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
