---
layout: default
title: Plugins
nav_order: 4
---

# Plugin System

QFChart supports a flexible plugin system that allows you to add custom interactive tools and extensions to the chart. Plugins can be used to implement drawing tools, chart patterns, or additional UI controls.

## Registering a Plugin

To use a plugin, create an instance and register it with the chart:

```javascript
import { QFChart, MeasureTool, LineTool } from "qfchart";

const chart = new QFChart(container, options);
chart.registerPlugin(new MeasureTool());
chart.registerPlugin(new LineTool());
```

Once registered, the plugin adds its button/icon to the chart's toolbar automatically.

## Tool Groups

Multiple related plugins can be grouped under a single toolbar button using `ToolGroup`. Clicking the group button opens a dropdown menu to select between the tools.

```javascript
import { ToolGroup, FibonacciTool, FibonacciChannelTool, FibTrendExtensionTool } from "qfchart";

const fibGroup = new ToolGroup({
  name: "Fibonacci Tools",
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 6h16M4 12h16M4 18h16"/>
  </svg>`,
});
fibGroup.add(new FibonacciTool());
fibGroup.add(new FibonacciChannelTool());
fibGroup.add(new FibTrendExtensionTool());
chart.registerPlugin(fibGroup);
```

When a tool from the group is selected, the group's toolbar icon updates to show the active sub-tool.

## Built-in Plugins

### Drawing Tools

| Plugin | Clicks | Description |
|--------|--------|-------------|
| `MeasureTool` | 2 | Measure price difference, percentage, and bar count between two points |
| `LineTool` | 2 | Draw trend lines with draggable endpoints |

### Fibonacci Tools

| Plugin | Clicks | Description |
|--------|--------|-------------|
| `FibonacciTool` | 2 | Fibonacci retracement levels (0, 0.236, 0.382, 0.5, 0.618, 0.786, 1) |
| `FibonacciChannelTool` | 3 | Parallel channel lines at Fibonacci ratios. Click 1-2 set the baseline, click 3 sets channel width |
| `FibSpeedResistanceFanTool` | 2 | Diagonal fan rays at Fibonacci ratios of the price/time rectangle |
| `FibTrendExtensionTool` | 3 | Projects Fibonacci extension levels (up to 2.618) from a trend + retracement |

### Chart Pattern Tools

| Plugin | Clicks | Description |
|--------|--------|-------------|
| `XABCDPatternTool` | 5 | Harmonic XABCD pattern (Gartley, Butterfly, Bat, Crab) with Fib ratios |
| `ABCDPatternTool` | 4 | Simple ABCD harmonic pattern with BC/AB and CD/BC ratios |
| `CypherPatternTool` | 5 | Cypher harmonic pattern with XC/XA ratio |
| `HeadAndShouldersTool` | 7 | Head & Shoulders with neckline, shoulder/head fills, and LS/H/RS labels |
| `TrianglePatternTool` | 5 | Triangle with upper/lower trendlines (extended) and zigzag fill |
| `ThreeDrivesPatternTool` | 7 | Three Drives pattern with drive-to-drive ratio annotations |

### Registration Example (All Tools)

```javascript
// Individual tools
chart.registerPlugin(new MeasureTool());
chart.registerPlugin(new LineTool());

// Fibonacci group
const fibGroup = new ToolGroup({ name: "Fibonacci Tools", icon: "..." });
fibGroup.add(new FibonacciTool());
fibGroup.add(new FibonacciChannelTool());
fibGroup.add(new FibSpeedResistanceFanTool());
fibGroup.add(new FibTrendExtensionTool());
chart.registerPlugin(fibGroup);

// Pattern group
const patternGroup = new ToolGroup({ name: "Patterns", icon: "..." });
patternGroup.add(new XABCDPatternTool());
patternGroup.add(new ABCDPatternTool());
patternGroup.add(new CypherPatternTool());
patternGroup.add(new HeadAndShouldersTool());
patternGroup.add(new TrianglePatternTool());
patternGroup.add(new ThreeDrivesPatternTool());
chart.registerPlugin(patternGroup);
```

## Point Snapping (Ctrl / Cmd)

All drawing tools support **snap-to-candle**. Hold **Ctrl** (or **Cmd** on Mac) while clicking or moving the mouse during any drawing tool to snap the cursor to the nearest candle's closest OHLC value (open, high, low, or close).

A visual snap indicator (small blue circle) appears at the snapped position while the modifier key is held, providing visual feedback before you click.

## Creating Custom Plugins

You can create custom plugins by extending the `AbstractPlugin` class. Each plugin lives in its own folder with a tool class, an optional drawing renderer, and a barrel `index.ts`.

### Plugin Folder Structure

```
plugins/
└── MyCustomTool/
    ├── MyCustomTool.ts           # Interaction logic (clicks, preview)
    ├── MyCustomDrawingRenderer.ts # Permanent chart rendering
    └── index.ts                   # Barrel export
```

### The AbstractPlugin Base Class

```typescript
import { AbstractPlugin } from "qfchart";

export class MyCustomTool extends AbstractPlugin {
  constructor() {
    super({
      id: "my-tool",
      name: "My Tool",
      icon: "<svg>...</svg>",
    });
  }

  protected onInit(): void {
    // Register drawing renderer (if this tool creates persistent drawings)
    this.context.registerDrawingRenderer(new MyCustomDrawingRenderer());
  }

  protected onActivate(): void {
    // Bind ZRender click/mousemove listeners
    const zr = this.context.getChart().getZr();
    zr.on("click", this.onClick);
    zr.on("mousemove", this.onMouseMove);
  }

  protected onDeactivate(): void {
    // Unbind listeners, clean up preview graphics
    const zr = this.context.getChart().getZr();
    zr.off("click", this.onClick);
    zr.off("mousemove", this.onMouseMove);
  }

  private onClick = (params: any) => {
    // Use this.getPoint(params) instead of [params.offsetX, params.offsetY]
    // to get snap-to-candle support automatically
    const [x, y] = this.getPoint(params);
    // ... handle click
  };

  private onMouseMove = (params: any) => {
    const [x, y] = this.getPoint(params);
    // ... update preview graphic
  };
}
```

### Key `AbstractPlugin` Helpers

| Method / Property | Description |
|-------------------|-------------|
| `this.context` | The `ChartContext` — access to chart, data, events, coordinate conversion |
| `this.chart` | Shortcut to `this.context.getChart()` (ECharts instance) |
| `this.marketData` | Shortcut to `this.context.getMarketData()` |
| `this.getPoint(params)` | Returns `[x, y]` with automatic snap-to-candle when Ctrl/Cmd is held |
| `this.on(event, handler)` | Register event listener (auto-cleaned on destroy) |
| `this.off(event, handler)` | Remove event listener |

### Drawing Renderer

To create persistent drawings that survive chart re-renders, implement the `DrawingRenderer` interface:

```typescript
import { DrawingRenderer, DrawingRenderContext } from "qfchart";

export class MyCustomDrawingRenderer implements DrawingRenderer {
  type = "my_custom_type"; // Matches the type in addDrawing()

  render(ctx: DrawingRenderContext): any {
    const { drawing, pixelPoints, isSelected } = ctx;
    // pixelPoints: array of [x, y] pixel coordinates for each point

    return {
      type: "group",
      children: [
        // Lines, circles, polygons, text — ECharts graphic elements
        {
          type: "line",
          name: "line", // 'line' name enables drag-to-move
          shape: { x1: pixelPoints[0][0], y1: pixelPoints[0][1], x2: pixelPoints[1][0], y2: pixelPoints[1][1] },
          style: { stroke: "#3b82f6", lineWidth: 2 },
        },
        // Control points must use name 'point-N' (point-0, point-1, etc.)
        {
          type: "circle",
          name: "point-0",
          shape: { cx: pixelPoints[0][0], cy: pixelPoints[0][1], r: 4 },
          style: { fill: "#fff", stroke: "#3b82f6", lineWidth: 1, opacity: isSelected ? 1 : 0 },
        },
      ],
    };
  }
}
```

**Important naming conventions:**
- Elements named `'line'` can be dragged to move the entire drawing
- Elements named `'point-N'` (where N is 0, 1, 2...) are control points that can be individually dragged
- Elements with `silent: true` don't respond to mouse events

### Saving a Drawing

After the user finishes placing points, convert pixel coordinates to data coordinates and call `addDrawing`:

```typescript
private saveDrawing() {
  const start = this.context.coordinateConversion.pixelToData({ x: x1, y: y1 });
  const end = this.context.coordinateConversion.pixelToData({ x: x2, y: y2 });

  if (start && end) {
    this.context.addDrawing({
      id: `my-drawing-${Date.now()}`,
      type: "my_custom_type", // Must match renderer's type
      points: [start, end],
      paneIndex: start.paneIndex || 0,
      style: { color: "#3b82f6", lineWidth: 2 },
    });
  }
}
```

## The Chart Context

The `ChartContext` provides access to the chart instance, data, and utilities. It is available in plugins via `this.context`.

```typescript
interface ChartContext {
  // Core Access
  getChart(): echarts.ECharts;
  getMarketData(): OHLCV[];
  getTimeToIndex(): Map<number, number>;
  getOptions(): QFChartOptions;

  // Event Bus
  events: EventBus;

  // Coordinate Conversion
  coordinateConversion: {
    pixelToData: (point: { x; y }) => { timeIndex; value; paneIndex } | null;
    dataToPixel: (point: { timeIndex; value; paneIndex? }) => { x; y } | null;
  };

  // Interaction Control
  disableTools(): void;
  lockChart(): void;
  unlockChart(): void;
  setZoom(start: number, end: number): void;

  // Drawing Management
  addDrawing(drawing: DrawingElement): void;
  removeDrawing(id: string): void;
  getDrawing(id: string): DrawingElement | undefined;
  updateDrawing(drawing: DrawingElement): void;

  // Drawing Renderer Registration
  registerDrawingRenderer(renderer: DrawingRenderer): void;

  // Snap to nearest candle OHLC
  snapToCandle(point: { x; y }): { x; y };
}
```

## Event Bus

The chart exposes an Event Bus via `context.events` for communication between plugins and the chart core.

### Standard Events

- `mouse:down`, `mouse:move`, `mouse:up`, `mouse:click`
- `chart:resize`, `chart:dataZoom`, `chart:updated`
- `plugin:activated`, `plugin:deactivated`

### Drawing Events

When using the native drawing system (via `addDrawing`), the chart emits granular events for interactions:

**Shape Events** (triggered on elements named `'line'`):
- `drawing:hover`, `drawing:mouseout`, `drawing:mousedown`, `drawing:click`

**Control Point Events** (triggered on elements named `'point-N'`):
- `drawing:point:hover`, `drawing:point:mouseout`, `drawing:point:mousedown`, `drawing:point:click`

**Selection Events:**
- `drawing:selected` — emitted when a drawing is clicked
- `drawing:deselected` — emitted when clicking background while a drawing was selected
- `drawing:deleted` — emitted when a drawing is removed

All drawing events carry a payload:

```typescript
{
  id: string,          // The drawing's ID
  type?: string,       // Drawing type (e.g., "line", "fibonacci")
  pointIndex?: number  // For point events: 0, 1, 2, etc.
}
```
