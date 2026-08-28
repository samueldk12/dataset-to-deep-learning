import React from 'react';

interface BezierEdgeProps {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  fromPortType?: string;
  isSelected?: boolean;
  isActive?: boolean;
  onDelete?: (id: string) => void;
}

export const BezierEdge: React.FC<BezierEdgeProps> = ({
  id,
  fromX,
  fromY,
  toX,
  toY,
  fromPortType = 'any',
  isSelected = false,
  isActive = false,
  onDelete,
}) => {
  // Compute smooth horizontal cubic bezier
  const dx = Math.abs(toX - fromX) * 0.5;
  const c1x = fromX + Math.max(40, dx);
  const c1y = fromY;
  const c2x = toX - Math.max(40, dx);
  const c2y = toY;

  const pathData = `M ${fromX} ${fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toX} ${toY}`;

  // Midpoint for delete button
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  // Color by port type
  let strokeColor = '#3b82f6'; // default blue
  if (fromPortType === 'image') strokeColor = '#10b981'; // emerald
  else if (fromPortType === 'annotations') strokeColor = '#6366f1'; // indigo
  else if (fromPortType === 'text') strokeColor = '#a855f7'; // purple
  else if (fromPortType === 'json') strokeColor = '#f59e0b'; // amber
  else if (fromPortType === 'audio') strokeColor = '#06b6d4'; // cyan

  return (
    <g className="group cursor-pointer">
      {/* Background thicker hit-area path */}
      <path
        d={pathData}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        className="cursor-pointer"
      />

      {/* Main Bezier Wire */}
      <path
        d={pathData}
        fill="none"
        stroke={isSelected ? '#38bdf8' : strokeColor}
        strokeWidth={isActive ? 3.5 : isSelected ? 3 : 2}
        strokeDasharray={isActive ? '6,6' : undefined}
        className={`transition-colors ${
          isActive ? 'animate-[dash_1s_linear_infinite]' : ''
        }`}
        style={{
          filter: isSelected || isActive ? `drop-shadow(0 0 6px ${strokeColor})` : undefined,
        }}
      />

      {/* Edge endpoints dots */}
      <circle cx={fromX} cy={fromY} r={3.5} fill={strokeColor} />
      <circle cx={toX} cy={toY} r={3.5} fill={strokeColor} />

      {/* On-hover Delete Button at wire midpoint */}
      {onDelete && (
        <g
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          transform={`translate(${midX}, ${midY})`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
        >
          <circle cx={0} cy={0} r={9} fill="#ef4444" className="hover:scale-110 transition-transform shadow-md" />
          <text
            x={0}
            y={3.5}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="10"
            fontWeight="bold"
            className="select-none pointer-events-none"
          >
            ×
          </text>
        </g>
      )}
    </g>
  );
};
