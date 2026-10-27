// Pure tree layout for the org chart. All coordinates are in em.
export const NODE_W = 15;
export const NODE_H = 4.9;
const GAP_X = 1.4;
const GAP_Y = 3.2;
const INDENT = 1.8;
const GAP_STACK = 0.8;

const elbow = (x1, y1, x2, y2) => {
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const r = Math.min(1, Math.abs(dx) / 2, (y2 - y1) / 2);
  const s = dx < 0 ? -1 : 1;
  return `M${x1} ${y1} V${my - r} Q${x1} ${my} ${x1 + s * r} ${my} H${x2 - s * r} Q${x2} ${my} ${x2} ${my + r} V${y2}`;
};
const hang = (rx, y1, x2, cy) => {
  const r = Math.min(1, (cy - y1) / 2, Math.max(0.1, x2 - rx));
  return `M${rx} ${y1} V${cy - r} Q${rx} ${cy} ${rx + r} ${cy} H${x2}`;
};

/**
 * roots: [{id}], kids(id) → [{id}], isOpen(id) → bool
 * returns { nodes:[{id,x,y,depth,parentId}], edges:[{id,d}], width, height }
 */
export function layoutTree(roots, kids, isOpen) {
  const measure = new Map();
  const shown = (id) => (isOpen(id) ? kids(id) : []);
  const isStack = (id) => {
    const k = shown(id);
    return k.length > 0 && k.every((c) => kids(c.id).length === 0);
  };

  function size(id) {
    const k = shown(id);
    let m;
    if (!k.length) m = { w: NODE_W, h: NODE_H };
    else if (isStack(id)) m = { w: INDENT + NODE_W, h: NODE_H + GAP_STACK + k.length * (NODE_H + GAP_STACK) - GAP_STACK };
    else {
      const sizes = k.map((c) => size(c.id));
      m = { w: Math.max(NODE_W, sizes.reduce((s, c) => s + c.w, 0) + GAP_X * (k.length - 1)), h: NODE_H + GAP_Y + Math.max(...sizes.map((c) => c.h)) };
    }
    measure.set(id, m);
    return m;
  }

  const nodes = [];
  const edges = [];

  function place(id, x0, y, depth, parentId) {
    const k = shown(id);
    const m = measure.get(id);
    if (!k.length) {
      nodes.push({ id, x: x0 + (m.w - NODE_W) / 2, y, depth, parentId });
      return;
    }
    if (isStack(id)) {
      nodes.push({ id, x: x0, y, depth, parentId });
      const rx = x0 + INDENT / 2;
      k.forEach((c, i) => {
        const cy = y + NODE_H + GAP_STACK + i * (NODE_H + GAP_STACK);
        nodes.push({ id: c.id, x: x0 + INDENT, y: cy, depth: depth + 1, parentId: id });
        edges.push({ id: `${id}>${c.id}`, d: hang(rx, y + NODE_H, x0 + INDENT, cy + NODE_H / 2) });
      });
      return;
    }
    const nx = x0 + (m.w - NODE_W) / 2;
    nodes.push({ id, x: nx, y, depth, parentId });
    let cx = x0;
    k.forEach((c) => {
      const cm = measure.get(c.id);
      const childX = cx + (cm.w - NODE_W) / 2;
      edges.push({ id: `${id}>${c.id}`, d: elbow(nx + NODE_W / 2, y + NODE_H, childX + NODE_W / 2, y + NODE_H + GAP_Y) });
      place(c.id, cx, y + NODE_H + GAP_Y, depth + 1, id);
      cx += cm.w + GAP_X;
    });
  }

  let cursor = 0;
  roots.forEach((r) => {
    const m = size(r.id);
    place(r.id, cursor, 0, 0, null);
    cursor += m.w + GAP_X * 2;
  });

  const width = Math.max(NODE_W, ...nodes.map((n) => n.x + NODE_W)) + 2;
  const height = Math.max(NODE_H, ...nodes.map((n) => n.y + NODE_H)) + 3;
  return { nodes, edges, width, height };
}
