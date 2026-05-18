import { useMemo } from "react";
import type { Target } from "./types";

export function TargetConnectorOverlay({
  targets,
  arenaWidth,
  arenaHeight,
  visible,
  mousePos,
  deadzoneRadius = 30,
}: {
  targets: Target[];
  arenaWidth: number;
  arenaHeight: number;
  visible: boolean;
  mousePos?: { x: number; y: number } | null;
  deadzoneRadius?: number;
}) {
  const { connections, pointLabels } = useMemo(() => {
    if (!visible || arenaWidth <= 0 || targets.length === 0)
      return { connections: [], pointLabels: [] };

    // 1. เรียงเป้าหมายตาม ID (ลำดับการเกิด) โดยไม่มีจุด Start แล้ว
    const allPoints = [...targets].sort((a, b) => a.id - b.id);

    // 2. คำนวณเส้นเชื่อม (Connections)
    const cons = allPoints.slice(0, -1).map((from, i) => {
      const to = allPoints[i + 1];
      const x1 = (from.x / 100) * arenaWidth;
      const y1 = (from.y / 100) * arenaHeight;
      const x2 = (to.x / 100) * arenaWidth;
      const y2 = (to.y / 100) * arenaHeight;

      const distPx = Math.round(
        Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)),
      );
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;

      const angleDeg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
      const labelAngle =
        angleDeg > 90 || angleDeg < -90 ? angleDeg + 180 : angleDeg;

      return {
        x1,
        y1,
        x2,
        y2,
        mx,
        my,
        distPx,
        labelAngle,
        key: `path-${from.id}-${to.id}`,
      };
    });

    // 3. สร้างข้อมูลลำดับตัวเลข (Point Labels) เริ่มที่เลข 1
    const labels = allPoints.map((p, index) => ({
      x: (p.x / 100) * arenaWidth,
      y: (p.y / 100) * arenaHeight,
      text: `${index + 1}`, // รันเลข 1, 2, 3...
      key: `label-${p.id}`,
    }));

    return { connections: cons, pointLabels: labels };
  }, [targets, arenaWidth, arenaHeight, visible]);

  if (!visible && !mousePos) return null;
  if (!visible && mousePos) {
    // Show only the deadzone circle overlay when path is off but deadzone is on
    return (
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 100,
          overflow: "visible",
        }}
      >
        {mousePos && (
          <g>
            <circle
              cx={mousePos.x}
              cy={mousePos.y}
              r={deadzoneRadius}
              fill="none"
              stroke="rgba(255, 200, 0, 0.6)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <circle
              cx={mousePos.x}
              cy={mousePos.y}
              r={3}
              fill="rgba(255, 200, 0, 0.8)"
            />
          </g>
        )}
      </svg>
    );
  }

  if (!visible || pointLabels.length === 0) return null;

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 100,
        overflow: "visible",
      }}
    >
      {/* วาดเส้นประเชื่อมจุด */}
      {connections.map((c) => (
        <g key={c.key}>
          <line
            x1={c.x1}
            y1={c.y1}
            x2={c.x2}
            y2={c.y2}
            stroke="rgba(0, 255, 170, 0.4)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />
          {/* ป้ายบอกระยะทาง */}
          <g transform={`translate(${c.mx}, ${c.my}) rotate(${c.labelAngle})`}>
            <rect
              x="-20"
              y="-8"
              width="40"
              height="16"
              rx="4"
              fill="rgba(10,15,25,0.8)"
            />
            <text
              x="0"
              y="1"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#00ffaa"
              fontSize="9"
              fontWeight="bold"
            >
              {c.distPx}px
            </text>
          </g>
        </g>
      ))}

      {/* วาดลำดับหมายเลข 1-n บนเป้าหมาย */}
      {pointLabels.map((p) => (
        <g key={p.key} transform={`translate(${p.x}, ${p.y})`}>
          <circle r={10} fill="#00ffaa" style={{ opacity: 0.9 }} />
          <text
            y={1}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#000"
            fontSize="10"
            fontWeight="900"
            style={{ fontFamily: "monospace" }}
          >
            {p.text}
          </text>
        </g>
      ))}

      {/* วงกลม Deadzone 30px รอบเมาส์ */}
      {mousePos && (
        <g>
          <circle
            cx={mousePos.x}
            cy={mousePos.y}
            r={deadzoneRadius}
            fill="none"
            stroke="rgba(255, 200, 0, 0.6)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <circle
            cx={mousePos.x}
            cy={mousePos.y}
            r={3}
            fill="rgba(255, 200, 0, 0.8)"
          />
        </g>
      )}
    </svg>
  );
}
