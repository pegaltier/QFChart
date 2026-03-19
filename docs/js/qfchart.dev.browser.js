
/* 
 * Copyright (C) 2025 Alaa-eddine KADDOURI
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('echarts')) :
    typeof define === 'function' && define.amd ? define(['exports', 'echarts'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.QFChart = {}, global.echarts));
})(this, (function (exports, echarts) { 'use strict';

    function _interopNamespaceDefault(e) {
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n.default = e;
        return Object.freeze(n);
    }

    var echarts__namespace = /*#__PURE__*/_interopNamespaceDefault(echarts);

    var __defProp$M = Object.defineProperty;
    var __defNormalProp$M = (obj, key, value) => key in obj ? __defProp$M(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$M = (obj, key, value) => {
      __defNormalProp$M(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class Indicator {
      constructor(id, plots, paneIndex, options = {}) {
        __publicField$M(this, "id");
        __publicField$M(this, "plots");
        __publicField$M(this, "paneIndex");
        __publicField$M(this, "height");
        __publicField$M(this, "collapsed");
        __publicField$M(this, "titleColor");
        __publicField$M(this, "controls");
        this.id = id;
        this.plots = plots;
        this.paneIndex = paneIndex;
        this.height = options.height;
        this.collapsed = options.collapsed || false;
        this.titleColor = options.titleColor;
        this.controls = options.controls;
      }
      toggleCollapse() {
        this.collapsed = !this.collapsed;
      }
      isVisible() {
        return !this.collapsed;
      }
      /**
       * Update indicator data incrementally by merging new points
       *
       * @param plots - New plots data to merge (same structure as constructor)
       *
       * @remarks
       * This method merges new indicator data with existing data by timestamp.
       * - New timestamps are added
       * - Existing timestamps are updated with new values
       * - All data is automatically sorted by time after merge
       *
       * **Important**: This method only updates the indicator's internal data structure.
       * To see the changes reflected in the chart, you MUST call `chart.updateData()`
       * after updating indicator data.
       *
       * **Usage Pattern**:
       * ```typescript
       * // 1. Update indicator data first
       * indicator.updateData({
       *   macd: { data: [{ time: 1234567890, value: 150 }], options: { style: 'line', color: '#2962FF' } }
       * });
       *
       * // 2. Then update chart data to trigger re-render
       * chart.updateData([
       *   { time: 1234567890, open: 100, high: 105, low: 99, close: 103, volume: 1000 }
       * ]);
       * ```
       *
       * **Note**: If you update indicator data without corresponding market data changes,
       * this typically indicates a recalculation scenario. In normal workflows, indicator
       * values are derived from market data, so indicator updates should correspond to
       * new or modified market bars.
       */
      updateData(plots) {
        Object.keys(plots).forEach((plotName) => {
          if (!this.plots[plotName]) {
            this.plots[plotName] = plots[plotName];
          } else {
            const existingPlot = this.plots[plotName];
            const newPlot = plots[plotName];
            if (!existingPlot.data)
              return;
            if (newPlot.options) {
              existingPlot.options = { ...existingPlot.options, ...newPlot.options };
            }
            const existingTimeMap = /* @__PURE__ */ new Map();
            existingPlot.data?.forEach((point) => {
              existingTimeMap.set(point.time, point);
            });
            newPlot.data?.forEach((point) => {
              existingTimeMap.set(point.time, point);
            });
            existingPlot.data = Array.from(existingTimeMap.values()).sort((a, b) => a.time - b.time);
          }
        });
      }
    }

    class AxisUtils {
      // Create min/max functions that apply padding
      static createMinFunction(paddingPercent) {
        return (value) => {
          const range = value.max - value.min;
          const padding = range * (paddingPercent / 100);
          return value.min - padding;
        };
      }
      static createMaxFunction(paddingPercent) {
        return (value) => {
          const range = value.max - value.min;
          const padding = range * (paddingPercent / 100);
          return value.max + padding;
        };
      }
      /**
       * Auto-detect the appropriate number of decimal places for price display
       * based on actual market data values.
       *
       * For prices like BTCUSDC (~97000), returns 2.
       * For prices like PUMPUSDT (~0.002), returns 6.
       *
       * The algorithm examines a representative close price and determines
       * how many decimals are needed to show meaningful precision.
       */
      static autoDetectDecimals(marketData) {
        if (!marketData || marketData.length === 0)
          return 2;
        const price = marketData[marketData.length - 1].close;
        if (price === 0 || !isFinite(price) || isNaN(price))
          return 2;
        const absPrice = Math.abs(price);
        if (absPrice >= 1)
          return 2;
        const leadingZeros = Math.ceil(-Math.log10(absPrice));
        return Math.min(leadingZeros + 4, 10);
      }
      /**
       * Format a numeric value with the given number of decimal places.
       * This is the centralized formatting function used by Y-axis labels,
       * markLine labels, and countdown labels.
       */
      static formatValue(value, decimals) {
        if (typeof value === "number") {
          return value.toFixed(decimals);
        }
        return String(value);
      }
    }

    class LayoutManager {
      static calculate(containerHeight, indicators, options, isMainCollapsed = false, maximizedPaneId = null, marketData, mainHeightOverride) {
        let pixelToPercent = 0;
        if (containerHeight > 0) {
          pixelToPercent = 1 / containerHeight * 100;
        }
        const yAxisPaddingPercent = options.yAxisPadding !== void 0 ? options.yAxisPadding : 5;
        const gridShow = options.grid?.show === true;
        const gridLineColor = options.grid?.lineColor ?? "#334155";
        const gridLineOpacity = options.grid?.lineOpacity ?? 0.5;
        const gridBorderColor = options.grid?.borderColor ?? "#334155";
        const gridBorderShow = options.grid?.borderShow === true;
        const layoutLeft = options.layout?.left ?? "10%";
        const layoutRight = options.layout?.right ?? "10%";
        const separatePaneIndices = Array.from(indicators.values()).map((ind) => ind.paneIndex).filter((idx) => idx > 0).sort((a, b) => a - b).filter((value, index, self) => self.indexOf(value) === index);
        const hasSeparatePane = separatePaneIndices.length > 0;
        const dzVisible = options.dataZoom?.visible ?? true;
        const dzPosition = options.dataZoom?.position ?? "top";
        const dzHeight = options.dataZoom?.height ?? 6;
        const dzStart = options.dataZoom?.start ?? 0;
        const dzEnd = options.dataZoom?.end ?? 100;
        let mainPaneTop = 8;
        let chartAreaBottom = 92;
        let maximizeTargetIndex = -1;
        if (maximizedPaneId) {
          if (maximizedPaneId === "main") {
            maximizeTargetIndex = 0;
          } else {
            const ind = indicators.get(maximizedPaneId);
            if (ind) {
              maximizeTargetIndex = ind.paneIndex;
            }
          }
        }
        if (maximizeTargetIndex !== -1) {
          const grid2 = [];
          const xAxis2 = [];
          const yAxis2 = [];
          const dataZoom2 = [];
          const dzStart2 = options.dataZoom?.start ?? 50;
          const dzEnd2 = options.dataZoom?.end ?? 100;
          const zoomOnTouch2 = options.dataZoom?.zoomOnTouch ?? true;
          if (zoomOnTouch2) {
            dataZoom2.push({ type: "inside", xAxisIndex: "all", start: dzStart2, end: dzEnd2, filterMode: "weakFilter" });
          }
          const maxPaneIndex = hasSeparatePane ? Math.max(...separatePaneIndices) : 0;
          const paneConfigs2 = [];
          for (let i = 0; i <= maxPaneIndex; i++) {
            const isTarget = i === maximizeTargetIndex;
            grid2.push({
              left: layoutLeft,
              right: layoutRight,
              top: isTarget ? "5%" : "0%",
              height: isTarget ? "90%" : "0%",
              show: isTarget,
              containLabel: false
            });
            xAxis2.push({
              type: "category",
              gridIndex: i,
              data: [],
              show: isTarget,
              axisLabel: {
                show: isTarget,
                color: "#94a3b8",
                fontFamily: options.fontFamily
              },
              axisLine: { show: isTarget && gridBorderShow, lineStyle: { color: gridBorderColor } },
              splitLine: {
                show: isTarget && gridShow,
                lineStyle: { color: gridLineColor, opacity: gridLineOpacity }
              }
            });
            let yMin;
            let yMax;
            if (i === 0 && maximizeTargetIndex === 0) {
              yMin = options.yAxisMin !== void 0 && options.yAxisMin !== "auto" ? options.yAxisMin : AxisUtils.createMinFunction(yAxisPaddingPercent);
              yMax = options.yAxisMax !== void 0 && options.yAxisMax !== "auto" ? options.yAxisMax : AxisUtils.createMaxFunction(yAxisPaddingPercent);
            } else {
              yMin = AxisUtils.createMinFunction(yAxisPaddingPercent);
              yMax = AxisUtils.createMaxFunction(yAxisPaddingPercent);
            }
            yAxis2.push({
              position: "right",
              gridIndex: i,
              show: isTarget,
              scale: true,
              min: yMin,
              max: yMax,
              axisLabel: {
                show: isTarget,
                color: "#94a3b8",
                fontFamily: options.fontFamily,
                formatter: (value) => {
                  if (options.yAxisLabelFormatter) {
                    return options.yAxisLabelFormatter(value);
                  }
                  const decimals = options.yAxisDecimalPlaces !== void 0 ? options.yAxisDecimalPlaces : AxisUtils.autoDetectDecimals(marketData);
                  return AxisUtils.formatValue(value, decimals);
                }
              },
              splitLine: {
                show: isTarget && gridShow,
                lineStyle: { color: gridLineColor, opacity: gridLineOpacity }
              }
            });
            if (i > 0) {
              const ind = Array.from(indicators.values()).find((ind2) => ind2.paneIndex === i);
              if (ind) {
                paneConfigs2.push({
                  index: i,
                  height: isTarget ? 90 : 0,
                  top: isTarget ? 5 : 0,
                  isCollapsed: false,
                  indicatorId: ind.id,
                  titleColor: ind.titleColor,
                  controls: ind.controls
                });
              }
            }
          }
          return {
            grid: grid2,
            xAxis: xAxis2,
            yAxis: yAxis2,
            dataZoom: dataZoom2,
            paneLayout: paneConfigs2,
            mainPaneHeight: maximizeTargetIndex === 0 ? 90 : 0,
            mainPaneTop: maximizeTargetIndex === 0 ? 5 : 0,
            pixelToPercent,
            overlayYAxisMap: /* @__PURE__ */ new Map(),
            // No overlays in maximized view
            separatePaneYAxisOffset: 1
            // In maximized view, no overlays, so separate panes start at 1
          };
        }
        if (dzVisible) {
          if (dzPosition === "top") {
            mainPaneTop = dzHeight + 4;
            chartAreaBottom = 95;
          } else {
            chartAreaBottom = 100 - dzHeight - 2;
            mainPaneTop = 8;
          }
        } else {
          mainPaneTop = 5;
          chartAreaBottom = 95;
        }
        let gapPercent = 5;
        if (containerHeight > 0) {
          gapPercent = 20 / containerHeight * 100;
        }
        let mainHeightVal = 75;
        let configuredMainHeight;
        if (options.layout?.mainPaneHeight !== void 0) {
          const raw = options.layout.mainPaneHeight;
          if (typeof raw === "string") {
            const parsed = parseFloat(raw);
            if (!isNaN(parsed))
              configuredMainHeight = parsed;
          } else if (typeof raw === "number") {
            configuredMainHeight = raw;
          }
        }
        let paneConfigs = [];
        if (hasSeparatePane) {
          const panes = separatePaneIndices.map((idx) => {
            const ind = Array.from(indicators.values()).find((i) => i.paneIndex === idx);
            return {
              index: idx,
              requestedHeight: ind?.height,
              isCollapsed: ind?.collapsed ?? false,
              indicatorId: ind?.id,
              titleColor: ind?.titleColor,
              controls: ind?.controls
            };
          });
          const rawPanes = panes.map((p) => ({
            ...p,
            rawHeight: p.isCollapsed ? 3 : p.requestedHeight !== void 0 ? p.requestedHeight : 15
          }));
          const totalAvailable = chartAreaBottom - mainPaneTop;
          const totalGaps = rawPanes.length * gapPercent;
          if (mainHeightOverride !== void 0 && mainHeightOverride > 0 && !isMainCollapsed) {
            mainHeightVal = mainHeightOverride;
          } else if (isMainCollapsed) {
            mainHeightVal = 3;
          } else if (configuredMainHeight !== void 0 && configuredMainHeight > 0) {
            mainHeightVal = configuredMainHeight;
          } else {
            const totalIndicatorHeight = rawPanes.reduce((sum, p) => sum + p.rawHeight, 0);
            mainHeightVal = totalAvailable - totalIndicatorHeight - totalGaps;
            if (mainHeightVal < 20)
              mainHeightVal = Math.max(mainHeightVal, 10);
          }
          const isMainHeightFixed = mainHeightOverride !== void 0 && mainHeightOverride > 0 && !isMainCollapsed || configuredMainHeight !== void 0 && configuredMainHeight > 0 && !isMainCollapsed;
          let resolvedPanes;
          if (isMainHeightFixed) {
            const remainingForIndicators = totalAvailable - mainHeightVal - totalGaps;
            const totalWeights = rawPanes.filter((p) => !p.isCollapsed).reduce((sum, p) => sum + p.rawHeight, 0);
            resolvedPanes = rawPanes.map((p) => ({
              ...p,
              height: p.isCollapsed ? 3 : totalWeights > 0 ? Math.max(5, p.rawHeight / totalWeights * remainingForIndicators) : remainingForIndicators / rawPanes.filter((x) => !x.isCollapsed).length
            }));
          } else {
            resolvedPanes = rawPanes.map((p) => ({ ...p, height: p.rawHeight }));
          }
          let currentTop = mainPaneTop + mainHeightVal + gapPercent;
          paneConfigs = resolvedPanes.map((p) => {
            const config = {
              index: p.index,
              height: p.height,
              top: currentTop,
              isCollapsed: p.isCollapsed,
              indicatorId: p.indicatorId,
              titleColor: p.titleColor,
              controls: p.controls
            };
            currentTop += p.height + gapPercent;
            return config;
          });
        } else {
          mainHeightVal = chartAreaBottom - mainPaneTop;
          if (isMainCollapsed) {
            mainHeightVal = 3;
          }
        }
        const paneBoundaries = [];
        if (paneConfigs.length > 0) {
          paneBoundaries.push({
            yPercent: mainPaneTop + mainHeightVal + gapPercent / 2,
            aboveId: "main",
            belowId: paneConfigs[0].indicatorId || ""
          });
          for (let i = 0; i < paneConfigs.length - 1; i++) {
            paneBoundaries.push({
              yPercent: paneConfigs[i].top + paneConfigs[i].height + gapPercent / 2,
              aboveId: paneConfigs[i].indicatorId || "",
              belowId: paneConfigs[i + 1].indicatorId || ""
            });
          }
        }
        const grid = [];
        grid.push({
          left: layoutLeft,
          right: layoutRight,
          top: mainPaneTop + "%",
          height: mainHeightVal + "%",
          containLabel: false
          // We handle margins explicitly
        });
        paneConfigs.forEach((pane) => {
          grid.push({
            left: layoutLeft,
            right: layoutRight,
            top: pane.top + "%",
            height: pane.height + "%",
            containLabel: false
          });
        });
        const allXAxisIndices = [0, ...paneConfigs.map((_, i) => i + 1)];
        const xAxis = [];
        const isMainBottom = paneConfigs.length === 0;
        xAxis.push({
          type: "category",
          data: [],
          // Will be filled by SeriesBuilder or QFChart
          gridIndex: 0,
          scale: true,
          // boundaryGap will be set in QFChart.ts based on padding option
          axisLine: {
            onZero: false,
            show: !isMainCollapsed && gridBorderShow,
            lineStyle: { color: gridBorderColor }
          },
          splitLine: {
            show: !isMainCollapsed && gridShow,
            lineStyle: { color: gridLineColor, opacity: gridLineOpacity }
          },
          axisLabel: {
            show: !isMainCollapsed,
            color: "#94a3b8",
            fontFamily: options.fontFamily || "sans-serif",
            formatter: (value) => {
              if (options.yAxisLabelFormatter) {
                return options.yAxisLabelFormatter(value);
              }
              const decimals = options.yAxisDecimalPlaces !== void 0 ? options.yAxisDecimalPlaces : AxisUtils.autoDetectDecimals(marketData);
              return AxisUtils.formatValue(value, decimals);
            }
          },
          axisTick: { show: !isMainCollapsed },
          axisPointer: {
            label: {
              show: isMainBottom,
              fontSize: 11,
              backgroundColor: "#475569"
            }
          }
        });
        paneConfigs.forEach((pane, i) => {
          const isBottom = i === paneConfigs.length - 1;
          xAxis.push({
            type: "category",
            gridIndex: i + 1,
            // 0 is main
            data: [],
            // Shared data
            axisLabel: { show: false },
            // Hide labels on indicator panes
            axisLine: { show: !pane.isCollapsed && gridBorderShow, lineStyle: { color: gridBorderColor } },
            axisTick: { show: false },
            splitLine: { show: false },
            axisPointer: {
              label: {
                show: isBottom,
                fontSize: 11,
                backgroundColor: "#475569"
              }
            }
          });
        });
        const yAxis = [];
        let mainYAxisMin;
        let mainYAxisMax;
        if (options.yAxisMin !== void 0 && options.yAxisMin !== "auto") {
          mainYAxisMin = options.yAxisMin;
        } else {
          mainYAxisMin = AxisUtils.createMinFunction(yAxisPaddingPercent);
        }
        if (options.yAxisMax !== void 0 && options.yAxisMax !== "auto") {
          mainYAxisMax = options.yAxisMax;
        } else {
          mainYAxisMax = AxisUtils.createMaxFunction(yAxisPaddingPercent);
        }
        yAxis.push({
          position: "right",
          scale: true,
          min: mainYAxisMin,
          max: mainYAxisMax,
          gridIndex: 0,
          splitLine: {
            show: !isMainCollapsed && gridShow,
            lineStyle: { color: gridLineColor, opacity: gridLineOpacity }
          },
          axisLine: { show: !isMainCollapsed && gridBorderShow, lineStyle: { color: gridBorderColor } },
          axisLabel: {
            show: !isMainCollapsed,
            color: "#94a3b8",
            fontFamily: options.fontFamily || "sans-serif",
            formatter: (value) => {
              if (options.yAxisLabelFormatter) {
                return options.yAxisLabelFormatter(value);
              }
              const decimals = options.yAxisDecimalPlaces !== void 0 ? options.yAxisDecimalPlaces : AxisUtils.autoDetectDecimals(marketData);
              return AxisUtils.formatValue(value, decimals);
            }
          }
        });
        let nextYAxisIndex = 1;
        let priceMin = -Infinity;
        let priceMax = Infinity;
        if (marketData && marketData.length > 0) {
          priceMin = Math.min(...marketData.map((d) => d.low));
          priceMax = Math.max(...marketData.map((d) => d.high));
        }
        const overlayYAxisMap = /* @__PURE__ */ new Map();
        indicators.forEach((indicator, id) => {
          if (indicator.paneIndex === 0 && !indicator.collapsed) {
            if (marketData && marketData.length > 0) {
              Object.entries(indicator.plots).forEach(([plotName, plot]) => {
                const plotKey = `${id}::${plotName}`;
                const visualOnlyStyles = ["background", "barcolor", "char"];
                const isShapeWithPriceLocation = plot.options.style === "shape" && (plot.options.location === "abovebar" || plot.options.location === "AboveBar" || plot.options.location === "belowbar" || plot.options.location === "BelowBar");
                if (visualOnlyStyles.includes(plot.options.style)) {
                  if (!overlayYAxisMap.has(plotKey)) {
                    overlayYAxisMap.set(plotKey, nextYAxisIndex);
                    nextYAxisIndex++;
                  }
                  return;
                }
                if (plot.options.style === "shape" && !isShapeWithPriceLocation) {
                  if (!overlayYAxisMap.has(plotKey)) {
                    overlayYAxisMap.set(plotKey, nextYAxisIndex);
                    nextYAxisIndex++;
                  }
                  return;
                }
                const values = [];
                if (plot.data) {
                  Object.values(plot.data).forEach((value) => {
                    if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
                      values.push(value);
                    }
                  });
                }
                if (values.length > 0) {
                  const plotMin = Math.min(...values);
                  const plotMax = Math.max(...values);
                  const plotRange = plotMax - plotMin;
                  const priceRange = priceMax - priceMin;
                  const isWithinBounds = plotMin >= priceMin * 0.5 && plotMax <= priceMax * 1.5;
                  const hasSimilarMagnitude = plotRange > priceRange * 0.01;
                  const isCompatible = isWithinBounds && hasSimilarMagnitude;
                  if (!isCompatible) {
                    if (!overlayYAxisMap.has(plotKey)) {
                      overlayYAxisMap.set(plotKey, nextYAxisIndex);
                      nextYAxisIndex++;
                    }
                  }
                }
              });
            }
          }
        });
        const numOverlayAxes = overlayYAxisMap.size > 0 ? nextYAxisIndex - 1 : 0;
        const visualOnlyAxes = /* @__PURE__ */ new Set();
        overlayYAxisMap.forEach((yAxisIdx, plotKey) => {
          indicators.forEach((indicator) => {
            Object.entries(indicator.plots).forEach(([plotName, plot]) => {
              const key = `${indicator.id}::${plotName}`;
              if (key === plotKey && ["background", "barcolor", "char"].includes(plot.options.style)) {
                visualOnlyAxes.add(yAxisIdx);
              }
            });
          });
        });
        for (let i = 0; i < numOverlayAxes; i++) {
          const yAxisIndex = i + 1;
          const isVisualOnly = visualOnlyAxes.has(yAxisIndex);
          yAxis.push({
            position: "left",
            scale: !isVisualOnly,
            // Disable scaling for visual-only plots
            min: isVisualOnly ? 0 : AxisUtils.createMinFunction(yAxisPaddingPercent),
            // Fixed range for visual plots
            max: isVisualOnly ? 1 : AxisUtils.createMaxFunction(yAxisPaddingPercent),
            // Fixed range for visual plots
            gridIndex: 0,
            show: false,
            // Hide the axis visual elements
            splitLine: { show: false },
            axisLine: { show: false },
            axisLabel: { show: false }
          });
        }
        const separatePaneYAxisOffset = nextYAxisIndex;
        paneConfigs.forEach((pane, i) => {
          yAxis.push({
            position: "right",
            scale: true,
            min: AxisUtils.createMinFunction(yAxisPaddingPercent),
            max: AxisUtils.createMaxFunction(yAxisPaddingPercent),
            gridIndex: i + 1,
            splitLine: {
              show: !pane.isCollapsed && gridShow,
              lineStyle: { color: gridLineColor, opacity: gridLineOpacity * 0.6 }
            },
            axisLabel: {
              show: !pane.isCollapsed,
              color: "#94a3b8",
              fontFamily: options.fontFamily || "sans-serif",
              fontSize: 10,
              formatter: (value) => {
                if (options.yAxisLabelFormatter) {
                  return options.yAxisLabelFormatter(value);
                }
                const decimals = options.yAxisDecimalPlaces !== void 0 ? options.yAxisDecimalPlaces : AxisUtils.autoDetectDecimals(marketData);
                return AxisUtils.formatValue(value, decimals);
              }
            },
            axisLine: { show: !pane.isCollapsed && gridBorderShow, lineStyle: { color: gridBorderColor } }
          });
        });
        const dataZoom = [];
        const zoomOnTouch = options.dataZoom?.zoomOnTouch ?? true;
        const pannable = options.dataZoom?.pannable ?? true;
        if (zoomOnTouch && pannable) {
          dataZoom.push({
            type: "inside",
            xAxisIndex: allXAxisIndices,
            start: dzStart,
            end: dzEnd,
            filterMode: "weakFilter"
          });
        }
        if (dzVisible) {
          if (dzPosition === "top") {
            dataZoom.push({
              type: "slider",
              xAxisIndex: allXAxisIndices,
              top: "1%",
              height: dzHeight + "%",
              start: dzStart,
              end: dzEnd,
              borderColor: "#334155",
              textStyle: { color: "#cbd5e1" },
              brushSelect: false,
              filterMode: "weakFilter"
            });
          } else {
            dataZoom.push({
              type: "slider",
              xAxisIndex: allXAxisIndices,
              bottom: "1%",
              height: dzHeight + "%",
              start: dzStart,
              end: dzEnd,
              borderColor: "#334155",
              textStyle: { color: "#cbd5e1" },
              brushSelect: false,
              filterMode: "weakFilter"
            });
          }
        }
        return {
          grid,
          xAxis,
          yAxis,
          dataZoom,
          paneLayout: paneConfigs,
          mainPaneHeight: mainHeightVal,
          mainPaneTop,
          pixelToPercent,
          paneBoundaries,
          overlayYAxisMap,
          separatePaneYAxisOffset
        };
      }
      static calculateMaximized(containerHeight, options, targetPaneIndex) {
        return {
          grid: [],
          xAxis: [],
          yAxis: [],
          dataZoom: [],
          paneLayout: [],
          mainPaneHeight: 0,
          mainPaneTop: 0,
          pixelToPercent: 0,
          paneBoundaries: []
        };
      }
    }

    class LineRenderer {
      render(context) {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, colorArray, plotOptions } = context;
        const defaultColor = "#2962ff";
        return {
          name: seriesName,
          type: "custom",
          xAxisIndex,
          yAxisIndex,
          renderItem: (params, api) => {
            const index = params.dataIndex;
            if (index === 0)
              return;
            const y2 = api.value(1);
            const y1 = api.value(2);
            if (y2 === null || isNaN(y2) || y1 === null || isNaN(y1))
              return;
            const p1 = api.coord([index - 1, y1]);
            const p2 = api.coord([index, y2]);
            return {
              type: "line",
              shape: {
                x1: p1[0],
                y1: p1[1],
                x2: p2[0],
                y2: p2[1]
              },
              style: {
                stroke: colorArray[index] || plotOptions.color || defaultColor,
                lineWidth: plotOptions.linewidth || 1
              },
              silent: true
            };
          },
          // Data format: [index, value, prevValue]
          data: dataArray.map((val, i) => [i, val, i > 0 ? dataArray[i - 1] : null])
        };
      }
    }

    class StepRenderer {
      render(context) {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, colorArray, plotOptions } = context;
        const defaultColor = "#2962ff";
        return {
          name: seriesName,
          type: "custom",
          xAxisIndex,
          yAxisIndex,
          renderItem: (params, api) => {
            const x = api.value(0);
            const y = api.value(1);
            if (isNaN(y) || y === null)
              return;
            const coords = api.coord([x, y]);
            const width = api.size([1, 0])[0];
            return {
              type: "line",
              shape: {
                x1: coords[0] - width / 2,
                y1: coords[1],
                x2: coords[0] + width / 2,
                y2: coords[1]
              },
              style: {
                stroke: colorArray[params.dataIndex] || plotOptions.color || defaultColor,
                lineWidth: plotOptions.linewidth || 1
              },
              silent: true
            };
          },
          data: dataArray.map((val, i) => [i, val])
        };
      }
    }

    class HistogramRenderer {
      render(context) {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, colorArray, plotOptions } = context;
        const defaultColor = "#2962ff";
        const histbase = plotOptions.histbase ?? 0;
        const isColumns = plotOptions.style === "columns";
        const linewidth = plotOptions.linewidth ?? 1;
        const customData = dataArray.map((val, i) => {
          if (val === null || val === void 0 || typeof val === "number" && isNaN(val))
            return null;
          return [i, val, colorArray[i] || plotOptions.color || defaultColor];
        });
        return {
          name: seriesName,
          type: "custom",
          xAxisIndex,
          yAxisIndex,
          renderItem: (params, api) => {
            const idx = api.value(0);
            const value = api.value(1);
            const color = api.value(2);
            if (value === null || value === void 0 || isNaN(value)) {
              return null;
            }
            const basePos = api.coord([idx, histbase]);
            const valuePos = api.coord([idx, value]);
            const candleWidth = api.size([1, 0])[0];
            let barWidth;
            if (isColumns) {
              barWidth = candleWidth * 0.6;
            } else {
              barWidth = Math.max(1, linewidth);
            }
            const x = basePos[0];
            const yBase = basePos[1];
            const yValue = valuePos[1];
            const top = Math.min(yBase, yValue);
            const height = Math.abs(yValue - yBase);
            return {
              type: "rect",
              shape: {
                x: x - barWidth / 2,
                y: top,
                width: barWidth,
                height: height || 1
                // Minimum 1px for zero-height bars
              },
              style: {
                fill: color
              }
            };
          },
          data: customData.filter((d) => d !== null)
        };
      }
    }

    const imageCache = /* @__PURE__ */ new Map();
    function textToBase64Image(text, color = "#00da3c", fontSize = "64px") {
      if (typeof document === "undefined")
        return "";
      const cacheKey = `${text}-${color}-${fontSize}`;
      if (imageCache.has(cacheKey)) {
        return imageCache.get(cacheKey);
      }
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 32;
      canvas.height = 32;
      if (ctx) {
        ctx.font = "bold " + fontSize + " Arial";
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 16, 16);
        const dataUrl = canvas.toDataURL("image/png");
        imageCache.set(cacheKey, dataUrl);
        return dataUrl;
      }
      return "";
    }

    class ScatterRenderer {
      render(context) {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, colorArray, plotOptions } = context;
        const defaultColor = "#2962ff";
        const style = plotOptions.style;
        if (style === "char") {
          return {
            name: seriesName,
            type: "scatter",
            xAxisIndex,
            yAxisIndex,
            symbolSize: 0,
            // Invisible
            data: dataArray.map((val, i) => ({
              value: [i, val],
              itemStyle: { opacity: 0 }
            })),
            silent: true
            // No interaction
          };
        }
        const scatterData = dataArray.map((val, i) => {
          if (val === null)
            return null;
          const pointColor = colorArray[i] || plotOptions.color || defaultColor;
          const item = {
            value: [i, val],
            itemStyle: { color: pointColor }
          };
          if (style === "cross") {
            item.symbol = `image://${textToBase64Image("+", pointColor, "24px")}`;
            item.symbolSize = 16;
          } else {
            item.symbol = "circle";
            item.symbolSize = 6;
          }
          return item;
        }).filter((item) => item !== null);
        return {
          name: seriesName,
          type: "scatter",
          xAxisIndex,
          yAxisIndex,
          data: scatterData
        };
      }
    }

    class OHLCBarRenderer {
      render(context) {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, colorArray, optionsArray, plotOptions } = context;
        const defaultColor = "#2962ff";
        const isCandle = plotOptions.style === "candle";
        const colorLookup = [];
        const ohlcData = dataArray.map((val, i) => {
          if (val === null || !Array.isArray(val) || val.length !== 4)
            return null;
          const [open, high, low, close] = val;
          const pointOpts = optionsArray[i] || {};
          const color = pointOpts.color || colorArray[i] || plotOptions.color || defaultColor;
          const wickColor = pointOpts.wickcolor || plotOptions.wickcolor || color;
          const borderColor = pointOpts.bordercolor || plotOptions.bordercolor || wickColor;
          colorLookup[i] = { color, wickColor, borderColor };
          return [i, open, close, low, high];
        }).filter((item) => item !== null);
        return {
          name: seriesName,
          type: "custom",
          xAxisIndex,
          yAxisIndex,
          renderItem: (params, api) => {
            const xValue = api.value(0);
            const openValue = api.value(1);
            const closeValue = api.value(2);
            const lowValue = api.value(3);
            const highValue = api.value(4);
            if (isNaN(openValue) || isNaN(closeValue) || isNaN(lowValue) || isNaN(highValue)) {
              return null;
            }
            const colors = colorLookup[xValue] || { color: defaultColor, wickColor: defaultColor, borderColor: defaultColor };
            const color = colors.color;
            const wickColor = colors.wickColor;
            const borderColor = colors.borderColor;
            const xPos = api.coord([xValue, 0])[0];
            const openPos = api.coord([xValue, openValue])[1];
            const closePos = api.coord([xValue, closeValue])[1];
            const lowPos = api.coord([xValue, lowValue])[1];
            const highPos = api.coord([xValue, highValue])[1];
            const barWidth = api.size([1, 0])[0] * 0.6;
            if (isCandle) {
              const bodyTop = Math.min(openPos, closePos);
              const bodyBottom = Math.max(openPos, closePos);
              const bodyHeight = Math.abs(closePos - openPos);
              return {
                type: "group",
                children: [
                  // Upper wick
                  {
                    type: "line",
                    shape: {
                      x1: xPos,
                      y1: highPos,
                      x2: xPos,
                      y2: bodyTop
                    },
                    style: {
                      stroke: wickColor,
                      lineWidth: 1
                    }
                  },
                  // Lower wick
                  {
                    type: "line",
                    shape: {
                      x1: xPos,
                      y1: bodyBottom,
                      x2: xPos,
                      y2: lowPos
                    },
                    style: {
                      stroke: wickColor,
                      lineWidth: 1
                    }
                  },
                  // Body
                  {
                    type: "rect",
                    shape: {
                      x: xPos - barWidth / 2,
                      y: bodyTop,
                      width: barWidth,
                      height: bodyHeight || 1
                      // Minimum height for doji
                    },
                    style: {
                      fill: color,
                      stroke: borderColor,
                      lineWidth: 1
                    }
                  }
                ]
              };
            } else {
              const tickWidth = barWidth * 0.5;
              return {
                type: "group",
                children: [
                  // Vertical line (low to high)
                  {
                    type: "line",
                    shape: {
                      x1: xPos,
                      y1: lowPos,
                      x2: xPos,
                      y2: highPos
                    },
                    style: {
                      stroke: color,
                      lineWidth: 1
                    }
                  },
                  // Open tick (left)
                  {
                    type: "line",
                    shape: {
                      x1: xPos - tickWidth,
                      y1: openPos,
                      x2: xPos,
                      y2: openPos
                    },
                    style: {
                      stroke: color,
                      lineWidth: 1
                    }
                  },
                  // Close tick (right)
                  {
                    type: "line",
                    shape: {
                      x1: xPos,
                      y1: closePos,
                      x2: xPos + tickWidth,
                      y2: closePos
                    },
                    style: {
                      stroke: color,
                      lineWidth: 1
                    }
                  }
                ]
              };
            }
          },
          data: ohlcData
        };
      }
    }

    class ShapeUtils {
      static getShapeSymbol(shape) {
        switch (shape) {
          case "arrowdown":
          case "shape_arrow_down":
            return "path://M12 24l-12-12h8v-12h8v12h8z";
          case "arrowup":
          case "shape_arrow_up":
            return "path://M12 0l12 12h-8v12h-8v-12h-8z";
          case "circle":
          case "shape_circle":
            return "circle";
          case "cross":
          case "shape_cross":
            return "path://M11 2h2v9h9v2h-9v9h-2v-9h-9v-2h9z";
          case "diamond":
          case "shape_diamond":
            return "diamond";
          case "flag":
          case "shape_flag":
            return "path://M6 2v20h2v-8h12l-2-6 2-6h-12z";
          case "labeldown":
          case "shape_label_down":
            return "path://M2 1h20a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-8l-2 3-2-3h-8a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1z";
          case "labelleft":
          case "shape_label_left":
            return "path://M0 10l3-3v-5a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-18a1 1 0 0 1-1-1v-5z";
          case "labelright":
          case "shape_label_right":
            return "path://M24 10l-3-3v-5a1 1 0 0 0-1-1h-18a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-5z";
          case "labelup":
          case "shape_label_up":
            return "path://M12 1l2 3h8a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-20a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1h8z";
          case "square":
          case "shape_square":
            return "rect";
          case "triangledown":
          case "shape_triangle_down":
            return "path://M12 21l-10-18h20z";
          case "triangleup":
          case "shape_triangle_up":
            return "triangle";
          case "xcross":
          case "shape_xcross":
            return "path://M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z";
          default:
            return "circle";
        }
      }
      static getShapeRotation(shape) {
        return 0;
      }
      static getShapeSize(size, width, height) {
        if (width !== void 0 && height !== void 0) {
          return [width, height];
        }
        let baseSize;
        switch (size) {
          case "tiny":
            baseSize = 8;
            break;
          case "small":
            baseSize = 12;
            break;
          case "normal":
          case "auto":
            baseSize = 16;
            break;
          case "large":
            baseSize = 24;
            break;
          case "huge":
            baseSize = 32;
            break;
          default:
            baseSize = 16;
        }
        if (width !== void 0) {
          return [width, width];
        }
        if (height !== void 0) {
          return [height, height];
        }
        return baseSize;
      }
      // Helper to determine label position and distance relative to shape BASED ON LOCATION
      static getLabelConfig(shape, location) {
        switch (location) {
          case "abovebar":
          case "AboveBar":
            return { position: "top", distance: 5 };
          case "belowbar":
          case "BelowBar":
            return { position: "bottom", distance: 5 };
          case "top":
          case "Top":
            return { position: "bottom", distance: 5 };
          case "bottom":
          case "Bottom":
            return { position: "top", distance: 5 };
          case "absolute":
          case "Absolute":
          default:
            if (shape === "labelup" || shape === "labeldown" || shape === "shape_label_up" || shape === "shape_label_down") {
              return { position: "inside", distance: 0 };
            }
            return { position: "top", distance: 5 };
        }
      }
    }

    class ShapeRenderer {
      render(context) {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, colorArray, optionsArray, plotOptions, candlestickData } = context;
        const defaultColor = "#2962ff";
        const shapeData = dataArray.map((val, i) => {
          const pointOpts = optionsArray[i] || {};
          const globalOpts = plotOptions;
          const location = pointOpts.location || globalOpts.location || "absolute";
          if (location !== "absolute" && location !== "Absolute" && !val) {
            return null;
          }
          if (val === null || val === void 0) {
            return null;
          }
          const color = pointOpts.color || globalOpts.color || defaultColor;
          const shape = pointOpts.shape || globalOpts.shape || "circle";
          const size = pointOpts.size || globalOpts.size || "normal";
          const text = pointOpts.text || globalOpts.text;
          const textColor = pointOpts.textcolor || globalOpts.textcolor || "white";
          const width = pointOpts.width || globalOpts.width;
          const height = pointOpts.height || globalOpts.height;
          let yValue = val;
          let symbolOffset = [0, 0];
          if (location === "abovebar" || location === "AboveBar" || location === "ab") {
            if (candlestickData && candlestickData[i]) {
              yValue = candlestickData[i].high;
            }
            symbolOffset = [0, "-150%"];
          } else if (location === "belowbar" || location === "BelowBar" || location === "bl") {
            if (candlestickData && candlestickData[i]) {
              yValue = candlestickData[i].low;
            }
            symbolOffset = [0, "150%"];
          } else if (location === "top" || location === "Top") {
            yValue = val;
            symbolOffset = [0, 0];
          } else if (location === "bottom" || location === "Bottom") {
            yValue = val;
            symbolOffset = [0, 0];
          }
          const symbol = ShapeUtils.getShapeSymbol(shape);
          const symbolSize = ShapeUtils.getShapeSize(size, width, height);
          const rotate = ShapeUtils.getShapeRotation(shape);
          let finalSize = symbolSize;
          if (shape.includes("label")) {
            if (Array.isArray(symbolSize)) {
              finalSize = [symbolSize[0] * 2.5, symbolSize[1] * 2.5];
            } else {
              finalSize = symbolSize * 2.5;
            }
          }
          const labelConfig = ShapeUtils.getLabelConfig(shape, location);
          const item = {
            value: [i, yValue],
            symbol,
            symbolSize: finalSize,
            symbolRotate: rotate,
            symbolOffset,
            itemStyle: {
              color
            },
            label: {
              show: !!text,
              position: labelConfig.position,
              distance: labelConfig.distance,
              formatter: text,
              color: textColor,
              fontSize: 10,
              fontWeight: "bold"
            }
          };
          return item;
        }).filter((item) => item !== null);
        return {
          name: seriesName,
          type: "scatter",
          xAxisIndex,
          yAxisIndex,
          data: shapeData
        };
      }
    }

    class ColorUtils {
      /**
       * Parse color string and extract opacity
       * Supports: hex (#RRGGBB, #RRGGBBAA), named colors (green, red), rgba(r,g,b,a), rgb(r,g,b)
       */
      static parseColor(colorStr) {
        if (!colorStr || typeof colorStr !== "string") {
          return { color: "#888888", opacity: 0.2 };
        }
        const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbaMatch) {
          const r = rgbaMatch[1];
          const g = rgbaMatch[2];
          const b = rgbaMatch[3];
          const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
          return {
            color: `rgb(${r},${g},${b})`,
            opacity: a
          };
        }
        const hex8Match = colorStr.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
        if (hex8Match) {
          const r = parseInt(hex8Match[1], 16);
          const g = parseInt(hex8Match[2], 16);
          const b = parseInt(hex8Match[3], 16);
          const a = parseInt(hex8Match[4], 16) / 255;
          return {
            color: `rgb(${r},${g},${b})`,
            opacity: a
          };
        }
        return {
          color: colorStr,
          opacity: 0.3
        };
      }
      /**
       * Convert a parsed color + opacity to an rgba string.
       */
      static toRgba(color, opacity) {
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          return `rgba(${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]},${opacity})`;
        }
        const hexMatch = color.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
        if (hexMatch) {
          const r = parseInt(hexMatch[1], 16);
          const g = parseInt(hexMatch[2], 16);
          const b = parseInt(hexMatch[3], 16);
          return `rgba(${r},${g},${b},${opacity})`;
        }
        const hex8Match = color.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
        if (hex8Match) {
          const r = parseInt(hex8Match[1], 16);
          const g = parseInt(hex8Match[2], 16);
          const b = parseInt(hex8Match[3], 16);
          return `rgba(${r},${g},${b},${opacity})`;
        }
        return color;
      }
    }

    class BackgroundRenderer {
      render(context) {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, colorArray } = context;
        const parsedColors = [];
        for (let i = 0; i < colorArray.length; i++) {
          parsedColors[i] = colorArray[i] ? ColorUtils.parseColor(colorArray[i]) : { color: "", opacity: 0 };
        }
        return {
          name: seriesName,
          type: "custom",
          xAxisIndex,
          yAxisIndex,
          z: -10,
          renderItem: (params, api) => {
            const xVal = api.value(0);
            if (isNaN(xVal))
              return;
            const start = api.coord([xVal, 0.5]);
            const size = api.size([1, 0]);
            const width = size[0];
            const sys = params.coordSys;
            const x = start[0] - width / 2;
            const barColor = colorArray[params.dataIndex];
            const val = api.value(1);
            if (!barColor || val === null || val === void 0 || isNaN(val))
              return;
            const parsed = parsedColors[params.dataIndex];
            if (!parsed || parsed.opacity <= 0)
              return;
            return {
              type: "rect",
              shape: {
                x,
                y: sys.y,
                width,
                height: sys.height
              },
              style: {
                fill: parsed.color,
                opacity: parsed.opacity
              },
              silent: true
            };
          },
          // Normalize data values to 0.5 (middle of [0,1] range) to prevent Y-axis scaling issues
          // The actual value is only used to check if the background should render (non-null/non-NaN)
          data: dataArray.map((val, i) => [i, val !== null && val !== void 0 && !isNaN(val) ? 0.5 : null])
        };
      }
    }

    class FillRenderer {
      render(context) {
        const { seriesName, xAxisIndex, yAxisIndex, plotOptions, plotDataArrays, indicatorId, plotName, optionsArray } = context;
        const totalDataLength = context.dataArray.length;
        const plot1Key = plotOptions.plot1 ? `${indicatorId}::${plotOptions.plot1}` : null;
        const plot2Key = plotOptions.plot2 ? `${indicatorId}::${plotOptions.plot2}` : null;
        if (!plot1Key || !plot2Key) {
          console.warn(`Fill plot "${plotName}" missing plot1 or plot2 reference`);
          return null;
        }
        const plot1Data = plotDataArrays?.get(plot1Key);
        const plot2Data = plotDataArrays?.get(plot2Key);
        if (!plot1Data || !plot2Data) {
          console.warn(`Fill plot "${plotName}" references non-existent plots: ${plotOptions.plot1}, ${plotOptions.plot2}`);
          return null;
        }
        const isGradient = plotOptions.gradient === true;
        if (isGradient) {
          return this.renderGradientFill(
            seriesName,
            xAxisIndex,
            yAxisIndex,
            plot1Data,
            plot2Data,
            totalDataLength,
            optionsArray,
            plotOptions
          );
        }
        const { color: defaultFillColor, opacity: defaultFillOpacity } = ColorUtils.parseColor(plotOptions.color || "rgba(128, 128, 128, 0.2)");
        const hasPerBarColor = optionsArray?.some((o) => o && o.color !== void 0);
        let barColors = null;
        if (hasPerBarColor) {
          barColors = [];
          for (let i = 0; i < totalDataLength; i++) {
            const opts = optionsArray?.[i];
            if (opts && opts.color !== void 0) {
              barColors[i] = ColorUtils.parseColor(opts.color);
            } else {
              barColors[i] = { color: defaultFillColor, opacity: defaultFillOpacity };
            }
          }
        }
        const fillDataWithPrev = [];
        for (let i = 0; i < totalDataLength; i++) {
          const y1 = plot1Data[i];
          const y2 = plot2Data[i];
          const prevY1 = i > 0 ? plot1Data[i - 1] : null;
          const prevY2 = i > 0 ? plot2Data[i - 1] : null;
          fillDataWithPrev.push([i, y1, y2, prevY1, prevY2]);
        }
        return {
          name: seriesName,
          type: "custom",
          xAxisIndex,
          yAxisIndex,
          z: 1,
          clip: true,
          encode: { x: 0 },
          animation: false,
          renderItem: (params, api) => {
            const index = params.dataIndex;
            if (index === 0)
              return null;
            const y1 = api.value(1);
            const y2 = api.value(2);
            const prevY1 = api.value(3);
            const prevY2 = api.value(4);
            if (y1 === null || y2 === null || prevY1 === null || prevY2 === null || isNaN(y1) || isNaN(y2) || isNaN(prevY1) || isNaN(prevY2)) {
              return null;
            }
            const fc = barColors ? barColors[index] : null;
            const fillOpacity = fc ? fc.opacity : defaultFillOpacity;
            if (fillOpacity < 0.01)
              return null;
            const p1Prev = api.coord([index - 1, prevY1]);
            const p1Curr = api.coord([index, y1]);
            const p2Curr = api.coord([index, y2]);
            const p2Prev = api.coord([index - 1, prevY2]);
            return {
              type: "polygon",
              shape: {
                points: [p1Prev, p1Curr, p2Curr, p2Prev]
              },
              style: {
                fill: fc ? fc.color : defaultFillColor,
                opacity: fillOpacity
              },
              silent: true
            };
          },
          data: fillDataWithPrev,
          silent: true
        };
      }
      /**
       * Batch-render multiple fill bands as a single ECharts custom series.
       * Instead of N separate series (one per fill), this creates ONE series
       * where each renderItem call draws all fill bands as a group of children.
       *
       * Performance: reduces series count from N to 1, eliminates per-series
       * ECharts overhead, and enables viewport culling via clip + encode.
       */
      renderBatched(seriesName, xAxisIndex, yAxisIndex, totalDataLength, fills) {
        const data = Array.from({ length: totalDataLength }, (_, i) => [i]);
        return {
          name: seriesName,
          type: "custom",
          xAxisIndex,
          yAxisIndex,
          z: 1,
          clip: true,
          encode: { x: 0 },
          animation: false,
          renderItem: (params, api) => {
            const index = params.dataIndex;
            if (index === 0)
              return null;
            const children = [];
            for (let f = 0; f < fills.length; f++) {
              const fill = fills[f];
              const y1 = fill.plot1Data[index];
              const y2 = fill.plot2Data[index];
              const prevY1 = fill.plot1Data[index - 1];
              const prevY2 = fill.plot2Data[index - 1];
              if (y1 == null || y2 == null || prevY1 == null || prevY2 == null || isNaN(y1) || isNaN(y2) || isNaN(prevY1) || isNaN(prevY2)) {
                continue;
              }
              const fc = fill.barColors[index];
              if (!fc || fc.opacity < 0.01)
                continue;
              const p1Prev = api.coord([index - 1, prevY1]);
              const p1Curr = api.coord([index, y1]);
              const p2Curr = api.coord([index, y2]);
              const p2Prev = api.coord([index - 1, prevY2]);
              children.push({
                type: "polygon",
                shape: { points: [p1Prev, p1Curr, p2Curr, p2Prev] },
                style: { fill: fc.color, opacity: fc.opacity },
                silent: true
              });
            }
            return children.length > 0 ? { type: "group", children, silent: true } : null;
          },
          data,
          silent: true
        };
      }
      /**
       * Render a gradient fill between two plots.
       * Uses a vertical linear gradient from top_color (at the upper boundary)
       * to bottom_color (at the lower boundary) for each polygon segment.
       */
      renderGradientFill(seriesName, xAxisIndex, yAxisIndex, plot1Data, plot2Data, totalDataLength, optionsArray, plotOptions) {
        const gradientColors = [];
        for (let i = 0; i < totalDataLength; i++) {
          const opts = optionsArray?.[i];
          if (opts && opts.top_color !== void 0) {
            const top = ColorUtils.parseColor(opts.top_color);
            const bottom = ColorUtils.parseColor(opts.bottom_color);
            gradientColors[i] = {
              topColor: top.color,
              topOpacity: top.opacity,
              bottomColor: bottom.color,
              bottomOpacity: bottom.opacity
            };
          } else {
            gradientColors[i] = {
              topColor: "rgba(128,128,128,0.2)",
              topOpacity: 0.2,
              bottomColor: "rgba(128,128,128,0.2)",
              bottomOpacity: 0.2
            };
          }
        }
        const fillDataWithPrev = [];
        for (let i = 0; i < totalDataLength; i++) {
          const y1 = plot1Data[i];
          const y2 = plot2Data[i];
          const prevY1 = i > 0 ? plot1Data[i - 1] : null;
          const prevY2 = i > 0 ? plot2Data[i - 1] : null;
          fillDataWithPrev.push([i, y1, y2, prevY1, prevY2]);
        }
        return {
          name: seriesName,
          type: "custom",
          xAxisIndex,
          yAxisIndex,
          z: 1,
          clip: true,
          encode: { x: 0 },
          animation: false,
          renderItem: (params, api) => {
            const index = params.dataIndex;
            if (index === 0)
              return null;
            const y1 = api.value(1);
            const y2 = api.value(2);
            const prevY1 = api.value(3);
            const prevY2 = api.value(4);
            if (y1 === null || y2 === null || prevY1 === null || prevY2 === null || isNaN(y1) || isNaN(y2) || isNaN(prevY1) || isNaN(prevY2)) {
              return null;
            }
            const p1Prev = api.coord([index - 1, prevY1]);
            const p1Curr = api.coord([index, y1]);
            const p2Curr = api.coord([index, y2]);
            const p2Prev = api.coord([index - 1, prevY2]);
            const gc = gradientColors[index] || gradientColors[index - 1];
            if (!gc)
              return null;
            if (gc.topOpacity < 0.01 && gc.bottomOpacity < 0.01)
              return null;
            const topRgba = ColorUtils.toRgba(gc.topColor, gc.topOpacity);
            const bottomRgba = ColorUtils.toRgba(gc.bottomColor, gc.bottomOpacity);
            const plot1IsAbove = y1 >= y2;
            return {
              type: "polygon",
              shape: {
                points: [p1Prev, p1Curr, p2Curr, p2Prev]
              },
              style: {
                fill: {
                  type: "linear",
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  // vertical gradient
                  colorStops: [
                    { offset: 0, color: plot1IsAbove ? topRgba : bottomRgba },
                    { offset: 1, color: plot1IsAbove ? bottomRgba : topRgba }
                  ]
                }
              },
              silent: true
            };
          },
          data: fillDataWithPrev,
          silent: true
        };
      }
    }

    class LabelRenderer {
      render(context) {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, candlestickData, dataIndexOffset } = context;
        const offset = dataIndexOffset || 0;
        const labelObjects = [];
        for (let i = 0; i < dataArray.length; i++) {
          const val = dataArray[i];
          if (!val)
            continue;
          const items = Array.isArray(val) ? val : [val];
          for (const lbl of items) {
            if (lbl && typeof lbl === "object" && !lbl._deleted) {
              labelObjects.push(lbl);
            }
          }
        }
        const labelData = labelObjects.map((lbl) => {
          const resolve = (v) => typeof v === "function" ? v() : v;
          const text = resolve(lbl.text) || "";
          const rawColor = resolve(lbl.color);
          const color = rawColor != null && rawColor !== "" ? rawColor : "transparent";
          const textcolor = resolve(lbl.textcolor) || "#ffffff";
          const yloc = resolve(lbl.yloc) || "price";
          const styleRaw = resolve(lbl.style) || "style_label_down";
          const size = resolve(lbl.size) || "normal";
          const textalign = resolve(lbl.textalign) || "align_center";
          const tooltip = resolve(lbl.tooltip) || "";
          const shape = this.styleToShape(styleRaw);
          const xPos = lbl.xloc === "bar_index" || lbl.xloc === "bi" ? lbl.x + offset : lbl.x;
          let yValue = lbl.y;
          let symbolOffset = [0, 0];
          if (yloc === "abovebar" || yloc === "AboveBar" || yloc === "ab") {
            if (candlestickData && candlestickData[xPos]) {
              yValue = candlestickData[xPos].high;
            }
            symbolOffset = [0, "-150%"];
          } else if (yloc === "belowbar" || yloc === "BelowBar" || yloc === "bl") {
            if (candlestickData && candlestickData[xPos]) {
              yValue = candlestickData[xPos].low;
            }
            symbolOffset = [0, "150%"];
          }
          const symbol = ShapeUtils.getShapeSymbol(shape);
          const symbolSize = ShapeUtils.getShapeSize(size);
          const fontSize = this.getSizePx(size);
          let finalSize;
          const isBubble = shape === "labeldown" || shape === "shape_label_down" || shape === "labelup" || shape === "shape_label_up" || shape === "labelleft" || shape === "labelright";
          let labelTextOffset = [0, 0];
          if (isBubble) {
            const textWidth = text.length * fontSize * 0.65;
            const minWidth = fontSize * 2.5;
            const bubbleWidth = Math.max(minWidth, textWidth + fontSize * 1.6);
            const bubbleHeight = fontSize * 2.8;
            const pointerRatio = 3 / 24;
            if (shape === "labelleft" || shape === "labelright") {
              const totalWidth = bubbleWidth / (1 - pointerRatio);
              finalSize = [totalWidth, bubbleHeight];
              const xOff = typeof symbolOffset[0] === "string" ? 0 : symbolOffset[0];
              if (shape === "labelleft") {
                symbolOffset = [xOff + totalWidth * 0.42, symbolOffset[1]];
                labelTextOffset = [totalWidth * pointerRatio * 0.5, 0];
              } else {
                symbolOffset = [xOff - totalWidth * 0.42, symbolOffset[1]];
                labelTextOffset = [-totalWidth * pointerRatio * 0.5, 0];
              }
            } else {
              const totalHeight = bubbleHeight / (1 - pointerRatio);
              finalSize = [bubbleWidth, totalHeight];
              if (shape === "labeldown") {
                symbolOffset = [symbolOffset[0], typeof symbolOffset[1] === "string" ? symbolOffset[1] : symbolOffset[1] - totalHeight * 0.42];
                labelTextOffset = [0, -totalHeight * pointerRatio * 0.5];
              } else {
                symbolOffset = [symbolOffset[0], typeof symbolOffset[1] === "string" ? symbolOffset[1] : symbolOffset[1] + totalHeight * 0.42];
                labelTextOffset = [0, totalHeight * pointerRatio * 0.5];
              }
            }
          } else if (shape === "none") {
            finalSize = 0;
          } else {
            if (Array.isArray(symbolSize)) {
              finalSize = [symbolSize[0] * 1.5, symbolSize[1] * 1.5];
            } else {
              finalSize = symbolSize * 1.5;
            }
          }
          const labelPosition = this.getLabelPosition(styleRaw, yloc);
          const isInsideLabel = labelPosition === "inside" || labelPosition.startsWith("inside");
          const item = {
            value: [xPos, yValue],
            symbol,
            symbolSize: finalSize,
            symbolOffset,
            itemStyle: {
              color
            },
            label: {
              show: !!text,
              position: labelPosition,
              distance: isInsideLabel ? 0 : 5,
              offset: labelTextOffset,
              formatter: text,
              color: textcolor,
              fontSize,
              fontWeight: "bold",
              align: isInsideLabel ? "center" : textalign === "align_left" || textalign === "left" ? "left" : textalign === "align_right" || textalign === "right" ? "right" : "center",
              verticalAlign: "middle",
              padding: [2, 6]
            }
          };
          if (tooltip) {
            item._tooltipText = tooltip;
            item.emphasis = {
              scale: false,
              itemStyle: { color },
              label: {
                show: item.label.show,
                color: textcolor,
                fontSize,
                fontWeight: "bold"
              }
            };
          } else {
            item.emphasis = { disabled: true };
          }
          return item;
        }).filter((item) => item !== null);
        return {
          name: seriesName,
          type: "scatter",
          xAxisIndex,
          yAxisIndex,
          data: labelData,
          z: 20,
          // Per-item emphasis: disabled for labels without tooltips,
          // scale:false for labels with tooltips (allows hover for custom tooltip).
          animation: false,
          // Prevent labels disappearing on zoom
          clip: false
          // Keep labels visible when partially outside viewport
        };
      }
      styleToShape(style) {
        const s = style.startsWith("style_") ? style.substring(6) : style;
        switch (s) {
          case "label_down":
            return "labeldown";
          case "label_up":
            return "labelup";
          case "label_left":
            return "labelleft";
          case "label_right":
            return "labelright";
          case "label_lower_left":
            return "labeldown";
          case "label_lower_right":
            return "labeldown";
          case "label_upper_left":
            return "labelup";
          case "label_upper_right":
            return "labelup";
          case "label_center":
            return "labeldown";
          case "circle":
            return "circle";
          case "square":
            return "square";
          case "diamond":
            return "diamond";
          case "flag":
            return "flag";
          case "arrowup":
            return "arrowup";
          case "arrowdown":
            return "arrowdown";
          case "cross":
            return "cross";
          case "xcross":
            return "xcross";
          case "triangleup":
            return "triangleup";
          case "triangledown":
            return "triangledown";
          case "text_outline":
            return "none";
          case "none":
            return "none";
          default:
            return "labeldown";
        }
      }
      getLabelPosition(style, yloc) {
        const s = style.startsWith("style_") ? style.substring(6) : style;
        switch (s) {
          case "label_down":
          case "label_up":
          case "label_left":
          case "label_right":
          case "label_lower_left":
          case "label_lower_right":
          case "label_upper_left":
          case "label_upper_right":
          case "label_center":
            return "inside";
          case "text_outline":
          case "none":
            return yloc === "abovebar" || yloc === "AboveBar" || yloc === "ab" ? "top" : yloc === "belowbar" || yloc === "BelowBar" || yloc === "bl" ? "bottom" : "top";
          default:
            return yloc === "belowbar" || yloc === "BelowBar" || yloc === "bl" ? "bottom" : "top";
        }
      }
      getSizePx(size) {
        switch (size) {
          case "tiny":
            return 8;
          case "small":
            return 9;
          case "normal":
          case "auto":
            return 10;
          case "large":
            return 12;
          case "huge":
            return 14;
          default:
            return 10;
        }
      }
    }

    class DrawingLineRenderer {
      render(context) {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, dataIndexOffset } = context;
        const offset = dataIndexOffset || 0;
        const defaultColor = "#2962ff";
        const lineObjects = [];
        for (let i = 0; i < dataArray.length; i++) {
          const val = dataArray[i];
          if (!val)
            continue;
          const items = Array.isArray(val) ? val : [val];
          for (const ln of items) {
            if (ln && typeof ln === "object" && !ln._deleted) {
              lineObjects.push(ln);
            }
          }
        }
        if (lineObjects.length === 0) {
          return { name: seriesName, type: "custom", xAxisIndex, yAxisIndex, data: [], silent: true };
        }
        const totalBars = (context.candlestickData?.length || 0) + offset;
        const lastBarIndex = Math.max(0, totalBars - 1);
        return {
          name: seriesName,
          type: "custom",
          xAxisIndex,
          yAxisIndex,
          renderItem: (params, api) => {
            const children = [];
            for (const ln of lineObjects) {
              if (ln._deleted)
                continue;
              const xOff = ln.xloc === "bar_index" || ln.xloc === "bi" ? offset : 0;
              let p1 = api.coord([ln.x1 + xOff, ln.y1]);
              let p2 = api.coord([ln.x2 + xOff, ln.y2]);
              const extend = ln.extend || "none";
              if (extend !== "none" && extend !== "n") {
                const cs = params.coordSys;
                [p1, p2] = this.extendLine(p1, p2, extend, cs.x, cs.x + cs.width, cs.y, cs.y + cs.height);
              }
              const color = ln.color || defaultColor;
              const lineWidth = ln.width || 1;
              children.push({
                type: "line",
                shape: { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] },
                style: {
                  fill: "none",
                  stroke: color,
                  lineWidth,
                  lineDash: this.getDashPattern(ln.style)
                }
              });
              const style = ln.style || "style_solid";
              if (style === "style_arrow_left" || style === "style_arrow_both") {
                const arrow = this.arrowHead(p2, p1, lineWidth, color);
                if (arrow)
                  children.push(arrow);
              }
              if (style === "style_arrow_right" || style === "style_arrow_both") {
                const arrow = this.arrowHead(p1, p2, lineWidth, color);
                if (arrow)
                  children.push(arrow);
              }
            }
            return { type: "group", children };
          },
          data: [[0, lastBarIndex]],
          clip: true,
          encode: { x: [0, 1] },
          // Prevent ECharts visual system from overriding element colors with palette
          itemStyle: { color: "transparent", borderColor: "transparent" },
          z: 15,
          silent: true,
          emphasis: { disabled: true }
        };
      }
      getDashPattern(style) {
        switch (style) {
          case "style_dotted":
            return [2, 2];
          case "style_dashed":
            return [6, 4];
          default:
            return void 0;
        }
      }
      extendLine(p1, p2, extend, left, right, top, bottom) {
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        if (dx === 0 && dy === 0)
          return [p1, p2];
        const extendPoint = (origin, dir) => {
          let tMax = Infinity;
          if (dir[0] !== 0) {
            const tx = dir[0] > 0 ? (right - origin[0]) / dir[0] : (left - origin[0]) / dir[0];
            tMax = Math.min(tMax, tx);
          }
          if (dir[1] !== 0) {
            const ty = dir[1] > 0 ? (bottom - origin[1]) / dir[1] : (top - origin[1]) / dir[1];
            tMax = Math.min(tMax, ty);
          }
          if (!isFinite(tMax))
            tMax = 0;
          return [origin[0] + tMax * dir[0], origin[1] + tMax * dir[1]];
        };
        let newP1 = p1;
        let newP2 = p2;
        if (extend === "right" || extend === "r" || extend === "both" || extend === "b") {
          newP2 = extendPoint(p1, [dx, dy]);
        }
        if (extend === "left" || extend === "l" || extend === "both" || extend === "b") {
          newP1 = extendPoint(p2, [-dx, -dy]);
        }
        return [newP1, newP2];
      }
      arrowHead(from, to, lineWidth, color) {
        const dx = to[0] - from[0];
        const dy = to[1] - from[1];
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1)
          return null;
        const size = Math.max(8, lineWidth * 4);
        const nx = dx / len;
        const ny = dy / len;
        const bx = to[0] - nx * size;
        const by = to[1] - ny * size;
        const px = -ny * size * 0.4;
        const py = nx * size * 0.4;
        return {
          type: "polygon",
          shape: {
            points: [
              [to[0], to[1]],
              [bx + px, by + py],
              [bx - px, by - py]
            ]
          },
          style: { fill: color }
        };
      }
    }

    class LinefillRenderer {
      render(context) {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, dataIndexOffset } = context;
        const offset = dataIndexOffset || 0;
        const fillObjects = [];
        for (let i = 0; i < dataArray.length; i++) {
          const val = dataArray[i];
          if (!val)
            continue;
          const items = Array.isArray(val) ? val : [val];
          for (const lf of items) {
            if (!lf || typeof lf !== "object" || lf._deleted)
              continue;
            const line1 = lf.line1;
            const line2 = lf.line2;
            if (!line1 || !line2 || line1._deleted || line2._deleted)
              continue;
            fillObjects.push(lf);
          }
        }
        if (fillObjects.length === 0) {
          return { name: seriesName, type: "custom", xAxisIndex, yAxisIndex, data: [], silent: true };
        }
        const totalBars = (context.candlestickData?.length || 0) + offset;
        const lastBarIndex = Math.max(0, totalBars - 1);
        return {
          name: seriesName,
          type: "custom",
          xAxisIndex,
          yAxisIndex,
          renderItem: (params, api) => {
            const children = [];
            for (const lf of fillObjects) {
              if (lf._deleted)
                continue;
              const line1 = lf.line1;
              const line2 = lf.line2;
              if (!line1 || !line2 || line1._deleted || line2._deleted)
                continue;
              const xOff1 = line1.xloc === "bar_index" || line1.xloc === "bi" ? offset : 0;
              const xOff2 = line2.xloc === "bar_index" || line2.xloc === "bi" ? offset : 0;
              let p1Start = api.coord([line1.x1 + xOff1, line1.y1]);
              let p1End = api.coord([line1.x2 + xOff1, line1.y2]);
              let p2Start = api.coord([line2.x1 + xOff2, line2.y1]);
              let p2End = api.coord([line2.x2 + xOff2, line2.y2]);
              const extend1 = line1.extend || "none";
              const extend2 = line2.extend || "none";
              if (extend1 !== "none" || extend2 !== "none") {
                const cs = params.coordSys;
                const csLeft = cs.x, csRight = cs.x + cs.width;
                const csTop = cs.y, csBottom = cs.y + cs.height;
                if (extend1 !== "none") {
                  [p1Start, p1End] = this.extendLine(p1Start, p1End, extend1, csLeft, csRight, csTop, csBottom);
                }
                if (extend2 !== "none") {
                  [p2Start, p2End] = this.extendLine(p2Start, p2End, extend2, csLeft, csRight, csTop, csBottom);
                }
              }
              const { color: fillColor, opacity: fillOpacity } = ColorUtils.parseColor(lf.color || "rgba(128, 128, 128, 0.2)");
              children.push({
                type: "polygon",
                shape: { points: [p1Start, p1End, p2End, p2Start] },
                style: { fill: fillColor, opacity: fillOpacity },
                silent: true
              });
            }
            return { type: "group", children };
          },
          data: [[0, lastBarIndex]],
          clip: true,
          encode: { x: [0, 1] },
          z: 10,
          // Behind lines (z=15) but above other elements
          silent: true,
          emphasis: { disabled: true }
        };
      }
      extendLine(p1, p2, extend, left, right, top, bottom) {
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        if (dx === 0 && dy === 0)
          return [p1, p2];
        const extendPoint = (origin, dir) => {
          let tMax = Infinity;
          if (dir[0] !== 0) {
            const tx = dir[0] > 0 ? (right - origin[0]) / dir[0] : (left - origin[0]) / dir[0];
            tMax = Math.min(tMax, tx);
          }
          if (dir[1] !== 0) {
            const ty = dir[1] > 0 ? (bottom - origin[1]) / dir[1] : (top - origin[1]) / dir[1];
            tMax = Math.min(tMax, ty);
          }
          if (!isFinite(tMax))
            tMax = 0;
          return [origin[0] + tMax * dir[0], origin[1] + tMax * dir[1]];
        };
        let newP1 = p1;
        let newP2 = p2;
        if (extend === "right" || extend === "both") {
          newP2 = extendPoint(p1, [dx, dy]);
        }
        if (extend === "left" || extend === "both") {
          newP1 = extendPoint(p2, [-dx, -dy]);
        }
        return [newP1, newP2];
      }
    }

    class PolylineRenderer {
      render(context) {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, dataIndexOffset } = context;
        const offset = dataIndexOffset || 0;
        const polyObjects = [];
        for (let i = 0; i < dataArray.length; i++) {
          const val = dataArray[i];
          if (!val)
            continue;
          const items = Array.isArray(val) ? val : [val];
          for (const pl of items) {
            if (pl && typeof pl === "object" && !pl._deleted && pl.points && pl.points.length >= 2) {
              polyObjects.push(pl);
            }
          }
        }
        if (polyObjects.length === 0) {
          return { name: seriesName, type: "custom", xAxisIndex, yAxisIndex, data: [], silent: true };
        }
        const totalBars = (context.candlestickData?.length || 0) + offset;
        const lastBarIndex = Math.max(0, totalBars - 1);
        return {
          name: seriesName,
          type: "custom",
          xAxisIndex,
          yAxisIndex,
          renderItem: (params, api) => {
            const children = [];
            for (const pl of polyObjects) {
              if (pl._deleted)
                continue;
              const points = pl.points;
              if (!points || points.length < 2)
                continue;
              const useBi = pl.xloc === "bi" || pl.xloc === "bar_index";
              const xOff = useBi ? offset : 0;
              const pixelPoints = [];
              for (const pt of points) {
                const x = useBi ? (pt.index ?? 0) + xOff : pt.time ?? 0;
                const y = pt.price ?? 0;
                pixelPoints.push(api.coord([x, y]));
              }
              if (pixelPoints.length < 2)
                continue;
              const rawLineColor = pl.line_color;
              const isNaLineColor = rawLineColor === null || rawLineColor === void 0 || typeof rawLineColor === "number" && isNaN(rawLineColor) || rawLineColor === "na" || rawLineColor === "NaN";
              const lineColor = isNaLineColor ? null : rawLineColor || "#2962ff";
              const lineWidth = pl.line_width || 1;
              const dashPattern = this.getDashPattern(pl.line_style);
              if (pl.fill_color && pl.fill_color !== "" && pl.fill_color !== "na") {
                const { color: fillColor, opacity: fillOpacity } = ColorUtils.parseColor(pl.fill_color);
                if (pl.curved) {
                  const pathData = this.buildCurvedPath(pixelPoints, pl.closed);
                  children.push({
                    type: "path",
                    shape: { pathData: pathData + " Z" },
                    style: { fill: fillColor, opacity: fillOpacity, stroke: "none" },
                    silent: true
                  });
                } else {
                  children.push({
                    type: "polygon",
                    shape: { points: pixelPoints },
                    style: { fill: fillColor, opacity: fillOpacity, stroke: "none" },
                    silent: true
                  });
                }
              }
              if (lineColor && lineWidth > 0) {
                if (pl.curved) {
                  const pathData = this.buildCurvedPath(pixelPoints, pl.closed);
                  children.push({
                    type: "path",
                    shape: { pathData },
                    style: { fill: "none", stroke: lineColor, lineWidth, lineDash: dashPattern },
                    silent: true
                  });
                } else {
                  const allPoints = pl.closed ? [...pixelPoints, pixelPoints[0]] : pixelPoints;
                  children.push({
                    type: "polyline",
                    shape: { points: allPoints },
                    style: { fill: "none", stroke: lineColor, lineWidth, lineDash: dashPattern },
                    silent: true
                  });
                }
              }
            }
            return { type: "group", children };
          },
          data: [[0, lastBarIndex]],
          clip: true,
          encode: { x: [0, 1] },
          // Prevent ECharts visual system from overriding element colors with palette
          itemStyle: { color: "transparent", borderColor: "transparent" },
          z: 15,
          silent: true,
          emphasis: { disabled: true }
        };
      }
      /**
       * Build an SVG path string for a smooth curve through all points
       * using Catmull-Rom → cubic bezier conversion.
       */
      buildCurvedPath(points, closed) {
        const n = points.length;
        if (n < 2)
          return "";
        if (n === 2) {
          return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;
        }
        const tension = 0.5;
        let path = `M ${points[0][0]} ${points[0][1]}`;
        const getPoint = (i) => {
          if (closed) {
            return points[(i % n + n) % n];
          }
          if (i < 0)
            return points[0];
          if (i >= n)
            return points[n - 1];
          return points[i];
        };
        const segmentCount = closed ? n : n - 1;
        for (let i = 0; i < segmentCount; i++) {
          const p0 = getPoint(i - 1);
          const p1 = getPoint(i);
          const p2 = getPoint(i + 1);
          const p3 = getPoint(i + 2);
          const cp1x = p1[0] + (p2[0] - p0[0]) * tension / 3;
          const cp1y = p1[1] + (p2[1] - p0[1]) * tension / 3;
          const cp2x = p2[0] - (p3[0] - p1[0]) * tension / 3;
          const cp2y = p2[1] - (p3[1] - p1[1]) * tension / 3;
          path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
        }
        if (closed) {
          path += " Z";
        }
        return path;
      }
      getDashPattern(style) {
        switch (style) {
          case "style_dotted":
            return [2, 2];
          case "style_dashed":
            return [6, 4];
          default:
            return void 0;
        }
      }
    }

    function normalizeColor(color) {
      if (!color || typeof color !== "string")
        return color;
      if (color.startsWith("#")) {
        const hex = color.slice(1);
        if (hex.length === 8) {
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          const a = parseInt(hex.slice(6, 8), 16) / 255;
          return `rgba(${r},${g},${b},${a.toFixed(3)})`;
        }
      }
      return color;
    }
    function parseRGB(color) {
      if (!color || typeof color !== "string")
        return null;
      if (color.startsWith("#")) {
        const hex = color.slice(1);
        if (hex.length >= 6) {
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          if (!isNaN(r) && !isNaN(g) && !isNaN(b))
            return { r, g, b };
        }
        if (hex.length === 3) {
          const r = parseInt(hex[0] + hex[0], 16);
          const g = parseInt(hex[1] + hex[1], 16);
          const b = parseInt(hex[2] + hex[2], 16);
          if (!isNaN(r) && !isNaN(g) && !isNaN(b))
            return { r, g, b };
        }
        return null;
      }
      const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (m)
        return { r: +m[1], g: +m[2], b: +m[3] };
      return null;
    }
    function luminance(r, g, b) {
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }
    class BoxRenderer {
      render(context) {
        const { seriesName, xAxisIndex, yAxisIndex, dataArray, dataIndexOffset } = context;
        const offset = dataIndexOffset || 0;
        const boxObjects = [];
        for (let i = 0; i < dataArray.length; i++) {
          const val = dataArray[i];
          if (!val)
            continue;
          const items = Array.isArray(val) ? val : [val];
          for (const bx of items) {
            if (bx && typeof bx === "object" && !bx._deleted) {
              boxObjects.push(bx);
            }
          }
        }
        if (boxObjects.length === 0) {
          return { name: seriesName, type: "custom", xAxisIndex, yAxisIndex, data: [], silent: true };
        }
        const totalBars = (context.candlestickData?.length || 0) + offset;
        const lastBarIndex = Math.max(0, totalBars - 1);
        return {
          name: seriesName,
          type: "custom",
          xAxisIndex,
          yAxisIndex,
          renderItem: (params, api) => {
            const children = [];
            for (const bx of boxObjects) {
              if (bx._deleted)
                continue;
              const xOff = bx.xloc === "bar_index" || bx.xloc === "bi" ? offset : 0;
              const pTopLeft = api.coord([bx.left + xOff, bx.top]);
              const pBottomRight = api.coord([bx.right + xOff, bx.bottom]);
              let x = pTopLeft[0];
              let y = pTopLeft[1];
              let w = pBottomRight[0] - pTopLeft[0];
              let h = pBottomRight[1] - pTopLeft[1];
              const extend = bx.extend || "none";
              if (extend !== "none" && extend !== "n") {
                const cs = params.coordSys;
                if (extend === "left" || extend === "l" || extend === "both" || extend === "b") {
                  x = cs.x;
                  w = extend === "both" || extend === "b" ? cs.width : pBottomRight[0] - cs.x;
                }
                if (extend === "right" || extend === "r" || extend === "both" || extend === "b") {
                  if (extend === "right" || extend === "r") {
                    w = cs.x + cs.width - pTopLeft[0];
                  }
                }
              }
              const rawBgColor = bx.bgcolor;
              const isNaBgColor = rawBgColor === null || rawBgColor === void 0 || typeof rawBgColor === "number" && isNaN(rawBgColor) || rawBgColor === "na" || rawBgColor === "NaN" || rawBgColor === "";
              const bgColor = isNaBgColor ? null : normalizeColor(rawBgColor) || "#2962ff";
              if (bgColor) {
                children.push({
                  type: "rect",
                  shape: { x, y, width: w, height: h },
                  style: { fill: bgColor, stroke: "none" }
                });
              }
              const rawBorderColor = bx.border_color;
              const isNaBorder = rawBorderColor === null || rawBorderColor === void 0 || typeof rawBorderColor === "number" && isNaN(rawBorderColor) || rawBorderColor === "na" || rawBorderColor === "NaN";
              const borderColor = isNaBorder ? null : normalizeColor(rawBorderColor) || "#2962ff";
              const borderWidth = bx.border_width ?? 1;
              if (borderWidth > 0 && borderColor) {
                children.push({
                  type: "rect",
                  shape: { x, y, width: w, height: h },
                  style: {
                    fill: "none",
                    stroke: borderColor,
                    lineWidth: borderWidth,
                    lineDash: this.getDashPattern(bx.border_style)
                  }
                });
              }
              if (bx.text) {
                const textX = this.getTextX(x, w, bx.text_halign);
                const textY = this.getTextY(y, h, bx.text_valign);
                let textFill = normalizeColor(bx.text_color) || "#000000";
                const isDefaultTextColor = !bx.text_color || bx.text_color === "#000000" || bx.text_color === "black" || bx.text_color === "color.black";
                if (isDefaultTextColor && bgColor) {
                  const rgb = parseRGB(bgColor);
                  if (rgb && luminance(rgb.r, rgb.g, rgb.b) < 0.5) {
                    textFill = "#FFFFFF";
                  }
                }
                const isBold = !bx.text_formatting || bx.text_formatting === "format_none" || bx.text_formatting === "format_bold";
                const fontSize = this.computeFontSize(bx.text_size, bx.text, Math.abs(w), Math.abs(h), isBold);
                children.push({
                  type: "text",
                  style: {
                    x: textX,
                    y: textY,
                    text: bx.text,
                    fill: textFill,
                    fontSize,
                    fontFamily: bx.text_font_family === "monospace" ? "monospace" : "sans-serif",
                    fontWeight: isBold ? "bold" : "normal",
                    fontStyle: bx.text_formatting === "format_italic" ? "italic" : "normal",
                    textAlign: this.mapHAlign(bx.text_halign),
                    textVerticalAlign: this.mapVAlign(bx.text_valign)
                  }
                });
              }
            }
            return { type: "group", children };
          },
          data: [[0, lastBarIndex]],
          clip: true,
          encode: { x: [0, 1] },
          // Prevent ECharts visual system from overriding element colors with palette
          itemStyle: { color: "transparent", borderColor: "transparent" },
          z: 14,
          silent: true,
          emphasis: { disabled: true }
        };
      }
      getDashPattern(style) {
        switch (style) {
          case "style_dotted":
            return [2, 2];
          case "style_dashed":
            return [6, 4];
          default:
            return void 0;
        }
      }
      /**
       * Compute font size for box text.
       * For 'auto'/'size.auto' (the default), dynamically scale text to fit within
       * the box dimensions with a small gap — matching TradingView behavior.
       * For explicit named sizes, return fixed pixel values.
       */
      computeFontSize(size, text, boxW, boxH, bold) {
        if (typeof size === "number" && size > 0)
          return size;
        switch (size) {
          case "tiny":
          case "size.tiny":
            return 8;
          case "small":
          case "size.small":
            return 10;
          case "normal":
          case "size.normal":
            return 14;
          case "large":
          case "size.large":
            return 20;
          case "huge":
          case "size.huge":
            return 36;
        }
        if (!text || boxW <= 0 || boxH <= 0)
          return 12;
        const padding = 6;
        const availW = boxW - padding * 2;
        const availH = boxH - padding * 2;
        if (availW <= 0 || availH <= 0)
          return 6;
        const lines = text.split("\n");
        const numLines = lines.length;
        let maxChars = 1;
        for (const line of lines) {
          if (line.length > maxChars)
            maxChars = line.length;
        }
        const charWidthRatio = bold ? 0.62 : 0.55;
        const maxByWidth = availW / (maxChars * charWidthRatio);
        const lineHeight = 1.3;
        const maxByHeight = availH / (numLines * lineHeight);
        const computed = Math.min(maxByWidth, maxByHeight);
        return Math.max(6, Math.min(computed, 48));
      }
      mapHAlign(align) {
        switch (align) {
          case "left":
          case "text.align_left":
            return "left";
          case "right":
          case "text.align_right":
            return "right";
          case "center":
          case "text.align_center":
          default:
            return "center";
        }
      }
      mapVAlign(align) {
        switch (align) {
          case "top":
          case "text.align_top":
            return "top";
          case "bottom":
          case "text.align_bottom":
            return "bottom";
          case "center":
          case "text.align_center":
          default:
            return "middle";
        }
      }
      getTextX(x, w, halign) {
        switch (halign) {
          case "left":
          case "text.align_left":
            return x + 4;
          case "right":
          case "text.align_right":
            return x + w - 4;
          case "center":
          case "text.align_center":
          default:
            return x + w / 2;
        }
      }
      getTextY(y, h, valign) {
        switch (valign) {
          case "top":
          case "text.align_top":
            return y + 4;
          case "bottom":
          case "text.align_bottom":
            return y + h - 4;
          case "center":
          case "text.align_center":
          default:
            return y + h / 2;
        }
      }
    }

    var __defProp$L = Object.defineProperty;
    var __defNormalProp$L = (obj, key, value) => key in obj ? __defProp$L(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$L = (obj, key, value) => {
      __defNormalProp$L(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const _SeriesRendererFactory = class _SeriesRendererFactory {
      static register(style, renderer) {
        this.renderers.set(style, renderer);
      }
      static get(style) {
        return this.renderers.get(style) || this.renderers.get("line");
      }
    };
    __publicField$L(_SeriesRendererFactory, "renderers", /* @__PURE__ */ new Map());
    _SeriesRendererFactory.register("line", new LineRenderer());
    _SeriesRendererFactory.register("step", new StepRenderer());
    _SeriesRendererFactory.register("histogram", new HistogramRenderer());
    _SeriesRendererFactory.register("columns", new HistogramRenderer());
    _SeriesRendererFactory.register("circles", new ScatterRenderer());
    _SeriesRendererFactory.register("cross", new ScatterRenderer());
    _SeriesRendererFactory.register("char", new ScatterRenderer());
    _SeriesRendererFactory.register("bar", new OHLCBarRenderer());
    _SeriesRendererFactory.register("candle", new OHLCBarRenderer());
    _SeriesRendererFactory.register("shape", new ShapeRenderer());
    _SeriesRendererFactory.register("background", new BackgroundRenderer());
    _SeriesRendererFactory.register("fill", new FillRenderer());
    _SeriesRendererFactory.register("label", new LabelRenderer());
    _SeriesRendererFactory.register("drawing_line", new DrawingLineRenderer());
    _SeriesRendererFactory.register("linefill", new LinefillRenderer());
    _SeriesRendererFactory.register("drawing_polyline", new PolylineRenderer());
    _SeriesRendererFactory.register("drawing_box", new BoxRenderer());
    let SeriesRendererFactory = _SeriesRendererFactory;

    var __defProp$K = Object.defineProperty;
    var __defNormalProp$K = (obj, key, value) => key in obj ? __defProp$K(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$K = (obj, key, value) => {
      __defNormalProp$K(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const _SeriesBuilder = class _SeriesBuilder {
      static buildCandlestickSeries(marketData, options, totalLength) {
        const upColor = options.upColor || "#00da3c";
        const downColor = options.downColor || "#ec0000";
        const data = marketData.map((d) => [d.open, d.close, d.low, d.high]);
        if (totalLength && totalLength > data.length) {
          const padding = totalLength - data.length;
          for (let i = 0; i < padding; i++) {
            data.push(null);
          }
        }
        let markLine = void 0;
        if (options.lastPriceLine?.visible !== false && marketData.length > 0) {
          const lastBar = marketData[marketData.length - 1];
          const lastClose = lastBar.close;
          const isUp = lastBar.close >= lastBar.open;
          const lineColor = options.lastPriceLine?.color || (isUp ? upColor : downColor);
          let lineStyleType = options.lastPriceLine?.lineStyle || "dashed";
          if (lineStyleType.startsWith("linestyle_")) {
            lineStyleType = lineStyleType.replace("linestyle_", "");
          }
          const decimals = options.yAxisDecimalPlaces !== void 0 ? options.yAxisDecimalPlaces : AxisUtils.autoDetectDecimals(marketData);
          markLine = {
            symbol: ["none", "none"],
            precision: decimals,
            // Ensure line position is precise enough for small values
            data: [
              {
                yAxis: lastClose,
                label: {
                  show: true,
                  position: "end",
                  // Right side
                  formatter: (params) => {
                    if (options.yAxisLabelFormatter) {
                      return options.yAxisLabelFormatter(params.value);
                    }
                    return AxisUtils.formatValue(params.value, decimals);
                  },
                  color: "#fff",
                  backgroundColor: lineColor,
                  padding: [2, 4],
                  borderRadius: 2,
                  fontSize: 11,
                  fontWeight: "bold"
                },
                lineStyle: {
                  color: lineColor,
                  type: lineStyleType,
                  width: 1,
                  opacity: 0.8
                }
              }
            ],
            animation: false,
            silent: true
            // Disable interaction
          };
        }
        return {
          type: "candlestick",
          id: "__candlestick__",
          name: options.title,
          data,
          itemStyle: {
            color: upColor,
            color0: downColor,
            borderColor: upColor,
            borderColor0: downColor
          },
          markLine,
          xAxisIndex: 0,
          yAxisIndex: 0,
          z: 5
        };
      }
      static buildIndicatorSeries(indicators, timeToIndex, paneLayout, totalDataLength, dataIndexOffset = 0, candlestickData, overlayYAxisMap, separatePaneYAxisOffset = 1) {
        const series = [];
        const barColors = new Array(totalDataLength).fill(null);
        const plotDataArrays = /* @__PURE__ */ new Map();
        indicators.forEach((indicator, id) => {
          if (indicator.collapsed)
            return;
          const sortedPlots = Object.keys(indicator.plots).sort((a, b) => {
            const plotA = indicator.plots[a];
            const plotB = indicator.plots[b];
            const isFillA = plotA.options.style === "fill";
            const isFillB = plotB.options.style === "fill";
            if (isFillA && !isFillB)
              return 1;
            if (!isFillA && isFillB)
              return -1;
            return 0;
          });
          const pendingFills = /* @__PURE__ */ new Map();
          sortedPlots.forEach((plotName) => {
            const plot = indicator.plots[plotName];
            const isDisplayNone = plot.options.display === "none";
            const seriesName = `${id}::${plotName}`;
            let xAxisIndex = 0;
            let yAxisIndex = 0;
            let plotOverlay = plot.options.overlay;
            if (plot.options.style === "fill" && plotOverlay === void 0) {
              const p1Name = plot.options.plot1;
              const p2Name = plot.options.plot2;
              if (p1Name && p2Name) {
                const p1 = indicator.plots[p1Name];
                const p2 = indicator.plots[p2Name];
                if (p1?.options?.overlay === true && p2?.options?.overlay === true) {
                  plotOverlay = true;
                }
              }
            }
            const isPlotOverlay = indicator.paneIndex === 0 || plotOverlay === true;
            if (isPlotOverlay) {
              xAxisIndex = 0;
              if (overlayYAxisMap && overlayYAxisMap.has(seriesName)) {
                yAxisIndex = overlayYAxisMap.get(seriesName);
              } else {
                yAxisIndex = 0;
              }
            } else {
              const confIndex = paneLayout.findIndex((p) => p.index === indicator.paneIndex);
              if (confIndex !== -1) {
                xAxisIndex = confIndex + 1;
                yAxisIndex = separatePaneYAxisOffset + confIndex;
              }
            }
            const dataArray = new Array(totalDataLength).fill(null);
            const rawDataArray = new Array(totalDataLength).fill(null);
            const colorArray = new Array(totalDataLength).fill(null);
            const optionsArray = new Array(totalDataLength).fill(null);
            plot.data?.forEach((point) => {
              const index = timeToIndex.get(point.time);
              if (index !== void 0) {
                const plotOffset = point.options?.offset ?? plot.options.offset ?? 0;
                const offsetIndex = index + dataIndexOffset + plotOffset;
                if (offsetIndex >= 0 && offsetIndex < totalDataLength) {
                  let value = point.value;
                  const pointColor = point.options?.color;
                  rawDataArray[offsetIndex] = value;
                  const hasExplicitColorKey = point.options != null && "color" in point.options;
                  const isNaColor = pointColor === null || pointColor === "na" || pointColor === "NaN" || typeof pointColor === "number" && isNaN(pointColor) || hasExplicitColorKey && pointColor === void 0;
                  if (isNaColor) {
                    value = null;
                  }
                  dataArray[offsetIndex] = value;
                  colorArray[offsetIndex] = isNaColor ? null : pointColor || plot.options.color || _SeriesBuilder.DEFAULT_COLOR;
                  optionsArray[offsetIndex] = point.options || {};
                }
              }
            });
            plotDataArrays.set(`${id}::${plotName}`, rawDataArray);
            if (isDisplayNone)
              return;
            if (plot.options?.style?.startsWith("style_")) {
              plot.options.style = plot.options.style.replace("style_", "");
            }
            if (plot.options.style === "barcolor") {
              plot.data?.forEach((point) => {
                const index = timeToIndex.get(point.time);
                if (index !== void 0) {
                  const plotOffset = point.options?.offset ?? plot.options.offset ?? 0;
                  const offsetIndex = index + dataIndexOffset + plotOffset;
                  if (offsetIndex >= 0 && offsetIndex < totalDataLength) {
                    const pointColor = point.options?.color || plot.options.color || _SeriesBuilder.DEFAULT_COLOR;
                    const isNaColor = pointColor === null || pointColor === "na" || pointColor === "NaN" || typeof pointColor === "number" && isNaN(pointColor);
                    if (!isNaColor && point.value !== null && point.value !== void 0) {
                      barColors[offsetIndex] = pointColor;
                    }
                  }
                }
              });
              return;
            }
            if (plot.options.style === "table") {
              return;
            }
            if (plot.options.style === "fill" && plot.options.gradient !== true) {
              const plot1Key = plot.options.plot1 ? `${id}::${plot.options.plot1}` : null;
              const plot2Key = plot.options.plot2 ? `${id}::${plot.options.plot2}` : null;
              if (plot1Key && plot2Key) {
                const plot1Data = plotDataArrays.get(plot1Key);
                const plot2Data = plotDataArrays.get(plot2Key);
                if (plot1Data && plot2Data) {
                  const { color: defaultColor, opacity: defaultOpacity } = ColorUtils.parseColor(
                    plot.options.color || "rgba(128, 128, 128, 0.2)"
                  );
                  const hasPerBarColor = optionsArray.some((o) => o && o.color !== void 0);
                  const fillBarColors = [];
                  for (let i = 0; i < totalDataLength; i++) {
                    const opts = optionsArray[i];
                    if (hasPerBarColor && opts && opts.color !== void 0) {
                      fillBarColors[i] = ColorUtils.parseColor(opts.color);
                    } else {
                      fillBarColors[i] = { color: defaultColor, opacity: defaultOpacity };
                    }
                  }
                  const axisKey = `${xAxisIndex}:${yAxisIndex}`;
                  if (!pendingFills.has(axisKey)) {
                    pendingFills.set(axisKey, { entries: [], xAxisIndex, yAxisIndex });
                  }
                  pendingFills.get(axisKey).entries.push({
                    plot1Data,
                    plot2Data,
                    barColors: fillBarColors
                  });
                  return;
                }
              }
            }
            if (plot.options.color && typeof plot.options.color === "string") {
              const parsed = ColorUtils.parseColor(plot.options.color);
              if (parsed.opacity < 0.01) {
                const hasVisibleBarColor = colorArray.some((c) => {
                  if (c == null)
                    return false;
                  const pc = ColorUtils.parseColor(c);
                  return pc.opacity >= 0.01;
                });
                if (!hasVisibleBarColor) {
                  return;
                }
              }
            }
            const renderer = SeriesRendererFactory.get(plot.options.style);
            const seriesConfig = renderer.render({
              seriesName,
              xAxisIndex,
              yAxisIndex,
              dataArray,
              colorArray,
              optionsArray,
              plotOptions: plot.options,
              candlestickData,
              plotDataArrays,
              indicatorId: id,
              plotName,
              dataIndexOffset
            });
            if (seriesConfig) {
              series.push(seriesConfig);
            }
          });
          if (pendingFills.size > 0) {
            const fillRenderer = new FillRenderer();
            pendingFills.forEach(({ entries, xAxisIndex, yAxisIndex }, axisKey) => {
              if (entries.length >= 2) {
                const batchedConfig = fillRenderer.renderBatched(
                  `${id}::fills_batch_${axisKey}`,
                  xAxisIndex,
                  yAxisIndex,
                  totalDataLength,
                  entries
                );
                if (batchedConfig) {
                  series.push(batchedConfig);
                }
              } else if (entries.length === 1) {
                const batchedConfig = fillRenderer.renderBatched(
                  `${id}::fills_batch_${axisKey}`,
                  xAxisIndex,
                  yAxisIndex,
                  totalDataLength,
                  entries
                );
                if (batchedConfig) {
                  series.push(batchedConfig);
                }
              }
            });
          }
        });
        return { series, barColors };
      }
    };
    __publicField$K(_SeriesBuilder, "DEFAULT_COLOR", "#2962ff");
    let SeriesBuilder = _SeriesBuilder;

    class GraphicBuilder {
      static build(layout, options, onToggle, isMainCollapsed = false, maximizedPaneId = null, overlayIndicators = []) {
        const graphic = [];
        const pixelToPercent = layout.pixelToPercent;
        const mainPaneTop = layout.mainPaneTop;
        const showMain = !maximizedPaneId || maximizedPaneId === "main";
        if (showMain) {
          const titleTopMargin = 10 * pixelToPercent;
          graphic.push({
            type: "text",
            left: "8.5%",
            top: mainPaneTop + titleTopMargin + "%",
            z: 10,
            style: {
              text: options.title || "",
              fill: options.titleColor || "#fff",
              font: `bold 16px ${options.fontFamily || "sans-serif"}`,
              textVerticalAlign: "top"
            }
          });
          if (overlayIndicators.length > 0) {
            const mainTitleHeight = 20 * pixelToPercent;
            const overlayLineHeight = 16 * pixelToPercent;
            overlayIndicators.forEach((overlay, i) => {
              graphic.push({
                type: "text",
                left: "8.5%",
                top: mainPaneTop + titleTopMargin + mainTitleHeight + i * overlayLineHeight + "%",
                z: 10,
                style: {
                  text: overlay.id,
                  fill: overlay.titleColor || "#9e9e9e",
                  font: `bold 12px ${options.fontFamily || "sans-serif"}`,
                  textVerticalAlign: "top"
                }
              });
            });
          }
          if (options.watermark !== false) {
            const bottomY = layout.mainPaneTop + layout.mainPaneHeight;
            graphic.push({
              type: "text",
              right: "11%",
              top: bottomY - 3 + "%",
              // Position 5% from bottom of main chart
              z: 10,
              style: {
                text: "QFChart",
                fill: options.fontColor || "#cbd5e1",
                font: `bold 16px sans-serif`,
                opacity: 0.1
              },
              cursor: "pointer",
              onclick: () => {
                window.open("https://quantforge.org", "_blank");
              }
            });
          }
          const controls = [];
          if (options.controls?.collapse) {
            controls.push({
              type: "group",
              children: [
                {
                  type: "rect",
                  shape: { width: 20, height: 20, r: 2 },
                  style: { fill: "#334155", stroke: "#475569", lineWidth: 1 },
                  onclick: () => onToggle("main", "collapse")
                },
                {
                  type: "text",
                  style: {
                    text: isMainCollapsed ? "+" : "\u2212",
                    fill: "#cbd5e1",
                    font: `bold 14px ${options.fontFamily}`,
                    x: 10,
                    y: 10,
                    textAlign: "center",
                    textVerticalAlign: "middle"
                  },
                  silent: true
                }
              ]
            });
          }
          if (options.controls?.maximize) {
            const isMaximized = maximizedPaneId === "main";
            const xOffset = options.controls?.collapse ? 25 : 0;
            controls.push({
              type: "group",
              x: xOffset,
              children: [
                {
                  type: "rect",
                  shape: { width: 20, height: 20, r: 2 },
                  style: { fill: "#334155", stroke: "#475569", lineWidth: 1 },
                  onclick: () => onToggle("main", "maximize")
                },
                {
                  type: "text",
                  style: {
                    text: isMaximized ? "\u2750" : "\u25A1",
                    // Simple chars for now
                    fill: "#cbd5e1",
                    font: `14px ${options.fontFamily}`,
                    x: 10,
                    y: 10,
                    textAlign: "center",
                    textVerticalAlign: "middle"
                  },
                  silent: true
                }
              ]
            });
          }
          if (options.controls?.fullscreen) {
            let xOffset = 0;
            if (options.controls?.collapse)
              xOffset += 25;
            if (options.controls?.maximize)
              xOffset += 25;
            controls.push({
              type: "group",
              x: xOffset,
              children: [
                {
                  type: "rect",
                  shape: { width: 20, height: 20, r: 2 },
                  style: { fill: "#334155", stroke: "#475569", lineWidth: 1 },
                  onclick: () => onToggle("main", "fullscreen")
                },
                {
                  type: "text",
                  style: {
                    text: "\u26F6",
                    fill: "#cbd5e1",
                    font: `14px ${options.fontFamily}`,
                    x: 10,
                    y: 10,
                    textAlign: "center",
                    textVerticalAlign: "middle"
                  },
                  silent: true
                }
              ]
            });
          }
          if (controls.length > 0) {
            graphic.push({
              type: "group",
              right: "10.5%",
              top: mainPaneTop + "%",
              children: controls
            });
          }
        }
        layout.paneLayout.forEach((pane) => {
          if (maximizedPaneId && pane.indicatorId !== maximizedPaneId) {
            return;
          }
          graphic.push({
            type: "text",
            left: "8.5%",
            top: pane.top + 10 * pixelToPercent + "%",
            z: 10,
            style: {
              text: pane.indicatorId || "",
              fill: pane.titleColor || "#fff",
              font: `bold 12px ${options.fontFamily || "sans-serif"}`,
              textVerticalAlign: "top"
            }
          });
          const controls = [];
          if (pane.controls?.collapse) {
            controls.push({
              type: "group",
              children: [
                {
                  type: "rect",
                  shape: { width: 20, height: 20, r: 2 },
                  style: { fill: "#334155", stroke: "#475569", lineWidth: 1 },
                  onclick: () => pane.indicatorId && onToggle(pane.indicatorId, "collapse")
                },
                {
                  type: "text",
                  style: {
                    text: pane.isCollapsed ? "+" : "\u2212",
                    fill: "#cbd5e1",
                    font: `bold 14px ${options.fontFamily}`,
                    x: 10,
                    y: 10,
                    textAlign: "center",
                    textVerticalAlign: "middle"
                  },
                  silent: true
                }
              ]
            });
          }
          if (pane.controls?.maximize) {
            const isMaximized = maximizedPaneId === pane.indicatorId;
            const xOffset = pane.controls?.collapse ? 25 : 0;
            controls.push({
              type: "group",
              x: xOffset,
              children: [
                {
                  type: "rect",
                  shape: { width: 20, height: 20, r: 2 },
                  style: { fill: "#334155", stroke: "#475569", lineWidth: 1 },
                  onclick: () => pane.indicatorId && onToggle(pane.indicatorId, "maximize")
                },
                {
                  type: "text",
                  style: {
                    text: isMaximized ? "\u2750" : "\u25A1",
                    fill: "#cbd5e1",
                    font: `14px ${options.fontFamily}`,
                    x: 10,
                    y: 10,
                    textAlign: "center",
                    textVerticalAlign: "middle"
                  },
                  silent: true
                }
              ]
            });
          }
          if (controls.length > 0) {
            graphic.push({
              type: "group",
              right: "10.5%",
              top: pane.top + "%",
              children: controls
            });
          }
        });
        return graphic;
      }
    }

    class TooltipFormatter {
      static format(params, options) {
        if (!params || params.length === 0)
          return "";
        const marketName = options.title || "";
        const upColor = options.upColor || "#00da3c";
        const downColor = options.downColor || "#ec0000";
        const fontFamily = options.fontFamily || "sans-serif";
        const date = params[0].axisValue;
        let html = `<div style="font-weight: bold; margin-bottom: 5px; color: #cbd5e1; font-family: ${fontFamily};">${date}</div>`;
        const marketSeries = params.find(
          (p) => p.seriesType === "candlestick"
        );
        const indicatorParams = params.filter(
          (p) => p.seriesType !== "candlestick"
        );
        if (marketSeries) {
          const [_, open, close, low, high] = marketSeries.value;
          const color = close >= open ? upColor : downColor;
          html += `
            <div style="margin-bottom: 8px; font-family: ${fontFamily};">
                <div style="display:flex; justify-content:space-between; color:${color}; font-weight:bold;">
                    <span>${marketName}</span>
                </div>
                <div style="display: grid; grid-template-columns: auto auto; gap: 2px 15px; font-size: 0.9em; color: #cbd5e1;">
                    <span>Open:</span> <span style="text-align: right; color: ${close >= open ? upColor : downColor}">${open}</span>
                    <span>High:</span> <span style="text-align: right; color: ${upColor}">${high}</span>
                    <span>Low:</span> <span style="text-align: right; color: ${downColor}">${low}</span>
                    <span>Close:</span> <span style="text-align: right; color: ${close >= open ? upColor : downColor}">${close}</span>
                </div>
            </div>
            `;
        }
        if (indicatorParams.length > 0) {
          html += `<div style="border-top: 1px solid #334155; margin: 5px 0; padding-top: 5px;"></div>`;
          const indicators = {};
          indicatorParams.forEach((p) => {
            const parts = p.seriesName.split("::");
            const indId = parts.length > 1 ? parts[0] : "Unknown";
            const plotName = parts.length > 1 ? parts[1] : p.seriesName;
            if (!indicators[indId])
              indicators[indId] = [];
            indicators[indId].push({ ...p, displayName: plotName });
          });
          Object.keys(indicators).forEach((indId) => {
            html += `
            <div style="margin-top: 8px; font-family: ${fontFamily};">
                <div style="font-weight:bold; color: #fff; margin-bottom: 2px;">${indId}</div>
            `;
            indicators[indId].forEach((p) => {
              let val = p.value;
              if (Array.isArray(val)) {
                val = val[1];
              }
              if (val === null || val === void 0)
                return;
              const valStr = typeof val === "number" ? val.toLocaleString(void 0, { maximumFractionDigits: 4 }) : val;
              html += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; padding-left: 8px;">
                    <div>${p.marker} <span style="color: #cbd5e1;">${p.displayName}</span></div>
                    <div style="font-size: 10px; color: #fff;padding-left:10px;">${valStr}</div>
                </div>`;
            });
            html += `</div>`;
          });
        }
        return html;
      }
    }

    var __defProp$J = Object.defineProperty;
    var __defNormalProp$J = (obj, key, value) => key in obj ? __defProp$J(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$J = (obj, key, value) => {
      __defNormalProp$J(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class PluginManager {
      constructor(context, toolbarContainer) {
        __publicField$J(this, "plugins", /* @__PURE__ */ new Map());
        __publicField$J(this, "activePluginId", null);
        __publicField$J(this, "context");
        __publicField$J(this, "toolbarContainer");
        __publicField$J(this, "tooltipElement", null);
        __publicField$J(this, "hideTimeout", null);
        this.context = context;
        this.toolbarContainer = toolbarContainer;
        this.createTooltip();
        this.renderToolbar();
      }
      createTooltip() {
        this.tooltipElement = document.createElement("div");
        Object.assign(this.tooltipElement.style, {
          position: "fixed",
          display: "none",
          backgroundColor: "#1e293b",
          color: "#e2e8f0",
          padding: "6px 10px",
          borderRadius: "6px",
          fontSize: "13px",
          lineHeight: "1.4",
          fontWeight: "500",
          border: "1px solid #334155",
          zIndex: "9999",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.15)",
          fontFamily: this.context.getOptions().fontFamily || "sans-serif",
          transition: "opacity 0.15s ease-in-out, transform 0.15s ease-in-out",
          opacity: "0",
          transform: "translateX(-5px)"
        });
        document.body.appendChild(this.tooltipElement);
      }
      destroy() {
        if (this.tooltipElement && this.tooltipElement.parentNode) {
          this.tooltipElement.parentNode.removeChild(this.tooltipElement);
        }
        this.tooltipElement = null;
      }
      showTooltip(target, text) {
        if (!this.tooltipElement)
          return;
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
          this.hideTimeout = null;
        }
        const rect = target.getBoundingClientRect();
        this.tooltipElement.textContent = text;
        this.tooltipElement.style.display = "block";
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        const top = rect.top + (rect.height - tooltipRect.height) / 2;
        const left = rect.right + 10;
        this.tooltipElement.style.top = `${top}px`;
        this.tooltipElement.style.left = `${left}px`;
        requestAnimationFrame(() => {
          if (this.tooltipElement) {
            this.tooltipElement.style.opacity = "1";
            this.tooltipElement.style.transform = "translateX(0)";
          }
        });
      }
      hideTooltip() {
        if (!this.tooltipElement)
          return;
        this.tooltipElement.style.opacity = "0";
        this.tooltipElement.style.transform = "translateX(-5px)";
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
        }
        this.hideTimeout = setTimeout(() => {
          if (this.tooltipElement) {
            this.tooltipElement.style.display = "none";
          }
          this.hideTimeout = null;
        }, 150);
      }
      register(plugin) {
        if (this.plugins.has(plugin.id)) {
          console.warn(`Plugin with id ${plugin.id} is already registered.`);
          return;
        }
        this.plugins.set(plugin.id, plugin);
        plugin.init(this.context);
        this.addButton(plugin);
      }
      unregister(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
          if (this.activePluginId === pluginId) {
            this.deactivatePlugin();
          }
          plugin.destroy?.();
          this.plugins.delete(pluginId);
          this.removeButton(pluginId);
        }
      }
      activatePlugin(pluginId) {
        if (this.activePluginId === pluginId) {
          this.deactivatePlugin();
          return;
        }
        if (this.activePluginId) {
          this.deactivatePlugin();
        }
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
          this.activePluginId = pluginId;
          this.setButtonActive(pluginId, true);
          plugin.activate?.();
        }
      }
      deactivatePlugin() {
        if (this.activePluginId) {
          const plugin = this.plugins.get(this.activePluginId);
          plugin?.deactivate?.();
          this.setButtonActive(this.activePluginId, false);
          this.activePluginId = null;
        }
      }
      // --- UI Handling ---
      renderToolbar() {
        this.toolbarContainer.innerHTML = "";
        this.toolbarContainer.classList.add("qfchart-toolbar");
        this.toolbarContainer.style.display = "flex";
        this.toolbarContainer.style.flexDirection = "column";
        this.toolbarContainer.style.width = "40px";
        this.toolbarContainer.style.backgroundColor = this.context.getOptions().backgroundColor || "#1e293b";
        this.toolbarContainer.style.borderRight = "1px solid #334155";
        this.toolbarContainer.style.padding = "5px";
        this.toolbarContainer.style.boxSizing = "border-box";
        this.toolbarContainer.style.gap = "5px";
        this.toolbarContainer.style.flexShrink = "0";
      }
      addButton(plugin) {
        const btn = document.createElement("button");
        btn.id = `qfchart-plugin-btn-${plugin.id}`;
        btn.style.width = "30px";
        btn.style.height = "30px";
        btn.style.padding = "4px";
        btn.style.border = "1px solid transparent";
        btn.style.borderRadius = "4px";
        btn.style.backgroundColor = "transparent";
        btn.style.cursor = "pointer";
        btn.style.color = this.context.getOptions().fontColor || "#cbd5e1";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        if (plugin.icon) {
          btn.innerHTML = plugin.icon;
        } else {
          btn.innerText = (plugin.name || plugin.id).substring(0, 2).toUpperCase();
        }
        btn.addEventListener("mouseenter", () => {
          if (this.activePluginId !== plugin.id) {
            btn.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
          }
          this.showTooltip(btn, plugin.name || plugin.id);
        });
        btn.addEventListener("mouseleave", () => {
          if (this.activePluginId !== plugin.id) {
            btn.style.backgroundColor = "transparent";
          }
          this.hideTooltip();
        });
        btn.onclick = () => this.activatePlugin(plugin.id);
        this.toolbarContainer.appendChild(btn);
      }
      removeButton(pluginId) {
        const btn = this.toolbarContainer.querySelector(`#qfchart-plugin-btn-${pluginId}`);
        if (btn) {
          btn.remove();
        }
      }
      setButtonActive(pluginId, active) {
        const btn = this.toolbarContainer.querySelector(`#qfchart-plugin-btn-${pluginId}`);
        if (btn) {
          if (active) {
            btn.style.backgroundColor = "#2563eb";
            btn.style.color = "#ffffff";
          } else {
            btn.style.backgroundColor = "transparent";
            btn.style.color = this.context.getOptions().fontColor || "#cbd5e1";
          }
        }
      }
    }

    var __defProp$I = Object.defineProperty;
    var __defNormalProp$I = (obj, key, value) => key in obj ? __defProp$I(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$I = (obj, key, value) => {
      __defNormalProp$I(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class DrawingEditor {
      constructor(context) {
        __publicField$I(this, "context");
        __publicField$I(this, "isEditing", false);
        __publicField$I(this, "currentDrawing", null);
        __publicField$I(this, "editingPointIndex", null);
        __publicField$I(this, "zr");
        // Temporary ZRender elements for visual feedback during drag
        __publicField$I(this, "editGroup", null);
        __publicField$I(this, "editLines", []);
        __publicField$I(this, "editPoints", []);
        __publicField$I(this, "isMovingShape", false);
        __publicField$I(this, "dragStart", null);
        __publicField$I(this, "initialPixelPoints", []);
        __publicField$I(this, "onDrawingMouseDown", (payload) => {
          if (this.isEditing)
            return;
          const drawing = this.context.getDrawing(payload.id);
          if (!drawing)
            return;
          this.isEditing = true;
          this.isMovingShape = true;
          this.currentDrawing = JSON.parse(JSON.stringify(drawing));
          this.dragStart = { x: payload.x, y: payload.y };
          this.initialPixelPoints = drawing.points.map((p) => {
            const pixel = this.context.coordinateConversion.dataToPixel(p);
            return pixel ? { x: pixel.x, y: pixel.y } : { x: 0, y: 0 };
          });
          this.context.lockChart();
          this.createEditGraphic();
          this.zr.on("mousemove", this.onMouseMove);
          this.zr.on("mouseup", this.onMouseUp);
          window.addEventListener("mouseup", this.onWindowMouseUp);
        });
        __publicField$I(this, "onPointMouseDown", (payload) => {
          if (this.isEditing)
            return;
          const drawing = this.context.getDrawing(payload.id);
          if (!drawing)
            return;
          this.isEditing = true;
          this.currentDrawing = JSON.parse(JSON.stringify(drawing));
          this.editingPointIndex = payload.pointIndex;
          this.initialPixelPoints = drawing.points.map((p) => {
            const pixel = this.context.coordinateConversion.dataToPixel(p);
            return pixel ? { x: pixel.x, y: pixel.y } : { x: 0, y: 0 };
          });
          this.context.lockChart();
          this.createEditGraphic();
          this.zr.on("mousemove", this.onMouseMove);
          this.zr.on("mouseup", this.onMouseUp);
          window.addEventListener("mouseup", this.onWindowMouseUp);
        });
        __publicField$I(this, "onMouseMove", (e) => {
          if (!this.isEditing || !this.currentDrawing)
            return;
          const x = e.offsetX;
          const y = e.offsetY;
          if (this.isMovingShape && this.dragStart) {
            const dx = x - this.dragStart.x;
            const dy = y - this.dragStart.y;
            const newPts = this.initialPixelPoints.map((p) => ({
              x: p.x + dx,
              y: p.y + dy
            }));
            for (let i = 0; i < this.editLines.length; i++) {
              this.editLines[i].setShape({
                x1: newPts[i].x,
                y1: newPts[i].y,
                x2: newPts[i + 1].x,
                y2: newPts[i + 1].y
              });
            }
            for (let i = 0; i < this.editPoints.length; i++) {
              this.editPoints[i].setShape({ cx: newPts[i].x, cy: newPts[i].y });
            }
          } else if (this.editingPointIndex !== null) {
            const newPts = this.initialPixelPoints.map((p) => ({ x: p.x, y: p.y }));
            newPts[this.editingPointIndex] = { x, y };
            for (let i = 0; i < this.editLines.length; i++) {
              this.editLines[i].setShape({
                x1: newPts[i].x,
                y1: newPts[i].y,
                x2: newPts[i + 1].x,
                y2: newPts[i + 1].y
              });
            }
            this.editPoints[this.editingPointIndex].setShape({ cx: x, cy: y });
          }
        });
        __publicField$I(this, "onMouseUp", (e) => {
          if (!this.isEditing)
            return;
          this.finishEditing(e.offsetX, e.offsetY);
        });
        /**
         * Safety net: catches mouseup when the cursor leaves the canvas area.
         * Uses the last known pixel positions to compute the final drop location
         * relative to the chart container.
         */
        __publicField$I(this, "onWindowMouseUp", (e) => {
          if (!this.isEditing)
            return;
          const dom = this.zr.dom;
          if (dom) {
            const rect = dom.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;
            this.finishEditing(offsetX, offsetY);
          } else {
            this.finishEditing(this.dragStart?.x ?? 0, this.dragStart?.y ?? 0);
          }
        });
        this.context = context;
        this.zr = this.context.getChart().getZr();
        this.bindEvents();
      }
      bindEvents() {
        this.context.events.on("drawing:point:mousedown", this.onPointMouseDown);
        this.context.events.on("drawing:mousedown", this.onDrawingMouseDown);
      }
      createEditGraphic() {
        if (!this.currentDrawing)
          return;
        this.editGroup = new echarts__namespace.graphic.Group();
        this.editLines = [];
        this.editPoints = [];
        const pixelPts = this.currentDrawing.points.map((p) => {
          const px = this.context.coordinateConversion.dataToPixel(p);
          return px ? { x: px.x, y: px.y } : null;
        });
        if (pixelPts.some((p) => !p))
          return;
        const pts = pixelPts;
        for (let i = 0; i < pts.length - 1; i++) {
          const line = new echarts__namespace.graphic.Line({
            shape: { x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y },
            style: {
              stroke: this.currentDrawing.style?.color || "#3b82f6",
              lineWidth: this.currentDrawing.style?.lineWidth || 2,
              lineDash: [4, 4]
            },
            silent: true
          });
          this.editLines.push(line);
          this.editGroup.add(line);
        }
        for (let i = 0; i < pts.length; i++) {
          const circle = new echarts__namespace.graphic.Circle({
            shape: { cx: pts[i].x, cy: pts[i].y, r: 5 },
            style: { fill: "#fff", stroke: "#3b82f6", lineWidth: 2 },
            z: 1e3
          });
          this.editPoints.push(circle);
          this.editGroup.add(circle);
        }
        this.zr.add(this.editGroup);
      }
      /**
       * Convert pixel to data, falling back to the drawing's known pane
       * when the point is outside the grid (e.g., dragged beyond viewport).
       * Uses convertFromPixel with the specific gridIndex directly, bypassing
       * the containPixel check that would return null for out-of-bounds points.
       */
      pixelToDataForPane(x, y, paneIndex) {
        const normal = this.context.coordinateConversion.pixelToData({ x, y });
        if (normal)
          return normal;
        try {
          const chart = this.context.getChart();
          const p = chart.convertFromPixel({ gridIndex: paneIndex }, [x, y]);
          if (p) {
            const option = chart.getOption();
            const xAxisData = option?.xAxis?.[paneIndex]?.data;
            const marketData = this.context.getMarketData();
            const dataIndexOffset = xAxisData ? Math.round((xAxisData.length - marketData.length) / 2) : 0;
            return { timeIndex: Math.round(p[0]) - dataIndexOffset, value: p[1], paneIndex };
          }
        } catch (_) {
        }
        return null;
      }
      finishEditing(finalX, finalY) {
        if (!this.currentDrawing) {
          this.cleanup();
          return;
        }
        const paneIndex = this.currentDrawing.paneIndex || 0;
        if (this.isMovingShape && this.dragStart) {
          const dx = finalX - this.dragStart.x;
          const dy = finalY - this.dragStart.y;
          const newPoints = this.initialPixelPoints.map(
            (p) => this.pixelToDataForPane(p.x + dx, p.y + dy, paneIndex)
          );
          if (newPoints.every((p) => p !== null)) {
            for (let i = 0; i < newPoints.length; i++) {
              this.currentDrawing.points[i] = newPoints[i];
            }
            if (newPoints[0]?.paneIndex !== void 0) {
              this.currentDrawing.paneIndex = newPoints[0].paneIndex;
            }
            this.context.updateDrawing(this.currentDrawing);
          }
        } else if (this.editingPointIndex !== null) {
          const newData = this.pixelToDataForPane(finalX, finalY, paneIndex);
          if (newData) {
            this.currentDrawing.points[this.editingPointIndex] = newData;
            if (this.editingPointIndex === 0 && newData.paneIndex !== void 0) {
              this.currentDrawing.paneIndex = newData.paneIndex;
            }
            this.context.updateDrawing(this.currentDrawing);
          }
        }
        this.cleanup();
      }
      cleanup() {
        this.isEditing = false;
        this.isMovingShape = false;
        this.dragStart = null;
        this.initialPixelPoints = [];
        this.currentDrawing = null;
        this.editingPointIndex = null;
        this.editLines = [];
        this.editPoints = [];
        if (this.editGroup) {
          this.zr.remove(this.editGroup);
          this.editGroup = null;
        }
        this.zr.off("mousemove", this.onMouseMove);
        this.zr.off("mouseup", this.onMouseUp);
        window.removeEventListener("mouseup", this.onWindowMouseUp);
        this.context.unlockChart();
      }
    }

    var __defProp$H = Object.defineProperty;
    var __defNormalProp$H = (obj, key, value) => key in obj ? __defProp$H(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$H = (obj, key, value) => {
      __defNormalProp$H(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class DrawingRendererRegistry {
      constructor() {
        __publicField$H(this, "renderers", /* @__PURE__ */ new Map());
      }
      register(renderer) {
        this.renderers.set(renderer.type, renderer);
      }
      get(type) {
        return this.renderers.get(type);
      }
    }

    var __defProp$G = Object.defineProperty;
    var __defNormalProp$G = (obj, key, value) => key in obj ? __defProp$G(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$G = (obj, key, value) => {
      __defNormalProp$G(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class EventBus {
      constructor() {
        __publicField$G(this, "handlers", /* @__PURE__ */ new Map());
      }
      on(event, handler) {
        if (!this.handlers.has(event)) {
          this.handlers.set(event, /* @__PURE__ */ new Set());
        }
        this.handlers.get(event).add(handler);
      }
      off(event, handler) {
        const handlers = this.handlers.get(event);
        if (handlers) {
          handlers.delete(handler);
        }
      }
      emit(event, payload) {
        const handlers = this.handlers.get(event);
        if (handlers) {
          handlers.forEach((handler) => {
            try {
              handler(payload);
            } catch (e) {
              console.error(`Error in EventBus handler for ${event}:`, e);
            }
          });
        }
      }
      clear() {
        this.handlers.clear();
      }
    }

    class TableOverlayRenderer {
      /**
       * Parse a color value for table rendering.
       * Unlike ColorUtils.parseColor (which defaults to 0.3 opacity for fills),
       * tables treat hex/named colors as fully opaque — only rgba provides opacity.
       */
      static safeParseColor(val) {
        if (!val || typeof val !== "string") {
          return { color: "#888888", opacity: 1 };
        }
        const rgbaMatch = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbaMatch) {
          const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
          return { color: `rgb(${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]})`, opacity: a };
        }
        return { color: val, opacity: 1 };
      }
      /**
       * Clear all existing table overlays and render new ones.
       * @param getGridRect Function that returns the ECharts grid rect for a given pane index.
       */
      static render(container, tables, getGridRect) {
        TableOverlayRenderer.clearAll(container);
        const byPosition = /* @__PURE__ */ new Map();
        for (const tbl of tables) {
          if (tbl && !tbl._deleted) {
            byPosition.set(tbl.position, tbl);
          }
        }
        byPosition.forEach((tbl) => {
          const paneIndex = tbl._paneIndex ?? 0;
          const gridRect = getGridRect ? getGridRect(paneIndex) : void 0;
          const el = TableOverlayRenderer.buildTable(tbl, gridRect);
          TableOverlayRenderer.positionTable(el, tbl.position, gridRect);
          container.appendChild(el);
        });
      }
      static clearAll(container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
      static buildTable(tbl, gridRect) {
        const table = document.createElement("table");
        const borderWidth = tbl.border_width ?? 0;
        const frameWidth = tbl.frame_width ?? 0;
        const hasVisibleBorders = borderWidth > 0 && !!tbl.border_color || frameWidth > 0 && !!tbl.frame_color;
        if (hasVisibleBorders) {
          table.style.borderCollapse = "separate";
          table.style.borderSpacing = "0";
        } else {
          table.style.borderCollapse = "collapse";
        }
        table.style.pointerEvents = "none";
        table.style.fontSize = "14px";
        table.style.lineHeight = "1.4";
        table.style.fontFamily = "sans-serif";
        table.style.margin = "4px";
        if (gridRect) {
          table.style.maxHeight = gridRect.height + "px";
          table.style.maxWidth = gridRect.width + "px";
          table.style.overflow = "hidden";
        }
        if (tbl.bgcolor) {
          const { color, opacity } = TableOverlayRenderer.safeParseColor(tbl.bgcolor);
          table.style.backgroundColor = color;
          if (opacity < 1)
            table.style.opacity = String(opacity);
        }
        if (frameWidth > 0 && tbl.frame_color) {
          const { color: fc } = TableOverlayRenderer.safeParseColor(tbl.frame_color);
          table.style.border = `${frameWidth}px solid ${fc}`;
        } else {
          table.style.border = "none";
        }
        const mergeMap = /* @__PURE__ */ new Map();
        const mergedCells = /* @__PURE__ */ new Set();
        if (tbl.merges) {
          for (const m of tbl.merges) {
            const key = `${m.startCol},${m.startRow}`;
            mergeMap.set(key, {
              colspan: m.endCol - m.startCol + 1,
              rowspan: m.endRow - m.startRow + 1
            });
            for (let r = m.startRow; r <= m.endRow; r++) {
              for (let c = m.startCol; c <= m.endCol; c++) {
                if (r === m.startRow && c === m.startCol)
                  continue;
                mergedCells.add(`${c},${r}`);
              }
            }
          }
        }
        const hasCellBorders = borderWidth > 0 && !!tbl.border_color;
        const borderColorStr = hasCellBorders ? TableOverlayRenderer.safeParseColor(tbl.border_color).color : "";
        const rows = tbl.rows || 0;
        const cols = tbl.columns || 0;
        for (let r = 0; r < rows; r++) {
          const tr = document.createElement("tr");
          for (let c = 0; c < cols; c++) {
            const cellKey = `${c},${r}`;
            if (mergedCells.has(cellKey))
              continue;
            const td = document.createElement("td");
            const merge = mergeMap.get(cellKey);
            if (merge) {
              if (merge.colspan > 1)
                td.colSpan = merge.colspan;
              if (merge.rowspan > 1)
                td.rowSpan = merge.rowspan;
            }
            if (hasCellBorders) {
              td.style.border = `${borderWidth}px solid ${borderColorStr}`;
            } else {
              td.style.border = "none";
            }
            const cellData = tbl.cells?.[r]?.[c];
            if (cellData && !cellData._merged) {
              td.textContent = cellData.text || "";
              if (cellData.bgcolor && typeof cellData.bgcolor === "string" && cellData.bgcolor.length > 0) {
                const { color: bg, opacity: bgOp } = TableOverlayRenderer.safeParseColor(cellData.bgcolor);
                td.style.backgroundColor = bg;
                if (bgOp < 1) {
                  td.style.backgroundColor = cellData.bgcolor;
                }
              }
              if (cellData.text_color) {
                const { color: tc } = TableOverlayRenderer.safeParseColor(cellData.text_color);
                td.style.color = tc;
              }
              td.style.fontSize = TableOverlayRenderer.getSizePixels(cellData.text_size) + "px";
              td.style.textAlign = TableOverlayRenderer.mapHAlign(cellData.text_halign);
              td.style.verticalAlign = TableOverlayRenderer.mapVAlign(cellData.text_valign);
              if (cellData.text_font_family === "monospace") {
                td.style.fontFamily = "monospace";
              }
              if (cellData.width > 0) {
                if (gridRect) {
                  const px = Math.max(1, cellData.width * gridRect.width / 100);
                  td.style.width = px + "px";
                } else {
                  td.style.width = cellData.width + "%";
                }
              }
              if (cellData.height > 0) {
                if (gridRect) {
                  const px = Math.max(1, cellData.height * gridRect.height / 100);
                  td.style.height = px + "px";
                } else {
                  td.style.height = cellData.height + "%";
                }
              }
              if (cellData.tooltip) {
                td.title = cellData.tooltip;
              }
            }
            const cellHeight = cellData?.height ?? 0;
            if (cellHeight > 0 && gridRect && cellHeight * gridRect.height / 100 < 4) {
              td.style.padding = "0";
            } else {
              td.style.padding = "4px 6px";
            }
            td.style.whiteSpace = "nowrap";
            tr.appendChild(td);
          }
          table.appendChild(tr);
        }
        return table;
      }
      static positionTable(el, position, gridRect) {
        el.style.position = "absolute";
        const PAD = 8;
        const top = gridRect ? gridRect.y + "px" : "0";
        const left = gridRect ? gridRect.x + "px" : "0";
        const bottom = gridRect ? gridRect.y + gridRect.height - PAD + "px" : "0";
        const right = gridRect ? gridRect.x + gridRect.width - PAD + "px" : "0";
        const centerX = gridRect ? gridRect.x + gridRect.width / 2 + "px" : "50%";
        const centerY = gridRect ? gridRect.y + gridRect.height / 2 + "px" : "50%";
        switch (position) {
          case "top_left":
            el.style.top = top;
            el.style.left = left;
            break;
          case "top_center":
            el.style.top = top;
            el.style.left = centerX;
            el.style.transform = "translateX(-50%)";
            break;
          case "top_right":
            el.style.top = top;
            el.style.left = right;
            el.style.transform = "translateX(-100%)";
            break;
          case "middle_left":
            el.style.top = centerY;
            el.style.left = left;
            el.style.transform = "translateY(-50%)";
            break;
          case "middle_center":
            el.style.top = centerY;
            el.style.left = centerX;
            el.style.transform = "translate(-50%, -50%)";
            break;
          case "middle_right":
            el.style.top = centerY;
            el.style.left = right;
            el.style.transform = "translate(-100%, -50%)";
            break;
          case "bottom_left":
            el.style.top = bottom;
            el.style.left = left;
            el.style.transform = "translateY(-100%)";
            break;
          case "bottom_center":
            el.style.top = bottom;
            el.style.left = centerX;
            el.style.transform = "translate(-50%, -100%)";
            break;
          case "bottom_right":
            el.style.top = bottom;
            el.style.left = right;
            el.style.transform = "translate(-100%, -100%)";
            break;
          default:
            el.style.top = top;
            el.style.left = right;
            el.style.transform = "translateX(-100%)";
            break;
        }
      }
      static getSizePixels(size) {
        if (typeof size === "number" && size > 0)
          return size;
        switch (size) {
          case "auto":
          case "size.auto":
            return 12;
          case "tiny":
          case "size.tiny":
            return 8;
          case "small":
          case "size.small":
            return 10;
          case "normal":
          case "size.normal":
            return 14;
          case "large":
          case "size.large":
            return 20;
          case "huge":
          case "size.huge":
            return 36;
          default:
            return 14;
        }
      }
      static mapHAlign(align) {
        switch (align) {
          case "left":
          case "text.align_left":
            return "left";
          case "right":
          case "text.align_right":
            return "right";
          case "center":
          case "text.align_center":
          default:
            return "center";
        }
      }
      static mapVAlign(align) {
        switch (align) {
          case "top":
          case "text.align_top":
            return "top";
          case "bottom":
          case "text.align_bottom":
            return "bottom";
          case "center":
          case "text.align_center":
          default:
            return "middle";
        }
      }
    }

    class TableCanvasRenderer {
      // ── Color Parsing ──────────────────────────────────────────
      static parseColor(val) {
        if (!val || typeof val !== "string" || val.length === 0) {
          return { color: "", opacity: 0 };
        }
        const rgbaMatch = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbaMatch) {
          const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
          return { color: `rgb(${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]})`, opacity: a };
        }
        if (/^#[0-9a-fA-F]{8}$/.test(val)) {
          const r = parseInt(val.slice(1, 3), 16);
          const g = parseInt(val.slice(3, 5), 16);
          const b = parseInt(val.slice(5, 7), 16);
          const a = parseInt(val.slice(7, 9), 16) / 255;
          return { color: `rgb(${r},${g},${b})`, opacity: a };
        }
        return { color: val, opacity: 1 };
      }
      // ── Size / Alignment Mapping ───────────────────────────────
      // TradingView reference sizes (approximate px at 1× DPR)
      static getSizePixels(size) {
        if (typeof size === "number" && size > 0)
          return size;
        switch (size) {
          case "auto":
          case "size.auto":
            return 11;
          case "tiny":
          case "size.tiny":
            return 8;
          case "small":
          case "size.small":
            return 10;
          case "normal":
          case "size.normal":
            return 12;
          case "large":
          case "size.large":
            return 16;
          case "huge":
          case "size.huge":
            return 24;
          default:
            return 12;
        }
      }
      static mapHAlign(align) {
        switch (align) {
          case "left":
          case "text.align_left":
            return "left";
          case "right":
          case "text.align_right":
            return "right";
          default:
            return "center";
        }
      }
      static mapVAlign(align) {
        switch (align) {
          case "top":
          case "text.align_top":
            return "top";
          case "bottom":
          case "text.align_bottom":
            return "bottom";
          default:
            return "middle";
        }
      }
      // ── Main Entry Point ──────────────────────────────────────
      /**
       * Build flat ECharts graphic elements for all tables.
       * Returns an array of rect/text elements with absolute positions.
       */
      static buildGraphicElements(tables, getGridRect) {
        if (!tables || tables.length === 0)
          return [];
        const byPosition = /* @__PURE__ */ new Map();
        for (const tbl of tables) {
          if (tbl && !tbl._deleted) {
            byPosition.set(tbl.position, tbl);
          }
        }
        const elements = [];
        byPosition.forEach((tbl) => {
          const paneIndex = tbl._paneIndex ?? 0;
          const gridRect = getGridRect(paneIndex);
          if (!gridRect)
            return;
          const tableElements = TableCanvasRenderer.buildTableElements(tbl, gridRect);
          elements.push(...tableElements);
        });
        return elements;
      }
      // ── Table Layout Engine ──────────────────────────────────
      /**
       * Measure and layout a table, producing flat absolute-positioned elements.
       * Returns an array of ECharts graphic rect/text elements.
       */
      static buildTableElements(tbl, gridRect) {
        const rows = tbl.rows || 0;
        const cols = tbl.columns || 0;
        if (rows === 0 || cols === 0)
          return [];
        const borderWidth = tbl.border_width ?? 0;
        const frameWidth = tbl.frame_width ?? 0;
        const hasCellBorders = borderWidth > 0 && !!tbl.border_color;
        const hasFrame = frameWidth > 0 && !!tbl.frame_color;
        const mergeMap = /* @__PURE__ */ new Map();
        const mergedCells = /* @__PURE__ */ new Set();
        if (tbl.merges) {
          for (const m of tbl.merges) {
            mergeMap.set(`${m.startCol},${m.startRow}`, {
              colspan: m.endCol - m.startCol + 1,
              rowspan: m.endRow - m.startRow + 1
            });
            for (let r = m.startRow; r <= m.endRow; r++) {
              for (let c = m.startCol; c <= m.endCol; c++) {
                if (r === m.startRow && c === m.startCol)
                  continue;
                mergedCells.add(`${c},${r}`);
              }
            }
          }
        }
        const PAD_X = 4;
        const PAD_Y = 2;
        const LINE_HEIGHT = 1.25;
        const cellInfos = [];
        for (let r = 0; r < rows; r++) {
          cellInfos[r] = [];
          for (let c = 0; c < cols; c++) {
            if (mergedCells.has(`${c},${r}`)) {
              cellInfos[r][c] = {
                text: "",
                lines: [],
                fontSize: 12,
                fontFamily: "sans-serif",
                textColor: { color: "", opacity: 0 },
                bgColor: { color: "", opacity: 0 },
                halign: "center",
                valign: "middle",
                explicitWidth: 0,
                explicitHeight: 0,
                colspan: 1,
                rowspan: 1,
                skip: true,
                padX: 0,
                padY: 0
              };
              continue;
            }
            const cellData = tbl.cells?.[r]?.[c];
            const merge = mergeMap.get(`${c},${r}`);
            const colspan = merge?.colspan ?? 1;
            const rowspan = merge?.rowspan ?? 1;
            const text = cellData && !cellData._merged ? cellData.text || "" : "";
            const lines = text ? text.split("\n") : [];
            const fontSize = cellData ? TableCanvasRenderer.getSizePixels(cellData.text_size) : 12;
            const fontFamily = cellData?.text_font_family === "monospace" ? "monospace" : "sans-serif";
            let explicitWidth = 0;
            let explicitHeight = 0;
            if (cellData?.width > 0)
              explicitWidth = Math.max(1, cellData.width * gridRect.width / 100);
            if (cellData?.height > 0)
              explicitHeight = Math.max(1, cellData.height * gridRect.height / 100);
            const isTiny = explicitHeight > 0 && explicitHeight < 4;
            const padX = isTiny ? 0 : PAD_X;
            const padY = isTiny ? 0 : PAD_Y;
            const bgRaw = cellData && !cellData._merged && cellData.bgcolor && typeof cellData.bgcolor === "string" && cellData.bgcolor.length > 0 ? cellData.bgcolor : "";
            const textColorRaw = cellData?.text_color || "";
            cellInfos[r][c] = {
              text,
              lines,
              fontSize,
              fontFamily,
              textColor: textColorRaw ? TableCanvasRenderer.parseColor(textColorRaw) : { color: "#e0e0e0", opacity: 1 },
              bgColor: bgRaw ? TableCanvasRenderer.parseColor(bgRaw) : { color: "", opacity: 0 },
              halign: cellData ? TableCanvasRenderer.mapHAlign(cellData.text_halign) : "center",
              valign: cellData ? TableCanvasRenderer.mapVAlign(cellData.text_valign) : "middle",
              explicitWidth,
              explicitHeight,
              colspan,
              rowspan,
              skip: false,
              padX,
              padY
            };
          }
        }
        const colWidths = new Array(cols).fill(0);
        const rowHeights = new Array(rows).fill(0);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const info = cellInfos[r][c];
            if (info.skip || info.colspan > 1 || info.rowspan > 1)
              continue;
            const textW = TableCanvasRenderer.measureMultiLineWidth(info.lines, info.fontSize, info.fontFamily);
            const numLines = Math.max(info.lines.length, 1);
            const cellW = info.explicitWidth > 0 ? info.explicitWidth : textW + info.padX * 2;
            const cellH = info.explicitHeight > 0 ? info.explicitHeight : numLines * info.fontSize * LINE_HEIGHT + info.padY * 2;
            colWidths[c] = Math.max(colWidths[c], cellW);
            rowHeights[r] = Math.max(rowHeights[r], cellH);
          }
        }
        for (let c = 0; c < cols; c++) {
          if (colWidths[c] === 0)
            colWidths[c] = 20;
        }
        for (let r = 0; r < rows; r++) {
          if (rowHeights[r] === 0)
            rowHeights[r] = 4;
        }
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const info = cellInfos[r][c];
            if (info.skip)
              continue;
            const numLines = Math.max(info.lines.length, 1);
            const neededH = info.explicitHeight > 0 ? info.explicitHeight : numLines * info.fontSize * LINE_HEIGHT + info.padY * 2;
            if (info.colspan > 1) {
              const spanned = TableCanvasRenderer.sumRange(colWidths, c, info.colspan);
              const textW = TableCanvasRenderer.measureMultiLineWidth(info.lines, info.fontSize, info.fontFamily);
              const neededW = info.explicitWidth > 0 ? info.explicitWidth : textW + info.padX * 2;
              if (neededW > spanned) {
                const perCol = (neededW - spanned) / info.colspan;
                for (let i = 0; i < info.colspan; i++)
                  colWidths[c + i] += perCol;
              }
              if (info.rowspan === 1) {
                rowHeights[r] = Math.max(rowHeights[r], neededH);
              }
            }
            if (info.rowspan > 1) {
              const spanned = TableCanvasRenderer.sumRange(rowHeights, r, info.rowspan);
              if (neededH > spanned) {
                const perRow = (neededH - spanned) / info.rowspan;
                for (let i = 0; i < info.rowspan; i++)
                  rowHeights[r + i] += perRow;
              }
            }
          }
        }
        for (let c = 0; c < cols; c++)
          colWidths[c] = Math.round(colWidths[c]);
        for (let r = 0; r < rows; r++)
          rowHeights[r] = Math.round(rowHeights[r]);
        const colX = new Array(cols + 1).fill(0);
        for (let c = 0; c < cols; c++)
          colX[c + 1] = colX[c] + colWidths[c];
        const rowY = new Array(rows + 1).fill(0);
        for (let r = 0; r < rows; r++)
          rowY[r + 1] = rowY[r] + rowHeights[r];
        const frameOffset = hasFrame ? frameWidth : 0;
        const totalWidth = colX[cols] + frameOffset * 2;
        const totalHeight = rowY[rows] + frameOffset * 2;
        const clampedWidth = Math.min(totalWidth, gridRect.width);
        const clampedHeight = Math.min(totalHeight, gridRect.height);
        const pos = TableCanvasRenderer.computePosition(
          tbl.position,
          gridRect,
          clampedWidth,
          clampedHeight
        );
        const tableX = Math.round(pos.x);
        const tableY = Math.round(pos.y);
        const elements = [];
        const ox = tableX + frameOffset;
        const oy = tableY + frameOffset;
        if (tbl.bgcolor) {
          const { color, opacity } = TableCanvasRenderer.parseColor(tbl.bgcolor);
          if (opacity > 0) {
            elements.push({
              type: "rect",
              shape: { x: tableX, y: tableY, width: clampedWidth, height: clampedHeight },
              style: { fill: color, opacity },
              silent: true,
              z: 0,
              z2: 0
            });
          }
        }
        if (hasFrame) {
          const { color: fc } = TableCanvasRenderer.parseColor(tbl.frame_color);
          const half = frameWidth / 2;
          elements.push({
            type: "rect",
            shape: {
              x: tableX + half,
              y: tableY + half,
              width: clampedWidth - frameWidth,
              height: clampedHeight - frameWidth
            },
            style: { fill: "none", stroke: fc, lineWidth: frameWidth },
            silent: true,
            z: 0,
            z2: 1
          });
        }
        const bdrColor = hasCellBorders ? TableCanvasRenderer.parseColor(tbl.border_color).color : "";
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const info = cellInfos[r][c];
            if (info.skip)
              continue;
            const cx = ox + colX[c];
            const cy = oy + rowY[r];
            const cw = TableCanvasRenderer.sumRange(colWidths, c, info.colspan);
            const ch = TableCanvasRenderer.sumRange(rowHeights, r, info.rowspan);
            if (cx - tableX >= clampedWidth || cy - tableY >= clampedHeight)
              continue;
            const drawW = Math.min(cw, clampedWidth - (cx - tableX));
            const drawH = Math.min(ch, clampedHeight - (cy - tableY));
            if (info.bgColor.opacity > 0) {
              elements.push({
                type: "rect",
                shape: { x: cx, y: cy, width: drawW, height: drawH },
                style: { fill: info.bgColor.color, opacity: info.bgColor.opacity },
                silent: true,
                z: 0,
                z2: 2
              });
            }
            if (hasCellBorders) {
              elements.push({
                type: "rect",
                shape: { x: cx, y: cy, width: drawW, height: drawH },
                style: { fill: "none", stroke: bdrColor, lineWidth: borderWidth },
                silent: true,
                z: 0,
                z2: 3
              });
            }
            if (info.text) {
              let textX, textAlign;
              switch (info.halign) {
                case "left":
                  textX = cx + info.padX;
                  textAlign = "left";
                  break;
                case "right":
                  textX = cx + drawW - info.padX;
                  textAlign = "right";
                  break;
                default:
                  textX = cx + drawW / 2;
                  textAlign = "center";
                  break;
              }
              let textY, textVAlign;
              switch (info.valign) {
                case "top":
                  textY = cy + info.padY;
                  textVAlign = "top";
                  break;
                case "bottom":
                  textY = cy + drawH - info.padY;
                  textVAlign = "bottom";
                  break;
                default:
                  textY = cy + drawH / 2;
                  textVAlign = "middle";
                  break;
              }
              elements.push({
                type: "text",
                x: textX,
                y: textY,
                style: {
                  text: info.text,
                  fill: info.textColor.color,
                  opacity: info.textColor.opacity,
                  font: `${info.fontSize}px ${info.fontFamily}`,
                  textAlign,
                  textVerticalAlign: textVAlign,
                  lineHeight: Math.round(info.fontSize * LINE_HEIGHT)
                },
                silent: true,
                z: 0,
                z2: 4
              });
            }
          }
        }
        return elements;
      }
      // ── Position Computation ─────────────────────────────────
      static computePosition(position, gridRect, tableWidth, tableHeight) {
        const PAD = 4;
        const gx = gridRect.x;
        const gy = gridRect.y;
        const gw = gridRect.width;
        const gh = gridRect.height;
        switch (position) {
          case "top_left":
            return { x: gx + PAD, y: gy + PAD };
          case "top_center":
            return { x: gx + (gw - tableWidth) / 2, y: gy + PAD };
          case "top_right":
            return { x: gx + gw - tableWidth - PAD, y: gy + PAD };
          case "middle_left":
            return { x: gx + PAD, y: gy + (gh - tableHeight) / 2 };
          case "middle_center":
            return { x: gx + (gw - tableWidth) / 2, y: gy + (gh - tableHeight) / 2 };
          case "middle_right":
            return { x: gx + gw - tableWidth - PAD, y: gy + (gh - tableHeight) / 2 };
          case "bottom_left":
            return { x: gx + PAD, y: gy + gh - tableHeight - PAD };
          case "bottom_center":
            return { x: gx + (gw - tableWidth) / 2, y: gy + gh - tableHeight - PAD };
          case "bottom_right":
            return { x: gx + gw - tableWidth - PAD, y: gy + gh - tableHeight - PAD };
          default:
            return { x: gx + gw - tableWidth - PAD, y: gy + PAD };
        }
      }
      // ── Utilities ────────────────────────────────────────────
      /**
       * Measure the max width across all lines of a multi-line text string.
       */
      static measureMultiLineWidth(lines, fontSize, fontFamily) {
        if (!lines || lines.length === 0)
          return 0;
        const ratio = fontFamily === "monospace" ? 0.6 : 0.55;
        let maxW = 0;
        for (const line of lines) {
          maxW = Math.max(maxW, line.length * fontSize * ratio);
        }
        return maxW;
      }
      static sumRange(arr, start, count) {
        let sum = 0;
        for (let i = start; i < start + count && i < arr.length; i++)
          sum += arr[i];
        return sum;
      }
    }

    var __defProp$F = Object.defineProperty;
    var __defNormalProp$F = (obj, key, value) => key in obj ? __defProp$F(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$F = (obj, key, value) => {
      __defNormalProp$F(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class QFChart {
      constructor(container, options = {}) {
        __publicField$F(this, "chart");
        __publicField$F(this, "options");
        __publicField$F(this, "marketData", []);
        __publicField$F(this, "indicators", /* @__PURE__ */ new Map());
        __publicField$F(this, "timeToIndex", /* @__PURE__ */ new Map());
        __publicField$F(this, "pluginManager");
        __publicField$F(this, "drawingEditor");
        __publicField$F(this, "events", new EventBus());
        __publicField$F(this, "isMainCollapsed", false);
        __publicField$F(this, "maximizedPaneId", null);
        __publicField$F(this, "countdownInterval", null);
        __publicField$F(this, "selectedDrawingId", null);
        // Track selected drawing
        // Drawing System
        __publicField$F(this, "drawings", []);
        __publicField$F(this, "drawingRenderers", new DrawingRendererRegistry());
        __publicField$F(this, "coordinateConversion", {
          pixelToData: (point) => {
            const option = this.chart.getOption();
            if (!option || !option.grid)
              return null;
            const gridCount = option.grid.length;
            for (let i = 0; i < gridCount; i++) {
              if (this.chart.containPixel({ gridIndex: i }, [point.x, point.y])) {
                this.chart.convertFromPixel({ seriesIndex: i }, [point.x, point.y]);
                const pGrid = this.chart.convertFromPixel({ gridIndex: i }, [point.x, point.y]);
                if (pGrid) {
                  return { timeIndex: Math.round(pGrid[0]) - this.dataIndexOffset, value: pGrid[1], paneIndex: i };
                }
              }
            }
            return null;
          },
          dataToPixel: (point) => {
            const paneIdx = point.paneIndex || 0;
            const p = this.chart.convertToPixel({ gridIndex: paneIdx }, [point.timeIndex + this.dataIndexOffset, point.value]);
            if (p) {
              return { x: p[0], y: p[1] };
            }
            return null;
          }
        });
        // Default colors and constants
        __publicField$F(this, "upColor", "#00da3c");
        __publicField$F(this, "downColor", "#ec0000");
        __publicField$F(this, "defaultPadding", 0);
        __publicField$F(this, "padding");
        __publicField$F(this, "dataIndexOffset", 0);
        // Offset for phantom padding data
        __publicField$F(this, "_paddingPoints", 0);
        // Current symmetric padding (empty bars per side)
        __publicField$F(this, "LAZY_MIN_PADDING", 5);
        // Always have a tiny buffer so edge scroll triggers
        __publicField$F(this, "LAZY_MAX_PADDING", 500);
        // Hard cap per side
        __publicField$F(this, "LAZY_CHUNK_SIZE", 50);
        // Bars added per expansion
        __publicField$F(this, "LAZY_EDGE_THRESHOLD", 10);
        // Bars from edge to trigger
        __publicField$F(this, "_expandScheduled", false);
        // Debounce flag
        // DOM Elements for Layout
        __publicField$F(this, "rootContainer");
        __publicField$F(this, "layoutContainer");
        __publicField$F(this, "toolbarContainer");
        // New Toolbar
        __publicField$F(this, "leftSidebar");
        __publicField$F(this, "rightSidebar");
        __publicField$F(this, "chartContainer");
        __publicField$F(this, "overlayContainer");
        __publicField$F(this, "_lastTables", []);
        __publicField$F(this, "_tableGraphicIds", []);
        // Track canvas table graphic IDs for cleanup
        __publicField$F(this, "_baseGraphics", []);
        // Non-table graphic elements (title, watermark, pane labels)
        __publicField$F(this, "_labelTooltipEl", null);
        // Floating tooltip for label.set_tooltip()
        // Pane drag-resize state
        __publicField$F(this, "_lastLayout", null);
        __publicField$F(this, "_mainHeightOverride", null);
        __publicField$F(this, "_paneDragState", null);
        __publicField$F(this, "_paneResizeRafId", null);
        __publicField$F(this, "onKeyDown", (e) => {
          if ((e.key === "Delete" || e.key === "Backspace") && this.selectedDrawingId) {
            this.removeDrawing(this.selectedDrawingId);
            this.selectedDrawingId = null;
            this.render();
          }
        });
        __publicField$F(this, "onFullscreenChange", () => {
          this.render();
        });
        // --- Interaction Locking ---
        __publicField$F(this, "isLocked", false);
        __publicField$F(this, "lockedState", null);
        this.rootContainer = container;
        this.options = {
          title: void 0,
          height: "600px",
          backgroundColor: "#1e293b",
          upColor: "#00da3c",
          downColor: "#ec0000",
          fontColor: "#cbd5e1",
          fontFamily: "sans-serif",
          padding: 0.01,
          dataZoom: {
            visible: true,
            position: "top",
            height: 6
          },
          layout: {
            mainPaneHeight: "50%",
            gap: 13
          },
          watermark: true,
          ...options
        };
        if (this.options.upColor)
          this.upColor = this.options.upColor;
        if (this.options.downColor)
          this.downColor = this.options.downColor;
        this.padding = this.options.padding !== void 0 ? this.options.padding : this.defaultPadding;
        if (this.options.height) {
          if (typeof this.options.height === "number") {
            this.rootContainer.style.height = `${this.options.height}px`;
          } else {
            this.rootContainer.style.height = this.options.height;
          }
        }
        this.rootContainer.innerHTML = "";
        this.layoutContainer = document.createElement("div");
        this.layoutContainer.style.display = "flex";
        this.layoutContainer.style.width = "100%";
        this.layoutContainer.style.height = "100%";
        this.layoutContainer.style.overflow = "hidden";
        this.rootContainer.appendChild(this.layoutContainer);
        this.leftSidebar = document.createElement("div");
        this.leftSidebar.style.display = "none";
        this.leftSidebar.style.width = "250px";
        this.leftSidebar.style.flexShrink = "0";
        this.leftSidebar.style.overflowY = "auto";
        this.leftSidebar.style.backgroundColor = this.options.backgroundColor || "#1e293b";
        this.leftSidebar.style.borderRight = "1px solid #334155";
        this.leftSidebar.style.padding = "10px";
        this.leftSidebar.style.boxSizing = "border-box";
        this.leftSidebar.style.color = "#cbd5e1";
        this.leftSidebar.style.fontSize = "12px";
        this.leftSidebar.style.fontFamily = this.options.fontFamily || "sans-serif";
        this.layoutContainer.appendChild(this.leftSidebar);
        this.toolbarContainer = document.createElement("div");
        this.layoutContainer.appendChild(this.toolbarContainer);
        this.chartContainer = document.createElement("div");
        this.chartContainer.style.flexGrow = "1";
        this.chartContainer.style.height = "100%";
        this.chartContainer.style.overflow = "hidden";
        this.layoutContainer.appendChild(this.chartContainer);
        this.rightSidebar = document.createElement("div");
        this.rightSidebar.style.display = "none";
        this.rightSidebar.style.width = "250px";
        this.rightSidebar.style.flexShrink = "0";
        this.rightSidebar.style.overflowY = "auto";
        this.rightSidebar.style.backgroundColor = this.options.backgroundColor || "#1e293b";
        this.rightSidebar.style.borderLeft = "1px solid #334155";
        this.rightSidebar.style.padding = "10px";
        this.rightSidebar.style.boxSizing = "border-box";
        this.rightSidebar.style.color = "#cbd5e1";
        this.rightSidebar.style.fontSize = "12px";
        this.rightSidebar.style.fontFamily = this.options.fontFamily || "sans-serif";
        this.layoutContainer.appendChild(this.rightSidebar);
        this.chart = echarts__namespace.init(this.chartContainer);
        this.chartContainer.style.position = "relative";
        this.overlayContainer = document.createElement("div");
        this.overlayContainer.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100;overflow:hidden;";
        this.chartContainer.appendChild(this.overlayContainer);
        this.pluginManager = new PluginManager(this, this.toolbarContainer);
        this.drawingEditor = new DrawingEditor(this);
        this.chart.on("dataZoom", (params) => {
          this.events.emit("chart:dataZoom", params);
          const triggerOn = this.options.databox?.triggerOn;
          const position = this.options.databox?.position;
          if (triggerOn === "click" && position === "floating") {
            this.chart.dispatchAction({ type: "hideTip" });
          }
          this._checkEdgeAndExpand();
        });
        this.chart.on("finished", (params) => this.events.emit("chart:updated", params));
        this.chart.getZr().on("mousedown", (params) => {
          if (!this._paneDragState)
            this.events.emit("mouse:down", params);
        });
        this.chart.getZr().on("mousemove", (params) => {
          if (!this._paneDragState)
            this.events.emit("mouse:move", params);
        });
        this.chart.getZr().on("mouseup", (params) => this.events.emit("mouse:up", params));
        this.chart.getZr().on("click", (params) => {
          if (!this._paneDragState)
            this.events.emit("mouse:click", params);
        });
        const zr = this.chart.getZr();
        const originalSetCursorStyle = zr.setCursorStyle;
        const self = this;
        zr.setCursorStyle = function(cursorStyle) {
          if (self._paneDragState) {
            originalSetCursorStyle.call(this, "row-resize");
            return;
          }
          if (cursorStyle === "grab") {
            cursorStyle = "crosshair";
          }
          originalSetCursorStyle.call(this, cursorStyle);
        };
        this.bindDrawingEvents();
        this.bindPaneResizeEvents();
        window.addEventListener("resize", this.resize.bind(this));
        document.addEventListener("fullscreenchange", this.onFullscreenChange);
        document.addEventListener("keydown", this.onKeyDown);
      }
      // ── Pane border drag-resize ────────────────────────────────
      bindPaneResizeEvents() {
        const MIN_MAIN = 10;
        const MIN_INDICATOR = 5;
        const HIT_ZONE = 6;
        const zr = this.chart.getZr();
        const findBoundary = (mouseY) => {
          if (!this._lastLayout || this._lastLayout.paneBoundaries.length === 0)
            return null;
          if (this.maximizedPaneId)
            return null;
          const containerH = this.chart.getHeight();
          if (containerH <= 0)
            return null;
          for (const b of this._lastLayout.paneBoundaries) {
            const bY = b.yPercent / 100 * containerH;
            if (Math.abs(mouseY - bY) <= HIT_ZONE) {
              if (b.aboveId === "main" && this.isMainCollapsed)
                continue;
              const belowInd = this.indicators.get(b.belowId);
              if (belowInd?.collapsed)
                continue;
              if (b.aboveId !== "main") {
                const aboveInd = this.indicators.get(b.aboveId);
                if (aboveInd?.collapsed)
                  continue;
              }
              return b;
            }
          }
          return null;
        };
        const getPaneHeight = (id) => {
          if (id === "main") {
            return this._lastLayout?.mainPaneHeight ?? 50;
          }
          const ind = this.indicators.get(id);
          return ind?.height ?? 15;
        };
        zr.on("mousemove", (e) => {
          if (this._paneDragState) {
            const deltaY = e.offsetY - this._paneDragState.startY;
            const containerH = this.chart.getHeight();
            if (containerH <= 0)
              return;
            const deltaPct = deltaY / containerH * 100;
            const minAbove = this._paneDragState.aboveId === "main" ? MIN_MAIN : MIN_INDICATOR;
            const minBelow = MIN_INDICATOR;
            let newAbove = this._paneDragState.startAboveHeight + deltaPct;
            let newBelow = this._paneDragState.startBelowHeight - deltaPct;
            if (newAbove < minAbove) {
              newAbove = minAbove;
              newBelow = this._paneDragState.startAboveHeight + this._paneDragState.startBelowHeight - minAbove;
            }
            if (newBelow < minBelow) {
              newBelow = minBelow;
              newAbove = this._paneDragState.startAboveHeight + this._paneDragState.startBelowHeight - minBelow;
            }
            if (this._paneDragState.aboveId === "main") {
              this._mainHeightOverride = newAbove;
            } else {
              const aboveInd = this.indicators.get(this._paneDragState.aboveId);
              if (aboveInd)
                aboveInd.height = newAbove;
            }
            const belowInd = this.indicators.get(this._paneDragState.belowId);
            if (belowInd)
              belowInd.height = newBelow;
            if (!this._paneResizeRafId) {
              this._paneResizeRafId = requestAnimationFrame(() => {
                this._paneResizeRafId = null;
                this.render();
              });
            }
            zr.setCursorStyle("row-resize");
            e.stop?.();
            return;
          }
          const boundary = findBoundary(e.offsetY);
          if (boundary) {
            zr.setCursorStyle("row-resize");
          }
        });
        zr.on("mousedown", (e) => {
          const boundary = findBoundary(e.offsetY);
          if (!boundary)
            return;
          this._paneDragState = {
            startY: e.offsetY,
            aboveId: boundary.aboveId,
            belowId: boundary.belowId,
            startAboveHeight: getPaneHeight(boundary.aboveId),
            startBelowHeight: getPaneHeight(boundary.belowId)
          };
          zr.setCursorStyle("row-resize");
          e.stop?.();
        });
        zr.on("mouseup", () => {
          if (this._paneDragState) {
            this._paneDragState = null;
            if (this._paneResizeRafId) {
              cancelAnimationFrame(this._paneResizeRafId);
              this._paneResizeRafId = null;
            }
            this.render();
          }
        });
      }
      bindDrawingEvents() {
        let hideTimeout = null;
        const getDrawingInfo = (params) => {
          if (!params || params.componentType !== "series" || !params.seriesName?.startsWith("drawings")) {
            return null;
          }
          params.seriesIndex;
          const match = params.seriesName.match(/drawings-pane-(\d+)/);
          if (!match)
            return null;
          const paneIdx = parseInt(match[1]);
          const paneDrawings = this.drawings.filter((d) => (d.paneIndex || 0) === paneIdx);
          const drawing = paneDrawings[params.dataIndex];
          if (!drawing)
            return null;
          const targetName = params.event?.target?.name;
          return { drawing, targetName, paneIdx };
        };
        this.chart.on("mouseover", (params) => {
          const info = getDrawingInfo(params);
          if (!info)
            return;
          const group = params.event?.target?.parent;
          if (group) {
            const isSelected = info.drawing.id === this.selectedDrawingId;
            if (hideTimeout) {
              clearTimeout(hideTimeout);
              hideTimeout = null;
            }
            if (!isSelected) {
              group.children().forEach((child) => {
                if (child.name && child.name.startsWith("point")) {
                  child.attr("style", { opacity: 1 });
                }
              });
            }
          }
          if (info.targetName === "line") {
            this.events.emit("drawing:hover", {
              id: info.drawing.id,
              type: info.drawing.type
            });
            this.chart.getZr().setCursorStyle("move");
          } else if (info.targetName?.startsWith("point-")) {
            const pointIdx = parseInt(info.targetName.split("-")[1]) || 0;
            this.events.emit("drawing:point:hover", {
              id: info.drawing.id,
              pointIndex: pointIdx
            });
            this.chart.getZr().setCursorStyle("pointer");
          }
        });
        this.chart.on("mouseout", (params) => {
          const info = getDrawingInfo(params);
          if (!info)
            return;
          const group = params.event?.target?.parent;
          if (info.drawing.id === this.selectedDrawingId) {
            return;
          }
          hideTimeout = setTimeout(() => {
            if (group) {
              if (this.selectedDrawingId === info.drawing.id)
                return;
              group.children().forEach((child) => {
                if (child.name && child.name.startsWith("point")) {
                  child.attr("style", { opacity: 0 });
                }
              });
            }
          }, 50);
          if (info.targetName === "line") {
            this.events.emit("drawing:mouseout", { id: info.drawing.id });
          } else if (info.targetName?.startsWith("point-")) {
            const pointIdx = parseInt(info.targetName.split("-")[1]) || 0;
            this.events.emit("drawing:point:mouseout", {
              id: info.drawing.id,
              pointIndex: pointIdx
            });
          }
          this.chart.getZr().setCursorStyle("default");
        });
        this.chart.on("mousedown", (params) => {
          const info = getDrawingInfo(params);
          if (!info)
            return;
          const event = params.event?.event || params.event;
          const x = event?.offsetX;
          const y = event?.offsetY;
          if (info.targetName === "line") {
            this.events.emit("drawing:mousedown", {
              id: info.drawing.id,
              x,
              y
            });
          } else if (info.targetName?.startsWith("point-")) {
            const pointIdx = parseInt(info.targetName.split("-")[1]) || 0;
            this.events.emit("drawing:point:mousedown", {
              id: info.drawing.id,
              pointIndex: pointIdx,
              x,
              y
            });
          }
        });
        this.chart.on("click", (params) => {
          const info = getDrawingInfo(params);
          if (!info)
            return;
          if (this.selectedDrawingId !== info.drawing.id) {
            this.selectedDrawingId = info.drawing.id;
            this.events.emit("drawing:selected", { id: info.drawing.id });
            this.render();
          }
          if (info.targetName === "line") {
            this.events.emit("drawing:click", { id: info.drawing.id });
          } else if (info.targetName?.startsWith("point-")) {
            const pointIdx = parseInt(info.targetName.split("-")[1]) || 0;
            this.events.emit("drawing:point:click", {
              id: info.drawing.id,
              pointIndex: pointIdx
            });
          }
        });
        this.chart.getZr().on("click", (params) => {
          if (!params.target) {
            if (this.selectedDrawingId) {
              this.events.emit("drawing:deselected", { id: this.selectedDrawingId });
              this.selectedDrawingId = null;
              this.render();
            }
          }
        });
        this._labelTooltipEl = document.createElement("div");
        this._labelTooltipEl.style.cssText = "position:absolute;display:none;pointer-events:none;z-index:200;background:rgba(30,41,59,0.95);color:#fff;border:1px solid #475569;border-radius:4px;padding:6px 10px;font-size:12px;line-height:1.5;white-space:pre-wrap;max-width:350px;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-family:" + (this.options.fontFamily || "sans-serif") + ";";
        this.chartContainer.appendChild(this._labelTooltipEl);
        this.chart.on("mouseover", { seriesType: "scatter" }, (params) => {
          const tooltipText = params.data?._tooltipText;
          if (!tooltipText || !this._labelTooltipEl)
            return;
          this._labelTooltipEl.textContent = tooltipText;
          this._labelTooltipEl.style.display = "block";
          const chartRect = this.chartContainer.getBoundingClientRect();
          const event = params.event?.event;
          if (event) {
            const x = event.clientX - chartRect.left;
            const y = event.clientY - chartRect.top;
            const tipWidth = this._labelTooltipEl.offsetWidth;
            const left = Math.min(x - tipWidth / 2, chartRect.width - tipWidth - 8);
            this._labelTooltipEl.style.left = Math.max(4, left) + "px";
            this._labelTooltipEl.style.top = y + 18 + "px";
          }
        });
        this.chart.on("mouseout", { seriesType: "scatter" }, () => {
          if (this._labelTooltipEl) {
            this._labelTooltipEl.style.display = "none";
          }
        });
      }
      // --- Plugin System Integration ---
      getChart() {
        return this.chart;
      }
      getMarketData() {
        return this.marketData;
      }
      getTimeToIndex() {
        return this.timeToIndex;
      }
      getOptions() {
        return this.options;
      }
      disableTools() {
        this.pluginManager.deactivatePlugin();
      }
      registerPlugin(plugin) {
        this.pluginManager.register(plugin);
      }
      registerDrawingRenderer(renderer) {
        this.drawingRenderers.register(renderer);
      }
      snapToCandle(point) {
        const dataCoord = this.coordinateConversion.pixelToData(point);
        if (!dataCoord)
          return point;
        const paneIndex = dataCoord.paneIndex || 0;
        if (paneIndex !== 0)
          return point;
        const realIndex = Math.round(dataCoord.timeIndex);
        if (realIndex < 0 || realIndex >= this.marketData.length)
          return point;
        const candle = this.marketData[realIndex];
        if (!candle)
          return point;
        const snappedX = this.chart.convertToPixel(
          { gridIndex: paneIndex },
          [realIndex + this.dataIndexOffset, candle.close]
        );
        if (!snappedX)
          return point;
        const snapPxX = snappedX[0];
        const ohlc = [candle.open, candle.high, candle.low, candle.close];
        let bestValue = ohlc[0];
        let bestDist = Infinity;
        for (const val of ohlc) {
          const px = this.chart.convertToPixel(
            { gridIndex: paneIndex },
            [realIndex + this.dataIndexOffset, val]
          );
          if (px) {
            const dist = Math.abs(px[1] - point.y);
            if (dist < bestDist) {
              bestDist = dist;
              bestValue = val;
            }
          }
        }
        const snappedY = this.chart.convertToPixel(
          { gridIndex: paneIndex },
          [realIndex + this.dataIndexOffset, bestValue]
        );
        return {
          x: snapPxX,
          y: snappedY ? snappedY[1] : point.y
        };
      }
      // --- Drawing System ---
      addDrawing(drawing) {
        this.drawings.push(drawing);
        this.render();
      }
      removeDrawing(id) {
        const index = this.drawings.findIndex((d) => d.id === id);
        if (index !== -1) {
          const drawing = this.drawings[index];
          this.drawings.splice(index, 1);
          this.events.emit("drawing:deleted", { id: drawing.id });
          this.render();
        }
      }
      getDrawing(id) {
        return this.drawings.find((d) => d.id === id);
      }
      updateDrawing(drawing) {
        const index = this.drawings.findIndex((d) => d.id === drawing.id);
        if (index !== -1) {
          this.drawings[index] = drawing;
          this.render();
        }
      }
      lockChart() {
        if (this.isLocked)
          return;
        this.isLocked = true;
        const option = this.chart.getOption();
        this.chart.setOption({
          dataZoom: option.dataZoom.map((dz) => ({ ...dz, disabled: true })),
          tooltip: { show: false }
          // Hide tooltip during drag
          // We can also disable series interaction if needed, but custom series is handled by us.
        });
      }
      unlockChart() {
        if (!this.isLocked)
          return;
        this.isLocked = false;
        const option = this.chart.getOption();
        const dzConfig = this.options.dataZoom || {};
        dzConfig.visible ?? true;
        if (option.dataZoom) {
          this.chart.setOption({
            dataZoom: option.dataZoom.map((dz) => ({
              ...dz,
              disabled: false
            })),
            tooltip: { show: true }
          });
        }
      }
      // --------------------------------
      setZoom(start, end) {
        this.chart.dispatchAction({
          type: "dataZoom",
          start,
          end
        });
      }
      setMarketData(data) {
        this.marketData = data;
        this.rebuildTimeIndex();
        this.render();
      }
      /**
       * Update market data incrementally without full re-render
       * Merges new/updated OHLCV data with existing data by timestamp
       *
       * @param data - Array of OHLCV data to merge
       *
       * @remarks
       * **Performance Optimization**: This method only triggers a chart update if the data array contains
       * new or modified bars. If an empty array is passed, no update occurs (expected behavior).
       *
       * **Usage Pattern for Updating Indicators**:
       * When updating both market data and indicators, follow this order:
       *
       * 1. Update indicator data first using `indicator.updateData(plots)`
       * 2. Then call `chart.updateData(newBars)` with the new/modified market data
       *
       * The chart update will trigger a re-render that includes the updated indicator data.
       *
       * **Important**: If you update indicator data without updating market data (e.g., recalculation
       * with same bars), you must still call `chart.updateData([...])` with at least one bar
       * to trigger the re-render. Calling with an empty array will NOT trigger an update.
       *
       * @example
       * ```typescript
       * // Step 1: Update indicator data
       * macdIndicator.updateData({
       *   macd: { data: [{ time: 1234567890, value: 150 }], options: { style: 'line', color: '#2962FF' } }
       * });
       *
       * // Step 2: Update market data (triggers re-render with new indicator data)
       * chart.updateData([
       *   { time: 1234567890, open: 100, high: 105, low: 99, close: 103, volume: 1000 }
       * ]);
       * ```
       *
       * @example
       * ```typescript
       * // If only updating existing bar (e.g., real-time tick updates):
       * const lastBar = { ...existingBar, close: newPrice, high: Math.max(existingBar.high, newPrice) };
       * chart.updateData([lastBar]); // Updates by timestamp
       * ```
       */
      updateData(data) {
        if (data.length === 0)
          return;
        const existingTimeMap = /* @__PURE__ */ new Map();
        this.marketData.forEach((bar) => {
          existingTimeMap.set(bar.time, bar);
        });
        data.forEach((bar) => {
          if (!existingTimeMap.has(bar.time)) ;
          existingTimeMap.set(bar.time, bar);
        });
        this.marketData = Array.from(existingTimeMap.values()).sort((a, b) => a.time - b.time);
        this.rebuildTimeIndex();
        const paddingPoints = this.dataIndexOffset;
        const candlestickSeries = SeriesBuilder.buildCandlestickSeries(this.marketData, this.options);
        const emptyCandle = { value: [NaN, NaN, NaN, NaN], itemStyle: { opacity: 0 } };
        const paddedCandlestickData = [
          ...Array(paddingPoints).fill(emptyCandle),
          ...candlestickSeries.data,
          ...Array(paddingPoints).fill(emptyCandle)
        ];
        const categoryData = [
          ...Array(paddingPoints).fill(""),
          ...this.marketData.map((k) => new Date(k.time).toLocaleString()),
          ...Array(paddingPoints).fill("")
        ];
        const currentOption = this.chart.getOption();
        const layout = LayoutManager.calculate(
          this.chart.getHeight(),
          this.indicators,
          this.options,
          this.isMainCollapsed,
          this.maximizedPaneId,
          this.marketData,
          this._mainHeightOverride ?? void 0
        );
        this._lastLayout = layout;
        const paddedOHLCVForShapes = [...Array(paddingPoints).fill(null), ...this.marketData, ...Array(paddingPoints).fill(null)];
        const { series: indicatorSeries, barColors } = SeriesBuilder.buildIndicatorSeries(
          this.indicators,
          this.timeToIndex,
          layout.paneLayout,
          categoryData.length,
          paddingPoints,
          paddedOHLCVForShapes,
          // Pass padded OHLCV data
          layout.overlayYAxisMap,
          // Pass overlay Y-axis mapping
          layout.separatePaneYAxisOffset
          // Pass Y-axis offset for separate panes
        );
        const coloredCandlestickData = paddedCandlestickData.map((candle, i) => {
          if (barColors[i]) {
            const vals = candle.value || candle;
            return {
              value: vals,
              itemStyle: {
                color: barColors[i],
                // up-candle body fill
                color0: barColors[i]
                // down-candle body fill
                // borderColor/borderColor0 intentionally omitted → inherits series default (green/red)
              }
            };
          }
          return candle;
        });
        const updateOption = {
          xAxis: currentOption.xAxis.map((axis, index) => ({
            data: categoryData
          })),
          series: [
            {
              data: coloredCandlestickData,
              markLine: candlestickSeries.markLine
              // Ensure markLine is updated
            },
            ...indicatorSeries
          ]
        };
        this.chart.setOption(updateOption, { notMerge: false });
        const allTables = [];
        this.indicators.forEach((indicator) => {
          Object.values(indicator.plots).forEach((plot) => {
            if (plot.options?.style === "table") {
              plot.data?.forEach((entry) => {
                const tables = Array.isArray(entry.value) ? entry.value : [entry.value];
                tables.forEach((t) => {
                  if (t && !t._deleted) {
                    t._paneIndex = t.force_overlay ? 0 : indicator.paneIndex;
                    allTables.push(t);
                  }
                });
              });
            }
          });
        });
        this._lastTables = allTables;
        this._renderTableOverlays();
        this.startCountdown();
      }
      startCountdown() {
        this.stopCountdown();
        if (!this.options.lastPriceLine?.showCountdown || this.marketData.length === 0) {
          return;
        }
        let interval = this.options.interval;
        if (!interval && this.marketData.length >= 2) {
          const last = this.marketData[this.marketData.length - 1];
          const prev = this.marketData[this.marketData.length - 2];
          interval = last.time - prev.time;
        }
        if (!interval)
          return;
        const updateLabel = () => {
          if (this.marketData.length === 0)
            return;
          const lastBar = this.marketData[this.marketData.length - 1];
          const nextCloseTime = lastBar.time + interval;
          const now = Date.now();
          const diff = nextCloseTime - now;
          if (diff <= 0) {
            return;
          }
          const absDiff = Math.abs(diff);
          const hours = Math.floor(absDiff / 36e5);
          const minutes = Math.floor(absDiff % 36e5 / 6e4);
          const seconds = Math.floor(absDiff % 6e4 / 1e3);
          const timeString = `${hours > 0 ? hours.toString().padStart(2, "0") + ":" : ""}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
          const currentOption = this.chart.getOption();
          if (!currentOption || !currentOption.series)
            return;
          const candleSeriesIndex = currentOption.series.findIndex((s) => s.type === "candlestick");
          if (candleSeriesIndex === -1)
            return;
          const candleSeries = currentOption.series[candleSeriesIndex];
          if (!candleSeries.markLine || !candleSeries.markLine.data || !candleSeries.markLine.data[0])
            return;
          const markLineData = candleSeries.markLine.data[0];
          markLineData.label.formatter;
          const price = markLineData.yAxis;
          let priceStr = "";
          if (this.options.yAxisLabelFormatter) {
            priceStr = this.options.yAxisLabelFormatter(price);
          } else {
            const decimals = this.options.yAxisDecimalPlaces !== void 0 ? this.options.yAxisDecimalPlaces : AxisUtils.autoDetectDecimals(this.marketData);
            priceStr = AxisUtils.formatValue(price, decimals);
          }
          const labelText = `${priceStr}
${timeString}`;
          this.chart.setOption({
            series: [
              {
                id: "__candlestick__",
                markLine: {
                  data: [
                    {
                      ...markLineData,
                      // Preserve lineStyle (color), symbol, yAxis, etc.
                      label: {
                        ...markLineData.label,
                        // Preserve existing label styles including backgroundColor
                        formatter: labelText
                        // Update only the text
                      }
                    }
                  ]
                }
              }
            ]
          });
        };
        updateLabel();
        this.countdownInterval = setInterval(updateLabel, 1e3);
      }
      stopCountdown() {
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
      }
      addIndicator(id, plots, options = {}) {
        const isOverlay = options.overlay !== void 0 ? options.overlay : options.isOverlay ?? false;
        let paneIndex = 0;
        if (!isOverlay) {
          let maxPaneIndex = 0;
          this.indicators.forEach((ind) => {
            if (ind.paneIndex > maxPaneIndex) {
              maxPaneIndex = ind.paneIndex;
            }
          });
          paneIndex = maxPaneIndex + 1;
        }
        const indicator = new Indicator(id, plots, paneIndex, {
          height: options.height,
          collapsed: false,
          titleColor: options.titleColor,
          controls: options.controls
        });
        this.indicators.set(id, indicator);
        this.render();
        return indicator;
      }
      /** @deprecated Use addIndicator instead */
      setIndicator(id, plot, isOverlay = false) {
        this.addIndicator(id, { [id]: plot }, { overlay: isOverlay });
      }
      removeIndicator(id) {
        this.indicators.delete(id);
        this.render();
      }
      toggleIndicator(id, action = "collapse") {
        if (action === "fullscreen") {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            this.rootContainer.requestFullscreen();
          }
          return;
        }
        if (action === "maximize") {
          if (this.maximizedPaneId === id) {
            this.maximizedPaneId = null;
          } else {
            this.maximizedPaneId = id;
          }
          this.render();
          return;
        }
        if (id === "main") {
          this.isMainCollapsed = !this.isMainCollapsed;
          this.render();
          return;
        }
        const indicator = this.indicators.get(id);
        if (indicator) {
          indicator.toggleCollapse();
          this.render();
        }
      }
      resize() {
        this.chart.resize();
        this._renderTableOverlays();
      }
      /**
       * Build table canvas graphic elements from the current _lastTables.
       * Must be called AFTER setOption so grid rects are available from ECharts.
       * Returns an array of ECharts graphic elements.
       */
      _buildTableGraphics() {
        const model = this.chart.getModel();
        const getGridRect = (paneIndex) => model.getComponent("grid", paneIndex)?.coordinateSystem?.getRect();
        const elements = TableCanvasRenderer.buildGraphicElements(this._lastTables, getGridRect);
        this._tableGraphicIds = [];
        for (let i = 0; i < elements.length; i++) {
          const id = `__qf_table_${i}`;
          elements[i].id = id;
          this._tableGraphicIds.push(id);
        }
        return elements;
      }
      /**
       * Render table overlays after a non-replacing setOption (updateData, resize).
       * Uses replaceMerge to cleanly replace all graphic elements without disrupting
       * other interactive components (dataZoom, tooltip, etc.).
       */
      _renderTableOverlays() {
        const tableGraphics = this._buildTableGraphics();
        const allGraphics = [...this._baseGraphics, ...tableGraphics];
        this.chart.setOption({ graphic: allGraphics }, { replaceMerge: ["graphic"] });
        TableOverlayRenderer.clearAll(this.overlayContainer);
      }
      destroy() {
        this.stopCountdown();
        window.removeEventListener("resize", this.resize.bind(this));
        document.removeEventListener("fullscreenchange", this.onFullscreenChange);
        document.removeEventListener("keydown", this.onKeyDown);
        this.pluginManager.deactivatePlugin();
        this.pluginManager.destroy();
        this.chart.dispose();
      }
      rebuildTimeIndex() {
        this.timeToIndex.clear();
        this.marketData.forEach((k, index) => {
          this.timeToIndex.set(k.time, index);
        });
        const dataLength = this.marketData.length;
        const initialPadding = Math.ceil(dataLength * this.padding);
        this._paddingPoints = Math.max(this._paddingPoints, initialPadding, this.LAZY_MIN_PADDING);
        this.dataIndexOffset = this._paddingPoints;
      }
      /**
       * Expand symmetric padding to the given number of points per side.
       * No-op if newPaddingPoints <= current. Performs a full render() and
       * restores the viewport position so there is no visual jump.
       */
      expandPadding(newPaddingPoints) {
        this._resizePadding(newPaddingPoints);
      }
      /**
       * Resize symmetric padding to the given number of points per side.
       * Works for both growing and shrinking. Clamps to [min, max].
       * Uses merge-mode setOption to preserve drag/interaction state.
       */
      _resizePadding(newPaddingPoints) {
        const initialPadding = Math.ceil(this.marketData.length * this.padding);
        newPaddingPoints = Math.max(newPaddingPoints, initialPadding, this.LAZY_MIN_PADDING);
        newPaddingPoints = Math.min(newPaddingPoints, this.LAZY_MAX_PADDING);
        if (newPaddingPoints === this._paddingPoints)
          return;
        const oldPadding = this._paddingPoints;
        const oldTotal = this.marketData.length + 2 * oldPadding;
        const currentOption = this.chart.getOption();
        const zoomComp = currentOption?.dataZoom?.find((dz) => dz.type === "slider" || dz.type === "inside");
        const oldStartIdx = zoomComp ? zoomComp.start / 100 * oldTotal : 0;
        const oldEndIdx = zoomComp ? zoomComp.end / 100 * oldTotal : oldTotal;
        const delta = newPaddingPoints - oldPadding;
        this._paddingPoints = newPaddingPoints;
        this.dataIndexOffset = this._paddingPoints;
        const paddingPoints = this._paddingPoints;
        const emptyCandle = { value: [NaN, NaN, NaN, NaN], itemStyle: { opacity: 0 } };
        const candlestickSeries = SeriesBuilder.buildCandlestickSeries(this.marketData, this.options);
        const paddedCandlestickData = [
          ...Array(paddingPoints).fill(emptyCandle),
          ...candlestickSeries.data,
          ...Array(paddingPoints).fill(emptyCandle)
        ];
        const categoryData = [
          ...Array(paddingPoints).fill(""),
          ...this.marketData.map((k) => new Date(k.time).toLocaleString()),
          ...Array(paddingPoints).fill("")
        ];
        const paddedOHLCVForShapes = [...Array(paddingPoints).fill(null), ...this.marketData, ...Array(paddingPoints).fill(null)];
        const layout = LayoutManager.calculate(
          this.chart.getHeight(),
          this.indicators,
          this.options,
          this.isMainCollapsed,
          this.maximizedPaneId,
          this.marketData,
          this._mainHeightOverride ?? void 0
        );
        const { series: indicatorSeries, barColors } = SeriesBuilder.buildIndicatorSeries(
          this.indicators,
          this.timeToIndex,
          layout.paneLayout,
          categoryData.length,
          paddingPoints,
          paddedOHLCVForShapes,
          layout.overlayYAxisMap,
          layout.separatePaneYAxisOffset
        );
        const coloredCandlestickData = paddedCandlestickData.map((candle, i) => {
          if (barColors[i]) {
            const vals = candle.value || candle;
            return {
              value: vals,
              itemStyle: {
                color: barColors[i],
                color0: barColors[i]
              }
            };
          }
          return candle;
        });
        const newTotal = this.marketData.length + 2 * newPaddingPoints;
        const newStart = Math.max(0, (oldStartIdx + delta) / newTotal * 100);
        const newEnd = Math.min(100, (oldEndIdx + delta) / newTotal * 100);
        const drawingSeriesUpdates = [];
        const drawingsByPane = /* @__PURE__ */ new Map();
        this.drawings.forEach((d) => {
          const paneIdx = d.paneIndex || 0;
          if (!drawingsByPane.has(paneIdx))
            drawingsByPane.set(paneIdx, []);
          drawingsByPane.get(paneIdx).push(d);
        });
        drawingsByPane.forEach((paneDrawings) => {
          drawingSeriesUpdates.push({
            data: paneDrawings.map((d) => {
              const row = [];
              d.points.forEach((p) => {
                row.push(p.timeIndex + this.dataIndexOffset, p.value);
              });
              return row;
            })
          });
        });
        const updateOption = {
          xAxis: currentOption.xAxis.map(() => ({ data: categoryData })),
          dataZoom: (currentOption.dataZoom || []).map(() => ({
            start: newStart,
            end: newEnd
          })),
          series: [
            { data: coloredCandlestickData, markLine: candlestickSeries.markLine },
            ...indicatorSeries.map((s) => {
              const update = { data: s.data };
              if (s.renderItem)
                update.renderItem = s.renderItem;
              return update;
            }),
            ...drawingSeriesUpdates
          ]
        };
        this.chart.setOption(updateOption, { notMerge: false });
      }
      /**
       * Check if user scrolled near an edge (expand) or away from edges (contract).
       * Uses requestAnimationFrame to avoid cascading re-renders inside
       * the ECharts dataZoom event callback.
       */
      _checkEdgeAndExpand() {
        if (this._expandScheduled)
          return;
        const zoomComp = this.chart.getOption()?.dataZoom?.find((dz) => dz.type === "slider" || dz.type === "inside");
        if (!zoomComp)
          return;
        const paddingPoints = this._paddingPoints;
        const dataLength = this.marketData.length;
        const totalLength = dataLength + 2 * paddingPoints;
        const startIdx = Math.round(zoomComp.start / 100 * totalLength);
        const endIdx = Math.round(zoomComp.end / 100 * totalLength);
        const dataStart = paddingPoints;
        const dataEnd = paddingPoints + dataLength - 1;
        const visibleCandles = Math.max(0, Math.min(endIdx, dataEnd) - Math.max(startIdx, dataStart) + 1);
        const nearLeftEdge = startIdx < this.LAZY_EDGE_THRESHOLD;
        const nearRightEdge = endIdx > totalLength - this.LAZY_EDGE_THRESHOLD;
        if ((nearLeftEdge || nearRightEdge) && paddingPoints < this.LAZY_MAX_PADDING && visibleCandles >= 3) {
          this._expandScheduled = true;
          requestAnimationFrame(() => {
            this._expandScheduled = false;
            this._resizePadding(paddingPoints + this.LAZY_CHUNK_SIZE);
          });
          return;
        }
        const leftPadUsed = Math.max(0, paddingPoints - startIdx);
        const rightPadUsed = Math.max(0, endIdx - (paddingPoints + dataLength - 1));
        const neededPadding = Math.max(
          leftPadUsed + this.LAZY_CHUNK_SIZE,
          // keep one chunk of buffer
          rightPadUsed + this.LAZY_CHUNK_SIZE
        );
        if (paddingPoints > neededPadding + this.LAZY_CHUNK_SIZE) {
          this._expandScheduled = true;
          requestAnimationFrame(() => {
            this._expandScheduled = false;
            this._resizePadding(neededPadding);
          });
        }
      }
      render() {
        if (this.marketData.length === 0)
          return;
        let currentZoomState = null;
        try {
          const currentOption = this.chart.getOption();
          if (currentOption && currentOption.dataZoom && currentOption.dataZoom.length > 0) {
            const zoomComponent = currentOption.dataZoom.find((dz) => dz.type === "slider" || dz.type === "inside");
            if (zoomComponent) {
              currentZoomState = {
                start: zoomComponent.start,
                end: zoomComponent.end
              };
            }
          }
        } catch (e) {
        }
        const tooltipPos = this.options.databox?.position;
        const prevLeftDisplay = this.leftSidebar.style.display;
        const prevRightDisplay = this.rightSidebar.style.display;
        const newLeftDisplay = tooltipPos === "left" ? "block" : "none";
        const newRightDisplay = tooltipPos === "right" ? "block" : "none";
        if (prevLeftDisplay !== newLeftDisplay || prevRightDisplay !== newRightDisplay) {
          this.leftSidebar.style.display = newLeftDisplay;
          this.rightSidebar.style.display = newRightDisplay;
          this.chart.resize();
        }
        const paddingPoints = this.dataIndexOffset;
        const categoryData = [
          ...Array(paddingPoints).fill(""),
          // Left padding
          ...this.marketData.map((k) => new Date(k.time).toLocaleString()),
          ...Array(paddingPoints).fill("")
          // Right padding
        ];
        const layout = LayoutManager.calculate(
          this.chart.getHeight(),
          this.indicators,
          this.options,
          this.isMainCollapsed,
          this.maximizedPaneId,
          this.marketData,
          this._mainHeightOverride ?? void 0
        );
        this._lastLayout = layout;
        if (!currentZoomState && layout.dataZoom && this.marketData.length > 0) {
          const realDataLength = this.marketData.length;
          const totalLength = categoryData.length;
          const paddingRatio = paddingPoints / totalLength;
          const dataRatio = realDataLength / totalLength;
          layout.dataZoom.forEach((dz) => {
            if (dz.start !== void 0) {
              const userStartFraction = dz.start / 100;
              const actualStartFraction = paddingRatio + userStartFraction * dataRatio;
              dz.start = actualStartFraction * 100;
            }
            if (dz.end !== void 0) {
              const userEndFraction = dz.end / 100;
              const actualEndFraction = paddingRatio + userEndFraction * dataRatio;
              dz.end = actualEndFraction * 100;
            }
          });
        }
        if (currentZoomState && layout.dataZoom) {
          layout.dataZoom.forEach((dz) => {
            dz.start = currentZoomState.start;
            dz.end = currentZoomState.end;
          });
        }
        layout.xAxis.forEach((axis) => {
          axis.data = categoryData;
          axis.boundaryGap = false;
        });
        const candlestickSeries = SeriesBuilder.buildCandlestickSeries(this.marketData, this.options);
        const emptyCandle = { value: [NaN, NaN, NaN, NaN], itemStyle: { opacity: 0 } };
        candlestickSeries.data = [...Array(paddingPoints).fill(emptyCandle), ...candlestickSeries.data, ...Array(paddingPoints).fill(emptyCandle)];
        const paddedOHLCVForShapes = [...Array(paddingPoints).fill(null), ...this.marketData, ...Array(paddingPoints).fill(null)];
        const { series: indicatorSeries, barColors } = SeriesBuilder.buildIndicatorSeries(
          this.indicators,
          this.timeToIndex,
          layout.paneLayout,
          categoryData.length,
          paddingPoints,
          paddedOHLCVForShapes,
          // Pass padded OHLCV
          layout.overlayYAxisMap,
          // Pass overlay Y-axis mapping
          layout.separatePaneYAxisOffset
          // Pass Y-axis offset for separate panes
        );
        candlestickSeries.data = candlestickSeries.data.map((candle, i) => {
          if (barColors[i]) {
            const vals = candle.value || candle;
            return {
              value: vals,
              itemStyle: {
                color: barColors[i],
                color0: barColors[i]
              }
            };
          }
          return candle;
        });
        const overlayIndicators = [];
        this.indicators.forEach((ind, id) => {
          if (ind.paneIndex === 0) {
            overlayIndicators.push({ id, titleColor: ind.titleColor });
          }
        });
        const graphic = GraphicBuilder.build(
          layout,
          this.options,
          this.toggleIndicator.bind(this),
          this.isMainCollapsed,
          this.maximizedPaneId,
          overlayIndicators
        );
        const drawingsByPane = /* @__PURE__ */ new Map();
        this.drawings.forEach((d) => {
          const paneIdx = d.paneIndex || 0;
          if (!drawingsByPane.has(paneIdx)) {
            drawingsByPane.set(paneIdx, []);
          }
          drawingsByPane.get(paneIdx).push(d);
        });
        const drawingSeriesList = [];
        drawingsByPane.forEach((drawings, paneIndex) => {
          drawingSeriesList.push({
            type: "custom",
            name: `drawings-pane-${paneIndex}`,
            xAxisIndex: paneIndex,
            yAxisIndex: paneIndex,
            clip: true,
            renderItem: (params, api) => {
              const drawing = drawings[params.dataIndex];
              if (!drawing)
                return;
              const renderer = this.drawingRenderers.get(drawing.type);
              if (!renderer)
                return;
              const drawingOffset = this.dataIndexOffset;
              const pixelPoints = drawing.points.map(
                (p) => api.coord([p.timeIndex + drawingOffset, p.value])
              );
              return renderer.render({
                drawing,
                pixelPoints,
                isSelected: drawing.id === this.selectedDrawingId,
                api,
                coordSys: params.coordSys
              });
            },
            data: drawings.map((d) => {
              const row = [];
              d.points.forEach((p) => {
                row.push(p.timeIndex + this.dataIndexOffset, p.value);
              });
              return row;
            }),
            encode: (() => {
              const maxPoints = drawings.reduce((max, d) => Math.max(max, d.points.length), 0);
              const xDims = Array.from({ length: maxPoints }, (_, i) => i * 2);
              const yDims = Array.from({ length: maxPoints }, (_, i) => i * 2 + 1);
              return { x: xDims, y: yDims };
            })(),
            z: 100,
            silent: false
          });
        });
        const tooltipFormatter = (params) => {
          const html = TooltipFormatter.format(params, this.options);
          const mode = this.options.databox?.position;
          if (mode === "left") {
            this.leftSidebar.innerHTML = html;
            return "";
          }
          if (mode === "right") {
            this.rightSidebar.innerHTML = html;
            return "";
          }
          if (!this.options.databox) {
            return "";
          }
          return `<div style="min-width: 200px;">${html}</div>`;
        };
        const allTables = [];
        this.indicators.forEach((indicator) => {
          Object.values(indicator.plots).forEach((plot) => {
            if (plot.options?.style === "table") {
              plot.data?.forEach((entry) => {
                const tables = Array.isArray(entry.value) ? entry.value : [entry.value];
                tables.forEach((t) => {
                  if (t && !t._deleted) {
                    t._paneIndex = t.force_overlay ? 0 : indicator.paneIndex;
                    allTables.push(t);
                  }
                });
              });
            }
          });
        });
        const option = {
          backgroundColor: this.options.backgroundColor,
          animation: false,
          legend: {
            show: false
            // Hide default legend as we use tooltip
          },
          tooltip: {
            show: true,
            showContent: !!this.options.databox,
            // Show content only if databox is present
            trigger: "axis",
            triggerOn: this.options.databox?.triggerOn ?? "mousemove",
            // Control when to show tooltip/crosshair
            axisPointer: { type: "cross", label: { backgroundColor: "#475569" } },
            backgroundColor: "rgba(30, 41, 59, 0.9)",
            borderWidth: 1,
            borderColor: "#334155",
            padding: 10,
            textStyle: {
              color: "#fff",
              fontFamily: this.options.fontFamily || "sans-serif"
            },
            formatter: tooltipFormatter,
            extraCssText: tooltipPos !== "floating" && tooltipPos !== void 0 ? "display: none !important;" : void 0,
            position: (pos, params, el, elRect, size) => {
              const mode = this.options.databox?.position;
              if (mode === "floating") {
                const obj = { top: 10 };
                obj[["left", "right"][+(pos[0] < size.viewSize[0] / 2)]] = 30;
                return obj;
              }
              return null;
            }
          },
          axisPointer: {
            link: { xAxisIndex: "all" },
            label: { backgroundColor: "#475569" }
          },
          graphic,
          grid: layout.grid,
          xAxis: layout.xAxis,
          yAxis: layout.yAxis,
          dataZoom: layout.dataZoom,
          series: [candlestickSeries, ...indicatorSeries, ...drawingSeriesList]
        };
        this.chart.setOption(option, true);
        this._baseGraphics = graphic;
        this._lastTables = allTables;
        if (allTables.length > 0) {
          const tableGraphics = this._buildTableGraphics();
          if (tableGraphics.length > 0) {
            const allGraphics = [...graphic, ...tableGraphics];
            this.chart.setOption({ graphic: allGraphics }, { replaceMerge: ["graphic"] });
          }
        } else {
          this._tableGraphicIds = [];
        }
        TableOverlayRenderer.clearAll(this.overlayContainer);
      }
    }

    var __defProp$E = Object.defineProperty;
    var __defNormalProp$E = (obj, key, value) => key in obj ? __defProp$E(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$E = (obj, key, value) => {
      __defNormalProp$E(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class AbstractPlugin {
      constructor(config) {
        __publicField$E(this, "id");
        __publicField$E(this, "name");
        __publicField$E(this, "icon");
        __publicField$E(this, "context");
        __publicField$E(this, "eventListeners", []);
        // Snap indicator
        __publicField$E(this, "_snapIndicator", null);
        __publicField$E(this, "_snapMoveHandler", null);
        __publicField$E(this, "_snapKeyDownHandler", null);
        __publicField$E(this, "_snapKeyUpHandler", null);
        __publicField$E(this, "_snapBlurHandler", null);
        __publicField$E(this, "_snapActive", false);
        __publicField$E(this, "_lastMouseEvent", null);
        this.id = config.id;
        this.name = config.name;
        this.icon = config.icon;
      }
      init(context) {
        this.context = context;
        this.onInit();
      }
      /**
       * Lifecycle hook called after context is initialized.
       * Override this instead of init().
       */
      onInit() {
      }
      activate() {
        this.onActivate();
        this._bindSnapIndicator();
        this.context.events.emit("plugin:activated", this.id);
      }
      /**
       * Lifecycle hook called when the plugin is activated.
       */
      onActivate() {
      }
      deactivate() {
        this._unbindSnapIndicator();
        this.onDeactivate();
        this.context.events.emit("plugin:deactivated", this.id);
      }
      /**
       * Lifecycle hook called when the plugin is deactivated.
       */
      onDeactivate() {
      }
      destroy() {
        this._unbindSnapIndicator();
        this.removeAllListeners();
        this.onDestroy();
      }
      /**
       * Lifecycle hook called when the plugin is destroyed.
       */
      onDestroy() {
      }
      // --- Helper Methods ---
      /**
       * Register an event listener that will be automatically cleaned up on destroy.
       */
      on(event, handler) {
        this.context.events.on(event, handler);
        this.eventListeners.push({ event, handler });
      }
      /**
       * Remove a specific event listener.
       */
      off(event, handler) {
        this.context.events.off(event, handler);
        this.eventListeners = this.eventListeners.filter(
          (l) => l.event !== event || l.handler !== handler
        );
      }
      /**
       * Remove all listeners registered by this plugin.
       */
      removeAllListeners() {
        this.eventListeners.forEach(({ event, handler }) => {
          this.context.events.off(event, handler);
        });
        this.eventListeners = [];
      }
      /**
       * Access to the ECharts instance.
       */
      get chart() {
        return this.context.getChart();
      }
      /**
       * Access to market data.
       */
      get marketData() {
        return this.context.getMarketData();
      }
      /**
       * Get the event point coordinates, snapping to nearest candle OHLC if Ctrl is held.
       * Use this instead of [params.offsetX, params.offsetY] in click/mousemove handlers.
       */
      getPoint(params) {
        const x = params.offsetX;
        const y = params.offsetY;
        const event = params.event;
        const ctrlKey = event?.ctrlKey || event?.metaKey;
        if (ctrlKey) {
          const snapped = this.context.snapToCandle({ x, y });
          return [snapped.x, snapped.y];
        }
        return [x, y];
      }
      // --- Snap Indicator (internal) ---
      _bindSnapIndicator() {
        const zr = this.context.getChart().getZr();
        this._snapMoveHandler = (e) => {
          this._lastMouseEvent = e;
          const ctrlKey = e.event?.ctrlKey || e.event?.metaKey;
          if (ctrlKey) {
            this._showSnapAt(e.offsetX, e.offsetY);
          } else {
            this._hideSnap();
          }
        };
        this._snapKeyDownHandler = (e) => {
          if ((e.key === "Control" || e.key === "Meta") && this._lastMouseEvent) {
            this._showSnapAt(this._lastMouseEvent.offsetX, this._lastMouseEvent.offsetY);
          }
        };
        this._snapKeyUpHandler = (e) => {
          if (e.key === "Control" || e.key === "Meta") {
            this._hideSnap();
          }
        };
        this._snapBlurHandler = () => {
          this._hideSnap();
        };
        zr.on("mousemove", this._snapMoveHandler);
        window.addEventListener("keydown", this._snapKeyDownHandler);
        window.addEventListener("keyup", this._snapKeyUpHandler);
        window.addEventListener("blur", this._snapBlurHandler);
      }
      _unbindSnapIndicator() {
        if (this._snapMoveHandler) {
          try {
            this.context.getChart().getZr().off("mousemove", this._snapMoveHandler);
          } catch {
          }
          this._snapMoveHandler = null;
        }
        if (this._snapKeyDownHandler) {
          window.removeEventListener("keydown", this._snapKeyDownHandler);
          this._snapKeyDownHandler = null;
        }
        if (this._snapKeyUpHandler) {
          window.removeEventListener("keyup", this._snapKeyUpHandler);
          this._snapKeyUpHandler = null;
        }
        if (this._snapBlurHandler) {
          window.removeEventListener("blur", this._snapBlurHandler);
          this._snapBlurHandler = null;
        }
        this._removeSnapGraphic();
        this._lastMouseEvent = null;
      }
      _removeSnapGraphic() {
        if (this._snapIndicator) {
          try {
            this.context.getChart().getZr().remove(this._snapIndicator);
          } catch {
          }
          this._snapIndicator = null;
          this._snapActive = false;
        }
      }
      _showSnapAt(x, y) {
        const snapped = this.context.snapToCandle({ x, y });
        const zr = this.context.getChart().getZr();
        if (!this._snapIndicator) {
          this._snapIndicator = new echarts__namespace.graphic.Circle({
            shape: { cx: 0, cy: 0, r: 5 },
            style: {
              fill: "rgba(59, 130, 246, 0.3)",
              stroke: "#3b82f6",
              lineWidth: 1.5
            },
            z: 9999,
            silent: true
          });
          zr.add(this._snapIndicator);
        }
        this._snapIndicator.setShape({ cx: snapped.x, cy: snapped.y });
        this._snapIndicator.show();
        this._snapActive = true;
      }
      _hideSnap() {
        if (this._snapIndicator && this._snapActive) {
          this._snapIndicator.hide();
          this._snapActive = false;
        }
      }
    }

    var __defProp$D = Object.defineProperty;
    var __defNormalProp$D = (obj, key, value) => key in obj ? __defProp$D(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$D = (obj, key, value) => {
      __defNormalProp$D(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class MeasureTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "measure",
          name: options?.name || "Measure",
          icon: options?.icon || `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M160-240q-33 0-56.5-23.5T80-320v-320q0-33 23.5-56.5T160-720h640q33 0 56.5 23.5T880-640v320q0 33-23.5 56.5T800-240H160Zm0-80h640v-320H680v160h-80v-160h-80v160h-80v-160h-80v160h-80v-160H160v320Zm120-160h80-80Zm160 0h80-80Zm160 0h80-80Zm-120 0Z"/></svg>`
        });
        __publicField$D(this, "zr");
        __publicField$D(this, "state", "idle");
        __publicField$D(this, "startPoint", null);
        __publicField$D(this, "endPoint", null);
        // ZRender Elements
        __publicField$D(this, "group", null);
        __publicField$D(this, "rect", null);
        __publicField$D(this, "labelRect", null);
        __publicField$D(this, "labelText", null);
        __publicField$D(this, "lineV", null);
        __publicField$D(this, "lineH", null);
        __publicField$D(this, "arrowStart", null);
        __publicField$D(this, "arrowEnd", null);
        // --- Interaction Handlers ---
        __publicField$D(this, "onMouseDown", () => {
          if (this.state === "finished") {
            this.removeGraphic();
          }
        });
        __publicField$D(this, "onChartInteraction", () => {
          if (this.group) {
            this.removeGraphic();
          }
        });
        __publicField$D(this, "onClick", (params) => {
          if (this.state === "idle") {
            this.state = "drawing";
            this.startPoint = this.getPoint(params);
            this.endPoint = this.getPoint(params);
            this.initGraphic();
            this.updateGraphic();
          } else if (this.state === "drawing") {
            this.state = "finished";
            this.endPoint = this.getPoint(params);
            this.updateGraphic();
            this.context.disableTools();
            this.enableClearListeners();
          }
        });
        __publicField$D(this, "clearHandlers", {});
        __publicField$D(this, "onMouseMove", (params) => {
          if (this.state !== "drawing")
            return;
          this.endPoint = this.getPoint(params);
          this.updateGraphic();
        });
      }
      onInit() {
        this.zr = this.chart.getZr();
      }
      onActivate() {
        this.state = "idle";
        this.chart.getZr().setCursorStyle("crosshair");
        this.zr.on("click", this.onClick);
        this.zr.on("mousemove", this.onMouseMove);
      }
      onDeactivate() {
        this.state = "idle";
        this.chart.getZr().setCursorStyle("default");
        this.zr.off("click", this.onClick);
        this.zr.off("mousemove", this.onMouseMove);
        this.disableClearListeners();
        if (this.state === "drawing") {
          this.removeGraphic();
        }
      }
      onDestroy() {
        this.removeGraphic();
      }
      enableClearListeners() {
        const clickHandler = () => {
          this.removeGraphic();
        };
        setTimeout(() => {
          this.zr.on("click", clickHandler);
        }, 10);
        this.zr.on("mousedown", this.onMouseDown);
        this.context.events.on("chart:dataZoom", this.onChartInteraction);
        this.clearHandlers = {
          click: clickHandler,
          mousedown: this.onMouseDown,
          dataZoom: this.onChartInteraction
        };
      }
      disableClearListeners() {
        if (this.clearHandlers.click)
          this.zr.off("click", this.clearHandlers.click);
        if (this.clearHandlers.mousedown)
          this.zr.off("mousedown", this.clearHandlers.mousedown);
        if (this.clearHandlers.dataZoom) {
          this.context.events.off("chart:dataZoom", this.clearHandlers.dataZoom);
        }
        this.clearHandlers = {};
      }
      // --- Graphics ---
      initGraphic() {
        if (this.group)
          return;
        this.group = new echarts__namespace.graphic.Group();
        this.rect = new echarts__namespace.graphic.Rect({
          shape: { x: 0, y: 0, width: 0, height: 0 },
          style: { fill: "rgba(0,0,0,0)", stroke: "transparent", lineWidth: 0 },
          z: 100
        });
        this.lineV = new echarts__namespace.graphic.Line({
          shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
          style: { stroke: "#fff", lineWidth: 1, lineDash: [4, 4] },
          z: 101
        });
        this.lineH = new echarts__namespace.graphic.Line({
          shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
          style: { stroke: "#fff", lineWidth: 1, lineDash: [4, 4] },
          z: 101
        });
        this.arrowStart = new echarts__namespace.graphic.Polygon({
          shape: {
            points: [
              [0, 0],
              [-5, 10],
              [5, 10]
            ]
          },
          style: { fill: "#fff" },
          z: 102
        });
        this.arrowEnd = new echarts__namespace.graphic.Polygon({
          shape: {
            points: [
              [0, 0],
              [-5, -10],
              [5, -10]
            ]
          },
          style: { fill: "#fff" },
          z: 102
        });
        this.labelRect = new echarts__namespace.graphic.Rect({
          shape: { x: 0, y: 0, width: 0, height: 0, r: 4 },
          style: {
            fill: "transparent",
            stroke: "transparent",
            lineWidth: 0,
            shadowBlur: 5,
            shadowColor: "rgba(0,0,0,0.3)"
          },
          z: 102
        });
        this.labelText = new echarts__namespace.graphic.Text({
          style: {
            x: 0,
            y: 0,
            text: "",
            fill: "#fff",
            font: "12px sans-serif",
            align: "center",
            verticalAlign: "middle"
          },
          z: 103
        });
        this.group.add(this.rect);
        this.group.add(this.lineV);
        this.group.add(this.lineH);
        this.group.add(this.arrowStart);
        this.group.add(this.arrowEnd);
        this.group.add(this.labelRect);
        this.group.add(this.labelText);
        this.zr.add(this.group);
      }
      removeGraphic() {
        if (this.group) {
          this.zr.remove(this.group);
          this.group = null;
          this.disableClearListeners();
        }
      }
      updateGraphic() {
        if (!this.startPoint || !this.endPoint || !this.group)
          return;
        const [x1, y1] = this.startPoint;
        const [x2, y2] = this.endPoint;
        const p1 = this.context.coordinateConversion.pixelToData({ x: x1, y: y1 });
        const p2 = this.context.coordinateConversion.pixelToData({ x: x2, y: y2 });
        if (!p1 || !p2)
          return;
        const idx1 = Math.round(p1.timeIndex);
        const idx2 = Math.round(p2.timeIndex);
        const val1 = p1.value;
        const val2 = p2.value;
        const bars = idx2 - idx1;
        const priceDiff = val2 - val1;
        const priceChangePercent = priceDiff / val1 * 100;
        const isUp = priceDiff >= 0;
        const color = isUp ? "rgba(33, 150, 243, 0.2)" : "rgba(236, 0, 0, 0.2)";
        const strokeColor = isUp ? "#2196F3" : "#ec0000";
        this.rect.setShape({
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          width: Math.abs(x2 - x1),
          height: Math.abs(y2 - y1)
        });
        this.rect.setStyle({ fill: color });
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        this.lineV.setShape({ x1: midX, y1, x2: midX, y2 });
        this.lineV.setStyle({ stroke: strokeColor });
        this.lineH.setShape({ x1, y1: midY, x2, y2: midY });
        this.lineH.setStyle({ stroke: strokeColor });
        const topY = Math.min(y1, y2);
        const bottomY = Math.max(y1, y2);
        this.arrowStart.setStyle({ fill: "none" });
        this.arrowEnd.setStyle({ fill: "none" });
        if (isUp) {
          this.arrowStart.setShape({
            points: [
              [midX, topY],
              [midX - 4, topY + 6],
              [midX + 4, topY + 6]
            ]
          });
          this.arrowStart.setStyle({ fill: strokeColor });
        } else {
          this.arrowEnd.setShape({
            points: [
              [midX, bottomY],
              [midX - 4, bottomY - 6],
              [midX + 4, bottomY - 6]
            ]
          });
          this.arrowEnd.setStyle({ fill: strokeColor });
        }
        const textContent = [`${priceDiff.toFixed(2)} (${priceChangePercent.toFixed(2)}%)`, `${bars} bars`].join("\n");
        const labelW = 140;
        const labelH = 40;
        const rectBottomY = Math.max(y1, y2);
        const rectTopY = Math.min(y1, y2);
        const rectCenterX = (x1 + x2) / 2;
        let labelX = rectCenterX - labelW / 2;
        let labelY = rectBottomY + 10;
        const canvasHeight = this.chart.getHeight();
        if (labelY + labelH > canvasHeight) {
          labelY = rectTopY - labelH - 10;
        }
        this.labelRect.setShape({
          x: labelX,
          y: labelY,
          width: labelW,
          height: labelH
        });
        this.labelRect.setStyle({
          fill: "#1e293b",
          stroke: strokeColor,
          lineWidth: 1
        });
        this.labelText.setStyle({
          x: labelX + labelW / 2,
          y: labelY + labelH / 2,
          text: textContent,
          fill: "#fff"
        });
      }
    }

    var __defProp$C = Object.defineProperty;
    var __defNormalProp$C = (obj, key, value) => key in obj ? __defProp$C(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$C = (obj, key, value) => {
      __defNormalProp$C(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class LineDrawingRenderer {
      constructor() {
        __publicField$C(this, "type", "line");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected } = ctx;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const color = drawing.style?.color || "#d1d4dc";
        return {
          type: "group",
          children: [
            {
              type: "line",
              name: "line",
              shape: { x1, y1, x2, y2 },
              style: {
                stroke: color,
                lineWidth: drawing.style?.lineWidth || 1
              }
            },
            {
              type: "circle",
              name: "point-0",
              shape: { cx: x1, cy: y1, r: 4 },
              style: {
                fill: "#fff",
                stroke: color,
                lineWidth: 1,
                opacity: isSelected ? 1 : 0
              }
            },
            {
              type: "circle",
              name: "point-1",
              shape: { cx: x2, cy: y2, r: 4 },
              style: {
                fill: "#fff",
                stroke: color,
                lineWidth: 1,
                opacity: isSelected ? 1 : 0
              }
            }
          ]
        };
      }
    }

    var __defProp$B = Object.defineProperty;
    var __defNormalProp$B = (obj, key, value) => key in obj ? __defProp$B(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$B = (obj, key, value) => {
      __defNormalProp$B(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class LineTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "trend-line",
          name: options?.name || "Trend Line",
          icon: options?.icon || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="22" x2="22" y2="2" /></svg>`
        });
        __publicField$B(this, "zr");
        __publicField$B(this, "state", "idle");
        __publicField$B(this, "startPoint", null);
        __publicField$B(this, "endPoint", null);
        // ZRender Elements
        __publicField$B(this, "group", null);
        __publicField$B(this, "line", null);
        __publicField$B(this, "startCircle", null);
        __publicField$B(this, "endCircle", null);
        // --- Interaction Handlers ---
        __publicField$B(this, "onClick", (params) => {
          if (this.state === "idle") {
            this.state = "drawing";
            this.startPoint = this.getPoint(params);
            this.endPoint = this.getPoint(params);
            this.initGraphic();
            this.updateGraphic();
          } else if (this.state === "drawing") {
            this.state = "finished";
            this.endPoint = this.getPoint(params);
            this.updateGraphic();
            if (this.startPoint && this.endPoint) {
              const start = this.context.coordinateConversion.pixelToData({
                x: this.startPoint[0],
                y: this.startPoint[1]
              });
              const end = this.context.coordinateConversion.pixelToData({
                x: this.endPoint[0],
                y: this.endPoint[1]
              });
              if (start && end) {
                const paneIndex = start.paneIndex || 0;
                this.context.addDrawing({
                  id: `line-${Date.now()}`,
                  type: "line",
                  points: [start, end],
                  paneIndex,
                  style: {
                    color: "#d1d4dc",
                    lineWidth: 1
                  }
                });
              }
            }
            this.removeGraphic();
            this.context.disableTools();
          }
        });
        __publicField$B(this, "onMouseMove", (params) => {
          if (this.state !== "drawing")
            return;
          this.endPoint = this.getPoint(params);
          this.updateGraphic();
        });
      }
      onInit() {
        this.zr = this.chart.getZr();
        this.context.registerDrawingRenderer(new LineDrawingRenderer());
      }
      onActivate() {
        this.state = "idle";
        this.chart.getZr().setCursorStyle("crosshair");
        this.zr.on("click", this.onClick);
        this.zr.on("mousemove", this.onMouseMove);
      }
      onDeactivate() {
        this.state = "idle";
        this.chart.getZr().setCursorStyle("default");
        this.zr.off("click", this.onClick);
        this.zr.off("mousemove", this.onMouseMove);
        if (this.state === "drawing") {
          this.removeGraphic();
        }
      }
      onDestroy() {
        this.removeGraphic();
      }
      // --- Graphics ---
      initGraphic() {
        if (this.group)
          return;
        this.group = new echarts__namespace.graphic.Group();
        this.line = new echarts__namespace.graphic.Line({
          shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
          style: { stroke: "#d1d4dc", lineWidth: 1 },
          z: 100
        });
        this.startCircle = new echarts__namespace.graphic.Circle({
          shape: { cx: 0, cy: 0, r: 4 },
          style: { fill: "#fff", stroke: "#d1d4dc", lineWidth: 1 },
          z: 101
        });
        this.endCircle = new echarts__namespace.graphic.Circle({
          shape: { cx: 0, cy: 0, r: 4 },
          style: { fill: "#fff", stroke: "#d1d4dc", lineWidth: 1 },
          z: 101
        });
        this.group.add(this.line);
        this.group.add(this.startCircle);
        this.group.add(this.endCircle);
        this.zr.add(this.group);
      }
      removeGraphic() {
        if (this.group) {
          this.zr.remove(this.group);
          this.group = null;
        }
      }
      updateGraphic() {
        if (!this.startPoint || !this.endPoint || !this.group)
          return;
        const [x1, y1] = this.startPoint;
        const [x2, y2] = this.endPoint;
        this.line.setShape({ x1, y1, x2, y2 });
        this.startCircle.setShape({ cx: x1, cy: y1 });
        this.endCircle.setShape({ cx: x2, cy: y2 });
      }
    }

    var __defProp$A = Object.defineProperty;
    var __defNormalProp$A = (obj, key, value) => key in obj ? __defProp$A(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$A = (obj, key, value) => {
      __defNormalProp$A(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class RayDrawingRenderer {
      constructor() {
        __publicField$A(this, "type", "ray");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected, coordSys } = ctx;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const color = drawing.style?.color || "#d1d4dc";
        const [ex, ey] = this.extendToEdge(x1, y1, x2, y2, coordSys);
        return {
          type: "group",
          children: [
            {
              type: "line",
              name: "line",
              shape: { x1, y1, x2: ex, y2: ey },
              style: {
                stroke: color,
                lineWidth: drawing.style?.lineWidth || 1
              }
            },
            {
              type: "circle",
              name: "point-0",
              shape: { cx: x1, cy: y1, r: 4 },
              style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }
            },
            {
              type: "circle",
              name: "point-1",
              shape: { cx: x2, cy: y2, r: 4 },
              style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }
            }
          ]
        };
      }
      extendToEdge(x1, y1, x2, y2, cs) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (dx === 0 && dy === 0)
          return [x2, y2];
        const left = cs.x;
        const right = cs.x + cs.width;
        const top = cs.y;
        const bottom = cs.y + cs.height;
        let tMax = Infinity;
        if (dx !== 0) {
          const tx = dx > 0 ? (right - x1) / dx : (left - x1) / dx;
          if (tx > 0)
            tMax = Math.min(tMax, tx);
        }
        if (dy !== 0) {
          const ty = dy > 0 ? (bottom - y1) / dy : (top - y1) / dy;
          if (ty > 0)
            tMax = Math.min(tMax, ty);
        }
        if (!isFinite(tMax))
          tMax = 1;
        return [x1 + tMax * dx, y1 + tMax * dy];
      }
    }

    var __defProp$z = Object.defineProperty;
    var __defNormalProp$z = (obj, key, value) => key in obj ? __defProp$z(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$z = (obj, key, value) => {
      __defNormalProp$z(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const COLOR$2 = "#d1d4dc";
    class RayTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "ray-tool",
          name: options?.name || "Ray",
          icon: options?.icon || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="20" x2="21" y2="4"/><circle cx="21" cy="4" r="0" fill="currentColor"/><polyline points="16,4 21,4 21,9" stroke-width="1.5"/></svg>`
        });
        __publicField$z(this, "zr");
        __publicField$z(this, "state", "idle");
        __publicField$z(this, "startPoint", null);
        __publicField$z(this, "endPoint", null);
        __publicField$z(this, "group", null);
        __publicField$z(this, "line", null);
        __publicField$z(this, "dashLine", null);
        __publicField$z(this, "startCircle", null);
        __publicField$z(this, "endCircle", null);
        __publicField$z(this, "onClick", (params) => {
          if (this.state === "idle") {
            this.state = "drawing";
            this.startPoint = this.getPoint(params);
            this.endPoint = this.getPoint(params);
            this.initGraphic();
            this.updateGraphic();
          } else if (this.state === "drawing") {
            this.state = "finished";
            this.endPoint = this.getPoint(params);
            if (this.startPoint && this.endPoint) {
              const start = this.context.coordinateConversion.pixelToData({
                x: this.startPoint[0],
                y: this.startPoint[1]
              });
              const end = this.context.coordinateConversion.pixelToData({
                x: this.endPoint[0],
                y: this.endPoint[1]
              });
              if (start && end) {
                this.context.addDrawing({
                  id: `ray-${Date.now()}`,
                  type: "ray",
                  points: [start, end],
                  paneIndex: start.paneIndex || 0,
                  style: { color: COLOR$2, lineWidth: 1 }
                });
              }
            }
            this.removeGraphic();
            this.context.disableTools();
          }
        });
        __publicField$z(this, "onMouseMove", (params) => {
          if (this.state !== "drawing")
            return;
          this.endPoint = this.getPoint(params);
          this.updateGraphic();
        });
      }
      onInit() {
        this.zr = this.chart.getZr();
        this.context.registerDrawingRenderer(new RayDrawingRenderer());
      }
      onActivate() {
        this.state = "idle";
        this.chart.getZr().setCursorStyle("crosshair");
        this.zr.on("click", this.onClick);
        this.zr.on("mousemove", this.onMouseMove);
      }
      onDeactivate() {
        this.state = "idle";
        this.chart.getZr().setCursorStyle("default");
        this.zr.off("click", this.onClick);
        this.zr.off("mousemove", this.onMouseMove);
        this.removeGraphic();
      }
      onDestroy() {
        this.removeGraphic();
      }
      initGraphic() {
        if (this.group)
          return;
        this.group = new echarts__namespace.graphic.Group();
        this.line = new echarts__namespace.graphic.Line({
          shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
          style: { stroke: COLOR$2, lineWidth: 1 },
          z: 100
        });
        this.dashLine = new echarts__namespace.graphic.Line({
          shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
          style: { stroke: COLOR$2, lineWidth: 1, lineDash: [4, 4], opacity: 0.5 },
          z: 99
        });
        this.startCircle = new echarts__namespace.graphic.Circle({
          shape: { cx: 0, cy: 0, r: 4 },
          style: { fill: "#fff", stroke: COLOR$2, lineWidth: 1 },
          z: 101
        });
        this.endCircle = new echarts__namespace.graphic.Circle({
          shape: { cx: 0, cy: 0, r: 4 },
          style: { fill: "#fff", stroke: COLOR$2, lineWidth: 1 },
          z: 101
        });
        this.group.add(this.dashLine);
        this.group.add(this.line);
        this.group.add(this.startCircle);
        this.group.add(this.endCircle);
        this.zr.add(this.group);
      }
      removeGraphic() {
        if (this.group) {
          this.zr.remove(this.group);
          this.group = null;
        }
      }
      updateGraphic() {
        if (!this.startPoint || !this.endPoint || !this.group)
          return;
        const [x1, y1] = this.startPoint;
        const [x2, y2] = this.endPoint;
        this.line.setShape({ x1, y1, x2, y2 });
        this.startCircle.setShape({ cx: x1, cy: y1 });
        this.endCircle.setShape({ cx: x2, cy: y2 });
        const [ex, ey] = this.extendToEdge(x1, y1, x2, y2);
        this.dashLine.setShape({ x1: x2, y1: y2, x2: ex, y2: ey });
      }
      extendToEdge(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (dx === 0 && dy === 0)
          return [x2, y2];
        const w = this.chart.getWidth();
        const h = this.chart.getHeight();
        let tMax = Infinity;
        if (dx !== 0) {
          const tx = dx > 0 ? (w - x1) / dx : -x1 / dx;
          if (tx > 0)
            tMax = Math.min(tMax, tx);
        }
        if (dy !== 0) {
          const ty = dy > 0 ? (h - y1) / dy : -y1 / dy;
          if (ty > 0)
            tMax = Math.min(tMax, ty);
        }
        if (!isFinite(tMax))
          tMax = 1;
        return [x1 + tMax * dx, y1 + tMax * dy];
      }
    }

    var __defProp$y = Object.defineProperty;
    var __defNormalProp$y = (obj, key, value) => key in obj ? __defProp$y(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$y = (obj, key, value) => {
      __defNormalProp$y(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class InfoLineDrawingRenderer {
      constructor() {
        __publicField$y(this, "type", "info-line");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected } = ctx;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const color = drawing.style?.color || "#d1d4dc";
        const p0 = drawing.points[0];
        const p1 = drawing.points[1];
        const priceChange = p1.value - p0.value;
        const pctChange = p0.value !== 0 ? priceChange / p0.value * 100 : 0;
        const bars = Math.abs(p1.timeIndex - p0.timeIndex);
        const sign = priceChange >= 0 ? "+" : "";
        const infoText = `${sign}${priceChange.toFixed(2)} (${sign}${pctChange.toFixed(2)}%)  ${bars} bars`;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const isUp = priceChange >= 0;
        const textColor = isUp ? "#26a69a" : "#ef5350";
        return {
          type: "group",
          children: [
            {
              type: "line",
              name: "line",
              shape: { x1, y1, x2, y2 },
              style: { stroke: color, lineWidth: drawing.style?.lineWidth || 1 }
            },
            // Info box background
            {
              type: "rect",
              shape: { x: mx - 2, y: my - 22, width: infoText.length * 6.5 + 12, height: 18, r: 3 },
              style: { fill: "#1e293b", stroke: "#475569", lineWidth: 1, opacity: 0.9 },
              z2: 10
            },
            // Info text
            {
              type: "text",
              x: mx + 4,
              y: my - 20,
              style: {
                text: infoText,
                fill: textColor,
                fontSize: 11,
                fontFamily: "monospace"
              },
              z2: 11
            },
            {
              type: "circle",
              name: "point-0",
              shape: { cx: x1, cy: y1, r: 4 },
              style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }
            },
            {
              type: "circle",
              name: "point-1",
              shape: { cx: x2, cy: y2, r: 4 },
              style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }
            }
          ]
        };
      }
    }

    var __defProp$x = Object.defineProperty;
    var __defNormalProp$x = (obj, key, value) => key in obj ? __defProp$x(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$x = (obj, key, value) => {
      __defNormalProp$x(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class InfoLineTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "info-line-tool",
          name: options?.name || "Info Line",
          icon: options?.icon || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="22" x2="22" y2="2"/><rect x="12" y="8" width="8" height="5" rx="1" fill="none" stroke-width="1.5"/></svg>`
        });
        __publicField$x(this, "zr");
        __publicField$x(this, "state", "idle");
        __publicField$x(this, "startPoint", null);
        __publicField$x(this, "endPoint", null);
        __publicField$x(this, "group", null);
        __publicField$x(this, "line", null);
        __publicField$x(this, "startCircle", null);
        __publicField$x(this, "endCircle", null);
        __publicField$x(this, "onClick", (params) => {
          if (this.state === "idle") {
            this.state = "drawing";
            this.startPoint = this.getPoint(params);
            this.endPoint = this.getPoint(params);
            this.initGraphic();
            this.updateGraphic();
          } else if (this.state === "drawing") {
            this.state = "finished";
            this.endPoint = this.getPoint(params);
            this.updateGraphic();
            if (this.startPoint && this.endPoint) {
              const start = this.context.coordinateConversion.pixelToData({
                x: this.startPoint[0],
                y: this.startPoint[1]
              });
              const end = this.context.coordinateConversion.pixelToData({
                x: this.endPoint[0],
                y: this.endPoint[1]
              });
              if (start && end) {
                this.context.addDrawing({
                  id: `info-line-${Date.now()}`,
                  type: "info-line",
                  points: [start, end],
                  paneIndex: start.paneIndex || 0,
                  style: { color: "#d1d4dc", lineWidth: 1 }
                });
              }
            }
            this.removeGraphic();
            this.context.disableTools();
          }
        });
        __publicField$x(this, "onMouseMove", (params) => {
          if (this.state !== "drawing")
            return;
          this.endPoint = this.getPoint(params);
          this.updateGraphic();
        });
      }
      onInit() {
        this.zr = this.chart.getZr();
        this.context.registerDrawingRenderer(new InfoLineDrawingRenderer());
      }
      onActivate() {
        this.state = "idle";
        this.chart.getZr().setCursorStyle("crosshair");
        this.zr.on("click", this.onClick);
        this.zr.on("mousemove", this.onMouseMove);
      }
      onDeactivate() {
        this.state = "idle";
        this.chart.getZr().setCursorStyle("default");
        this.zr.off("click", this.onClick);
        this.zr.off("mousemove", this.onMouseMove);
        this.removeGraphic();
      }
      onDestroy() {
        this.removeGraphic();
      }
      initGraphic() {
        if (this.group)
          return;
        this.group = new echarts__namespace.graphic.Group();
        this.line = new echarts__namespace.graphic.Line({
          shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
          style: { stroke: "#d1d4dc", lineWidth: 1 },
          z: 100
        });
        this.startCircle = new echarts__namespace.graphic.Circle({
          shape: { cx: 0, cy: 0, r: 4 },
          style: { fill: "#fff", stroke: "#d1d4dc", lineWidth: 1 },
          z: 101
        });
        this.endCircle = new echarts__namespace.graphic.Circle({
          shape: { cx: 0, cy: 0, r: 4 },
          style: { fill: "#fff", stroke: "#d1d4dc", lineWidth: 1 },
          z: 101
        });
        this.group.add(this.line);
        this.group.add(this.startCircle);
        this.group.add(this.endCircle);
        this.zr.add(this.group);
      }
      removeGraphic() {
        if (this.group) {
          this.zr.remove(this.group);
          this.group = null;
        }
      }
      updateGraphic() {
        if (!this.startPoint || !this.endPoint || !this.group)
          return;
        const [x1, y1] = this.startPoint;
        const [x2, y2] = this.endPoint;
        this.line.setShape({ x1, y1, x2, y2 });
        this.startCircle.setShape({ cx: x1, cy: y1 });
        this.endCircle.setShape({ cx: x2, cy: y2 });
      }
    }

    var __defProp$w = Object.defineProperty;
    var __defNormalProp$w = (obj, key, value) => key in obj ? __defProp$w(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$w = (obj, key, value) => {
      __defNormalProp$w(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class ExtendedLineDrawingRenderer {
      constructor() {
        __publicField$w(this, "type", "extended-line");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected, coordSys } = ctx;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const color = drawing.style?.color || "#d1d4dc";
        const dx = x2 - x1;
        const dy = y2 - y1;
        let ex1 = x1, ey1 = y1, ex2 = x2, ey2 = y2;
        if (dx !== 0 || dy !== 0) {
          const left = coordSys.x;
          const right = coordSys.x + coordSys.width;
          const top = coordSys.y;
          const bottom = coordSys.y + coordSys.height;
          [ex2, ey2] = this.extendToEdge(x1, y1, dx, dy, left, right, top, bottom);
          [ex1, ey1] = this.extendToEdge(x2, y2, -dx, -dy, left, right, top, bottom);
        }
        return {
          type: "group",
          children: [
            {
              type: "line",
              name: "line",
              shape: { x1: ex1, y1: ey1, x2: ex2, y2: ey2 },
              style: {
                stroke: color,
                lineWidth: drawing.style?.lineWidth || 1
              }
            },
            {
              type: "circle",
              name: "point-0",
              shape: { cx: x1, cy: y1, r: 4 },
              style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }
            },
            {
              type: "circle",
              name: "point-1",
              shape: { cx: x2, cy: y2, r: 4 },
              style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }
            }
          ]
        };
      }
      extendToEdge(ox, oy, dx, dy, left, right, top, bottom) {
        let tMax = Infinity;
        if (dx !== 0) {
          const tx = dx > 0 ? (right - ox) / dx : (left - ox) / dx;
          if (tx > 0)
            tMax = Math.min(tMax, tx);
        }
        if (dy !== 0) {
          const ty = dy > 0 ? (bottom - oy) / dy : (top - oy) / dy;
          if (ty > 0)
            tMax = Math.min(tMax, ty);
        }
        if (!isFinite(tMax))
          tMax = 1;
        return [ox + tMax * dx, oy + tMax * dy];
      }
    }

    var __defProp$v = Object.defineProperty;
    var __defNormalProp$v = (obj, key, value) => key in obj ? __defProp$v(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$v = (obj, key, value) => {
      __defNormalProp$v(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const COLOR$1 = "#d1d4dc";
    class ExtendedLineTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "extended-line-tool",
          name: options?.name || "Extended Line",
          icon: options?.icon || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="23" x2="23" y2="1" stroke-dasharray="2,2" opacity="0.4"/><line x1="6" y1="18" x2="18" y2="6"/></svg>`
        });
        __publicField$v(this, "zr");
        __publicField$v(this, "state", "idle");
        __publicField$v(this, "startPoint", null);
        __publicField$v(this, "endPoint", null);
        __publicField$v(this, "group", null);
        __publicField$v(this, "line", null);
        __publicField$v(this, "dashLineForward", null);
        __publicField$v(this, "dashLineBackward", null);
        __publicField$v(this, "startCircle", null);
        __publicField$v(this, "endCircle", null);
        __publicField$v(this, "onClick", (params) => {
          if (this.state === "idle") {
            this.state = "drawing";
            this.startPoint = this.getPoint(params);
            this.endPoint = this.getPoint(params);
            this.initGraphic();
            this.updateGraphic();
          } else if (this.state === "drawing") {
            this.state = "finished";
            this.endPoint = this.getPoint(params);
            if (this.startPoint && this.endPoint) {
              const start = this.context.coordinateConversion.pixelToData({
                x: this.startPoint[0],
                y: this.startPoint[1]
              });
              const end = this.context.coordinateConversion.pixelToData({
                x: this.endPoint[0],
                y: this.endPoint[1]
              });
              if (start && end) {
                this.context.addDrawing({
                  id: `extended-line-${Date.now()}`,
                  type: "extended-line",
                  points: [start, end],
                  paneIndex: start.paneIndex || 0,
                  style: { color: COLOR$1, lineWidth: 1 }
                });
              }
            }
            this.removeGraphic();
            this.context.disableTools();
          }
        });
        __publicField$v(this, "onMouseMove", (params) => {
          if (this.state !== "drawing")
            return;
          this.endPoint = this.getPoint(params);
          this.updateGraphic();
        });
      }
      onInit() {
        this.zr = this.chart.getZr();
        this.context.registerDrawingRenderer(new ExtendedLineDrawingRenderer());
      }
      onActivate() {
        this.state = "idle";
        this.chart.getZr().setCursorStyle("crosshair");
        this.zr.on("click", this.onClick);
        this.zr.on("mousemove", this.onMouseMove);
      }
      onDeactivate() {
        this.state = "idle";
        this.chart.getZr().setCursorStyle("default");
        this.zr.off("click", this.onClick);
        this.zr.off("mousemove", this.onMouseMove);
        this.removeGraphic();
      }
      onDestroy() {
        this.removeGraphic();
      }
      initGraphic() {
        if (this.group)
          return;
        this.group = new echarts__namespace.graphic.Group();
        this.line = new echarts__namespace.graphic.Line({
          shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
          style: { stroke: COLOR$1, lineWidth: 1 },
          z: 100
        });
        this.dashLineForward = new echarts__namespace.graphic.Line({
          shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
          style: { stroke: COLOR$1, lineWidth: 1, lineDash: [4, 4], opacity: 0.5 },
          z: 99
        });
        this.dashLineBackward = new echarts__namespace.graphic.Line({
          shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
          style: { stroke: COLOR$1, lineWidth: 1, lineDash: [4, 4], opacity: 0.5 },
          z: 99
        });
        this.startCircle = new echarts__namespace.graphic.Circle({
          shape: { cx: 0, cy: 0, r: 4 },
          style: { fill: "#fff", stroke: COLOR$1, lineWidth: 1 },
          z: 101
        });
        this.endCircle = new echarts__namespace.graphic.Circle({
          shape: { cx: 0, cy: 0, r: 4 },
          style: { fill: "#fff", stroke: COLOR$1, lineWidth: 1 },
          z: 101
        });
        this.group.add(this.dashLineBackward);
        this.group.add(this.dashLineForward);
        this.group.add(this.line);
        this.group.add(this.startCircle);
        this.group.add(this.endCircle);
        this.zr.add(this.group);
      }
      removeGraphic() {
        if (this.group) {
          this.zr.remove(this.group);
          this.group = null;
        }
      }
      updateGraphic() {
        if (!this.startPoint || !this.endPoint || !this.group)
          return;
        const [x1, y1] = this.startPoint;
        const [x2, y2] = this.endPoint;
        this.line.setShape({ x1, y1, x2, y2 });
        this.startCircle.setShape({ cx: x1, cy: y1 });
        this.endCircle.setShape({ cx: x2, cy: y2 });
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (dx === 0 && dy === 0)
          return;
        const [fwX, fwY] = this.extendToEdge(x1, y1, dx, dy);
        this.dashLineForward.setShape({ x1: x2, y1: y2, x2: fwX, y2: fwY });
        const [bwX, bwY] = this.extendToEdge(x2, y2, -dx, -dy);
        this.dashLineBackward.setShape({ x1, y1, x2: bwX, y2: bwY });
      }
      extendToEdge(ox, oy, dx, dy) {
        const w = this.chart.getWidth();
        const h = this.chart.getHeight();
        let tMax = Infinity;
        if (dx !== 0) {
          const tx = dx > 0 ? (w - ox) / dx : -ox / dx;
          if (tx > 0)
            tMax = Math.min(tMax, tx);
        }
        if (dy !== 0) {
          const ty = dy > 0 ? (h - oy) / dy : -oy / dy;
          if (ty > 0)
            tMax = Math.min(tMax, ty);
        }
        if (!isFinite(tMax))
          tMax = 1;
        return [ox + tMax * dx, oy + tMax * dy];
      }
    }

    var __defProp$u = Object.defineProperty;
    var __defNormalProp$u = (obj, key, value) => key in obj ? __defProp$u(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$u = (obj, key, value) => {
      __defNormalProp$u(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class TrendAngleDrawingRenderer {
      constructor() {
        __publicField$u(this, "type", "trend-angle");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected } = ctx;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const color = drawing.style?.color || "#d1d4dc";
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angleRad = Math.atan2(-dy, dx);
        const angleDeg = angleRad * (180 / Math.PI);
        const displayAngle = angleDeg.toFixed(1);
        const arcR = Math.min(30, Math.sqrt(dx * dx + dy * dy) * 0.3);
        const hLineEndX = x1 + Math.max(Math.abs(dx), arcR + 20);
        const startAngle = 0;
        const endAngle = -angleRad;
        const children = [
          // Main trend line
          {
            type: "line",
            name: "line",
            shape: { x1, y1, x2, y2 },
            style: { stroke: color, lineWidth: drawing.style?.lineWidth || 1 }
          },
          // Horizontal reference line
          {
            type: "line",
            shape: { x1, y1, x2: hLineEndX, y2: y1 },
            style: { stroke: color, lineWidth: 1, opacity: 0.4, lineDash: [4, 4] }
          },
          // Arc
          {
            type: "arc",
            shape: {
              cx: x1,
              cy: y1,
              r: arcR,
              startAngle: Math.min(startAngle, endAngle),
              endAngle: Math.max(startAngle, endAngle)
            },
            style: { stroke: color, lineWidth: 1.5, fill: "none" }
          },
          // Angle label
          {
            type: "text",
            x: x1 + arcR + 6,
            y: y1 + (dy < 0 ? -14 : 2),
            style: {
              text: `${displayAngle}\xB0`,
              fill: color,
              fontSize: 11,
              fontFamily: "sans-serif"
            },
            z2: 10
          },
          // Control points
          {
            type: "circle",
            name: "point-0",
            shape: { cx: x1, cy: y1, r: 4 },
            style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }
          },
          {
            type: "circle",
            name: "point-1",
            shape: { cx: x2, cy: y2, r: 4 },
            style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }
          }
        ];
        return { type: "group", children };
      }
    }

    var __defProp$t = Object.defineProperty;
    var __defNormalProp$t = (obj, key, value) => key in obj ? __defProp$t(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$t = (obj, key, value) => {
      __defNormalProp$t(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const COLOR = "#d1d4dc";
    class TrendAngleTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "trend-angle-tool",
          name: options?.name || "Trend Angle",
          icon: options?.icon || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="20" x2="21" y2="6"/><line x1="3" y1="20" x2="14" y2="20" opacity="0.4"/><path d="M8 20 A5 5 0 0 1 7 16" stroke-width="1.5"/></svg>`
        });
        __publicField$t(this, "zr");
        __publicField$t(this, "state", "idle");
        __publicField$t(this, "startPoint", null);
        __publicField$t(this, "endPoint", null);
        __publicField$t(this, "group", null);
        __publicField$t(this, "line", null);
        __publicField$t(this, "hRefLine", null);
        __publicField$t(this, "arc", null);
        __publicField$t(this, "angleText", null);
        __publicField$t(this, "startCircle", null);
        __publicField$t(this, "endCircle", null);
        __publicField$t(this, "onClick", (params) => {
          if (this.state === "idle") {
            this.state = "drawing";
            this.startPoint = this.getPoint(params);
            this.endPoint = this.getPoint(params);
            this.initGraphic();
            this.updateGraphic();
          } else if (this.state === "drawing") {
            this.state = "finished";
            this.endPoint = this.getPoint(params);
            if (this.startPoint && this.endPoint) {
              const start = this.context.coordinateConversion.pixelToData({
                x: this.startPoint[0],
                y: this.startPoint[1]
              });
              const end = this.context.coordinateConversion.pixelToData({
                x: this.endPoint[0],
                y: this.endPoint[1]
              });
              if (start && end) {
                this.context.addDrawing({
                  id: `trend-angle-${Date.now()}`,
                  type: "trend-angle",
                  points: [start, end],
                  paneIndex: start.paneIndex || 0,
                  style: { color: COLOR, lineWidth: 1 }
                });
              }
            }
            this.removeGraphic();
            this.context.disableTools();
          }
        });
        __publicField$t(this, "onMouseMove", (params) => {
          if (this.state !== "drawing")
            return;
          this.endPoint = this.getPoint(params);
          this.updateGraphic();
        });
      }
      onInit() {
        this.zr = this.chart.getZr();
        this.context.registerDrawingRenderer(new TrendAngleDrawingRenderer());
      }
      onActivate() {
        this.state = "idle";
        this.chart.getZr().setCursorStyle("crosshair");
        this.zr.on("click", this.onClick);
        this.zr.on("mousemove", this.onMouseMove);
      }
      onDeactivate() {
        this.state = "idle";
        this.chart.getZr().setCursorStyle("default");
        this.zr.off("click", this.onClick);
        this.zr.off("mousemove", this.onMouseMove);
        this.removeGraphic();
      }
      onDestroy() {
        this.removeGraphic();
      }
      initGraphic() {
        if (this.group)
          return;
        this.group = new echarts__namespace.graphic.Group();
        this.line = new echarts__namespace.graphic.Line({
          shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
          style: { stroke: COLOR, lineWidth: 1 },
          z: 100
        });
        this.hRefLine = new echarts__namespace.graphic.Line({
          shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
          style: { stroke: COLOR, lineWidth: 1, lineDash: [4, 4], opacity: 0.4 },
          z: 99
        });
        this.arc = new echarts__namespace.graphic.Arc({
          shape: { cx: 0, cy: 0, r: 25, startAngle: 0, endAngle: 0 },
          style: { stroke: COLOR, lineWidth: 1, fill: "none" },
          z: 99
        });
        this.angleText = new echarts__namespace.graphic.Text({
          style: { text: "", fill: COLOR, fontSize: 11, fontFamily: "sans-serif" },
          z: 101
        });
        this.startCircle = new echarts__namespace.graphic.Circle({
          shape: { cx: 0, cy: 0, r: 4 },
          style: { fill: "#fff", stroke: COLOR, lineWidth: 1 },
          z: 101
        });
        this.endCircle = new echarts__namespace.graphic.Circle({
          shape: { cx: 0, cy: 0, r: 4 },
          style: { fill: "#fff", stroke: COLOR, lineWidth: 1 },
          z: 101
        });
        this.group.add(this.hRefLine);
        this.group.add(this.arc);
        this.group.add(this.line);
        this.group.add(this.angleText);
        this.group.add(this.startCircle);
        this.group.add(this.endCircle);
        this.zr.add(this.group);
      }
      removeGraphic() {
        if (this.group) {
          this.zr.remove(this.group);
          this.group = null;
        }
      }
      updateGraphic() {
        if (!this.startPoint || !this.endPoint || !this.group)
          return;
        const [x1, y1] = this.startPoint;
        const [x2, y2] = this.endPoint;
        this.line.setShape({ x1, y1, x2, y2 });
        this.startCircle.setShape({ cx: x1, cy: y1 });
        this.endCircle.setShape({ cx: x2, cy: y2 });
        const dx = x2 - x1;
        const dy = y2 - y1;
        const hLen = Math.max(Math.abs(dx), 40);
        this.hRefLine.setShape({ x1, y1, x2: x1 + hLen, y2: y1 });
        const angleRad = Math.atan2(-dy, dx);
        const angleDeg = angleRad * (180 / Math.PI);
        const arcR = Math.min(25, Math.sqrt(dx * dx + dy * dy) * 0.3);
        const screenAngle = Math.atan2(dy, dx);
        const arcStart = Math.min(0, screenAngle);
        const arcEnd = Math.max(0, screenAngle);
        this.arc.setShape({ cx: x1, cy: y1, r: arcR, startAngle: arcStart, endAngle: arcEnd });
        this.angleText.setStyle({ text: `${angleDeg.toFixed(1)}\xB0` });
        this.angleText.x = x1 + arcR + 6;
        this.angleText.y = y1 + (dy < 0 ? -14 : 2);
        this.angleText.markRedraw();
      }
    }

    var __defProp$s = Object.defineProperty;
    var __defNormalProp$s = (obj, key, value) => key in obj ? __defProp$s(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$s = (obj, key, value) => {
      __defNormalProp$s(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class HorizontalLineDrawingRenderer {
      constructor() {
        __publicField$s(this, "type", "horizontal-line");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected, coordSys } = ctx;
        const [px, py] = pixelPoints[0];
        const color = drawing.style?.color || "#d1d4dc";
        const left = coordSys.x;
        const right = coordSys.x + coordSys.width;
        return {
          type: "group",
          children: [
            {
              type: "line",
              name: "line",
              shape: { x1: left, y1: py, x2: right, y2: py },
              style: {
                stroke: color,
                lineWidth: drawing.style?.lineWidth || 1
              }
            },
            // Price label on the right
            {
              type: "rect",
              shape: { x: right - 70, y: py - 10, width: 65, height: 18, r: 2 },
              style: { fill: color, opacity: 0.9 },
              z2: 10
            },
            {
              type: "text",
              x: right - 67,
              y: py - 8,
              style: {
                text: drawing.points[0].value.toFixed(2),
                fill: "#fff",
                fontSize: 10,
                fontFamily: "monospace"
              },
              z2: 11
            },
            {
              type: "circle",
              name: "point-0",
              shape: { cx: px, cy: py, r: 4 },
              style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }
            }
          ]
        };
      }
    }

    var __defProp$r = Object.defineProperty;
    var __defNormalProp$r = (obj, key, value) => key in obj ? __defProp$r(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$r = (obj, key, value) => {
      __defNormalProp$r(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class HorizontalLineTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "horizontal-line-tool",
          name: options?.name || "Horizontal Line",
          icon: options?.icon || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>`
        });
        __publicField$r(this, "zr");
        __publicField$r(this, "onClick", (params) => {
          const point = this.getPoint(params);
          if (!point)
            return;
          const data = this.context.coordinateConversion.pixelToData({
            x: point[0],
            y: point[1]
          });
          if (data) {
            this.context.addDrawing({
              id: `hline-${Date.now()}`,
              type: "horizontal-line",
              points: [data],
              paneIndex: data.paneIndex || 0,
              style: { color: "#d1d4dc", lineWidth: 1 }
            });
          }
          this.context.disableTools();
        });
      }
      onInit() {
        this.zr = this.chart.getZr();
        this.context.registerDrawingRenderer(new HorizontalLineDrawingRenderer());
      }
      onActivate() {
        this.chart.getZr().setCursorStyle("crosshair");
        this.zr.on("click", this.onClick);
      }
      onDeactivate() {
        this.chart.getZr().setCursorStyle("default");
        this.zr.off("click", this.onClick);
      }
      onDestroy() {
      }
    }

    var __defProp$q = Object.defineProperty;
    var __defNormalProp$q = (obj, key, value) => key in obj ? __defProp$q(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$q = (obj, key, value) => {
      __defNormalProp$q(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class HorizontalRayDrawingRenderer {
      constructor() {
        __publicField$q(this, "type", "horizontal-ray");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected, coordSys } = ctx;
        const [px, py] = pixelPoints[0];
        const color = drawing.style?.color || "#d1d4dc";
        const right = coordSys.x + coordSys.width;
        return {
          type: "group",
          children: [
            {
              type: "line",
              name: "line",
              shape: { x1: px, y1: py, x2: right, y2: py },
              style: {
                stroke: color,
                lineWidth: drawing.style?.lineWidth || 1
              }
            },
            {
              type: "circle",
              name: "point-0",
              shape: { cx: px, cy: py, r: 4 },
              style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }
            }
          ]
        };
      }
    }

    var __defProp$p = Object.defineProperty;
    var __defNormalProp$p = (obj, key, value) => key in obj ? __defProp$p(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$p = (obj, key, value) => {
      __defNormalProp$p(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class HorizontalRayTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "horizontal-ray-tool",
          name: options?.name || "Horizontal Ray",
          icon: options?.icon || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="12" x2="22" y2="12"/><circle cx="4" cy="12" r="2" fill="currentColor"/></svg>`
        });
        __publicField$p(this, "zr");
        __publicField$p(this, "onClick", (params) => {
          const point = this.getPoint(params);
          if (!point)
            return;
          const data = this.context.coordinateConversion.pixelToData({
            x: point[0],
            y: point[1]
          });
          if (data) {
            this.context.addDrawing({
              id: `hray-${Date.now()}`,
              type: "horizontal-ray",
              points: [data],
              paneIndex: data.paneIndex || 0,
              style: { color: "#d1d4dc", lineWidth: 1 }
            });
          }
          this.context.disableTools();
        });
      }
      onInit() {
        this.zr = this.chart.getZr();
        this.context.registerDrawingRenderer(new HorizontalRayDrawingRenderer());
      }
      onActivate() {
        this.chart.getZr().setCursorStyle("crosshair");
        this.zr.on("click", this.onClick);
      }
      onDeactivate() {
        this.chart.getZr().setCursorStyle("default");
        this.zr.off("click", this.onClick);
      }
      onDestroy() {
      }
    }

    var __defProp$o = Object.defineProperty;
    var __defNormalProp$o = (obj, key, value) => key in obj ? __defProp$o(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$o = (obj, key, value) => {
      __defNormalProp$o(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class VerticalLineDrawingRenderer {
      constructor() {
        __publicField$o(this, "type", "vertical-line");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected, coordSys } = ctx;
        const [px, py] = pixelPoints[0];
        const color = drawing.style?.color || "#d1d4dc";
        const top = coordSys.y;
        const bottom = coordSys.y + coordSys.height;
        return {
          type: "group",
          children: [
            {
              type: "line",
              name: "line",
              shape: { x1: px, y1: top, x2: px, y2: bottom },
              style: {
                stroke: color,
                lineWidth: drawing.style?.lineWidth || 1
              }
            },
            {
              type: "circle",
              name: "point-0",
              shape: { cx: px, cy: py, r: 4 },
              style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }
            }
          ]
        };
      }
    }

    var __defProp$n = Object.defineProperty;
    var __defNormalProp$n = (obj, key, value) => key in obj ? __defProp$n(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$n = (obj, key, value) => {
      __defNormalProp$n(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class VerticalLineTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "vertical-line-tool",
          name: options?.name || "Vertical Line",
          icon: options?.icon || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>`
        });
        __publicField$n(this, "zr");
        __publicField$n(this, "onClick", (params) => {
          const point = this.getPoint(params);
          if (!point)
            return;
          const data = this.context.coordinateConversion.pixelToData({
            x: point[0],
            y: point[1]
          });
          if (data) {
            this.context.addDrawing({
              id: `vline-${Date.now()}`,
              type: "vertical-line",
              points: [data],
              paneIndex: data.paneIndex || 0,
              style: { color: "#d1d4dc", lineWidth: 1 }
            });
          }
          this.context.disableTools();
        });
      }
      onInit() {
        this.zr = this.chart.getZr();
        this.context.registerDrawingRenderer(new VerticalLineDrawingRenderer());
      }
      onActivate() {
        this.chart.getZr().setCursorStyle("crosshair");
        this.zr.on("click", this.onClick);
      }
      onDeactivate() {
        this.chart.getZr().setCursorStyle("default");
        this.zr.off("click", this.onClick);
      }
      onDestroy() {
      }
    }

    var __defProp$m = Object.defineProperty;
    var __defNormalProp$m = (obj, key, value) => key in obj ? __defProp$m(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$m = (obj, key, value) => {
      __defNormalProp$m(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class CrossLineDrawingRenderer {
      constructor() {
        __publicField$m(this, "type", "cross-line");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected, coordSys } = ctx;
        const [px, py] = pixelPoints[0];
        const color = drawing.style?.color || "#d1d4dc";
        const left = coordSys.x;
        const right = coordSys.x + coordSys.width;
        const top = coordSys.y;
        const bottom = coordSys.y + coordSys.height;
        return {
          type: "group",
          children: [
            // Horizontal line
            {
              type: "line",
              name: "line-h",
              shape: { x1: left, y1: py, x2: right, y2: py },
              style: {
                stroke: color,
                lineWidth: drawing.style?.lineWidth || 1
              }
            },
            // Vertical line
            {
              type: "line",
              name: "line-v",
              shape: { x1: px, y1: top, x2: px, y2: bottom },
              style: {
                stroke: color,
                lineWidth: drawing.style?.lineWidth || 1
              }
            },
            // Center point
            {
              type: "circle",
              name: "point-0",
              shape: { cx: px, cy: py, r: 4 },
              style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }
            }
          ]
        };
      }
    }

    var __defProp$l = Object.defineProperty;
    var __defNormalProp$l = (obj, key, value) => key in obj ? __defProp$l(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$l = (obj, key, value) => {
      __defNormalProp$l(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class CrossLineTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "cross-line-tool",
          name: options?.name || "Cross Line",
          icon: options?.icon || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`
        });
        __publicField$l(this, "zr");
        __publicField$l(this, "onClick", (params) => {
          const point = this.getPoint(params);
          if (!point)
            return;
          const data = this.context.coordinateConversion.pixelToData({
            x: point[0],
            y: point[1]
          });
          if (data) {
            this.context.addDrawing({
              id: `crossline-${Date.now()}`,
              type: "cross-line",
              points: [data],
              paneIndex: data.paneIndex || 0,
              style: { color: "#d1d4dc", lineWidth: 1 }
            });
          }
          this.context.disableTools();
        });
      }
      onInit() {
        this.zr = this.chart.getZr();
        this.context.registerDrawingRenderer(new CrossLineDrawingRenderer());
      }
      onActivate() {
        this.chart.getZr().setCursorStyle("crosshair");
        this.zr.on("click", this.onClick);
      }
      onDeactivate() {
        this.chart.getZr().setCursorStyle("default");
        this.zr.off("click", this.onClick);
      }
      onDestroy() {
      }
    }

    var __defProp$k = Object.defineProperty;
    var __defNormalProp$k = (obj, key, value) => key in obj ? __defProp$k(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$k = (obj, key, value) => {
      __defNormalProp$k(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LEVELS$5 = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const COLORS$5 = ["#787b86", "#f44336", "#ff9800", "#4caf50", "#2196f3", "#00bcd4", "#787b86"];
    class FibonacciDrawingRenderer {
      constructor() {
        __publicField$k(this, "type", "fibonacci");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected } = ctx;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const color = drawing.style?.color || "#3b82f6";
        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2);
        const width = endX - startX;
        const diffY = y2 - y1;
        const startVal = drawing.points[0].value;
        const endVal = drawing.points[1].value;
        const valDiff = endVal - startVal;
        const backgrounds = [];
        const linesAndText = [];
        LEVELS$5.forEach((level, index) => {
          const levelY = y2 - diffY * level;
          const levelColor = COLORS$5[index % COLORS$5.length];
          linesAndText.push({
            type: "line",
            shape: { x1: startX, y1: levelY, x2: endX, y2: levelY },
            style: { stroke: levelColor, lineWidth: 1 },
            silent: true
          });
          const price = endVal - valDiff * level;
          linesAndText.push({
            type: "text",
            style: {
              text: `${level} (${price.toFixed(2)})`,
              x: startX + 5,
              y: levelY - 10,
              fill: levelColor,
              fontSize: 10
            },
            silent: true
          });
          if (index < LEVELS$5.length - 1) {
            const nextLevel = LEVELS$5[index + 1];
            const nextY = y2 - diffY * nextLevel;
            const rectH = Math.abs(nextY - levelY);
            const rectY = Math.min(levelY, nextY);
            backgrounds.push({
              type: "rect",
              name: "line",
              // Enable dragging by clicking background
              shape: { x: startX, y: rectY, width, height: rectH },
              style: {
                fill: COLORS$5[(index + 1) % COLORS$5.length],
                opacity: 0.1
              }
            });
          }
        });
        return {
          type: "group",
          children: [
            ...backgrounds,
            ...linesAndText,
            {
              type: "line",
              name: "line",
              shape: { x1, y1, x2, y2 },
              style: { stroke: "#999", lineWidth: 1, lineDash: [4, 4] }
            },
            {
              type: "circle",
              name: "point-0",
              shape: { cx: x1, cy: y1, r: 4 },
              style: {
                fill: "#fff",
                stroke: color,
                lineWidth: 1,
                opacity: isSelected ? 1 : 0
              },
              z: 100
            },
            {
              type: "circle",
              name: "point-1",
              shape: { cx: x2, cy: y2, r: 4 },
              style: {
                fill: "#fff",
                stroke: color,
                lineWidth: 1,
                opacity: isSelected ? 1 : 0
              },
              z: 100
            }
          ]
        };
      }
    }

    var __defProp$j = Object.defineProperty;
    var __defNormalProp$j = (obj, key, value) => key in obj ? __defProp$j(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$j = (obj, key, value) => {
      __defNormalProp$j(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class FibonacciTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "fibonacci-tool",
          name: options.name || "Fibonacci Retracement",
          icon: options.icon || `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M120-80v-80h720v80H120Zm0-240v-80h720v80H120Zm0-240v-80h720v80H120Zm0-240v-80h720v80H120Z"/></svg>`
        });
        __publicField$j(this, "startPoint", null);
        __publicField$j(this, "endPoint", null);
        __publicField$j(this, "state", "idle");
        // Temporary ZRender elements
        __publicField$j(this, "graphicGroup", null);
        // Fib levels config
        __publicField$j(this, "levels", [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]);
        __publicField$j(this, "colors", [
          "#787b86",
          // 0
          "#f44336",
          // 0.236
          "#ff9800",
          // 0.382
          "#4caf50",
          // 0.5
          "#2196f3",
          // 0.618
          "#00bcd4",
          // 0.786
          "#787b86"
          // 1
        ]);
        __publicField$j(this, "onClick", (params) => {
          if (this.state === "idle") {
            this.state = "drawing";
            this.startPoint = this.getPoint(params);
            this.endPoint = this.getPoint(params);
            this.initGraphic();
            this.updateGraphic();
          } else if (this.state === "drawing") {
            this.state = "finished";
            this.endPoint = this.getPoint(params);
            this.updateGraphic();
            this.saveDrawing();
            this.removeGraphic();
            this.context.disableTools();
          }
        });
        __publicField$j(this, "onMouseMove", (params) => {
          if (this.state === "drawing") {
            this.endPoint = this.getPoint(params);
            this.updateGraphic();
          }
        });
      }
      onInit() {
        this.context.registerDrawingRenderer(new FibonacciDrawingRenderer());
      }
      onActivate() {
        this.state = "idle";
        this.startPoint = null;
        this.endPoint = null;
        this.context.getChart().getZr().setCursorStyle("crosshair");
        this.bindEvents();
      }
      onDeactivate() {
        this.state = "idle";
        this.startPoint = null;
        this.endPoint = null;
        this.removeGraphic();
        this.unbindEvents();
        this.context.getChart().getZr().setCursorStyle("default");
      }
      bindEvents() {
        const zr = this.context.getChart().getZr();
        zr.on("click", this.onClick);
        zr.on("mousemove", this.onMouseMove);
      }
      unbindEvents() {
        const zr = this.context.getChart().getZr();
        zr.off("click", this.onClick);
        zr.off("mousemove", this.onMouseMove);
      }
      initGraphic() {
        this.graphicGroup = new echarts__namespace.graphic.Group();
        this.context.getChart().getZr().add(this.graphicGroup);
      }
      removeGraphic() {
        if (this.graphicGroup) {
          this.context.getChart().getZr().remove(this.graphicGroup);
          this.graphicGroup = null;
        }
      }
      updateGraphic() {
        if (!this.graphicGroup || !this.startPoint || !this.endPoint)
          return;
        this.graphicGroup.removeAll();
        const x1 = this.startPoint[0];
        const y1 = this.startPoint[1];
        const x2 = this.endPoint[0];
        const y2 = this.endPoint[1];
        const trendLine = new echarts__namespace.graphic.Line({
          shape: { x1, y1, x2, y2 },
          style: {
            stroke: "#999",
            lineWidth: 1,
            lineDash: [4, 4]
          },
          silent: true
        });
        this.graphicGroup.add(trendLine);
        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2);
        const width = endX - startX;
        const diffY = y2 - y1;
        this.levels.forEach((level, index) => {
          const levelY = y2 - diffY * level;
          const color = this.colors[index % this.colors.length];
          const line = new echarts__namespace.graphic.Line({
            shape: { x1: startX, y1: levelY, x2: endX, y2: levelY },
            style: {
              stroke: color,
              lineWidth: 1
            },
            silent: true
          });
          this.graphicGroup.add(line);
          if (index < this.levels.length - 1) {
            const nextLevel = this.levels[index + 1];
            const nextY = y2 - diffY * nextLevel;
            const rectH = Math.abs(nextY - levelY);
            const rectY = Math.min(levelY, nextY);
            const rect = new echarts__namespace.graphic.Rect({
              shape: { x: startX, y: rectY, width, height: rectH },
              style: {
                fill: this.colors[(index + 1) % this.colors.length],
                opacity: 0.1
              },
              silent: true
            });
            this.graphicGroup.add(rect);
          }
        });
      }
      saveDrawing() {
        if (!this.startPoint || !this.endPoint)
          return;
        const start = this.context.coordinateConversion.pixelToData({
          x: this.startPoint[0],
          y: this.startPoint[1]
        });
        const end = this.context.coordinateConversion.pixelToData({
          x: this.endPoint[0],
          y: this.endPoint[1]
        });
        if (start && end) {
          const paneIndex = start.paneIndex || 0;
          this.context.addDrawing({
            id: `fib-${Date.now()}`,
            type: "fibonacci",
            points: [start, end],
            paneIndex,
            style: {
              color: "#3b82f6",
              lineWidth: 1
            }
          });
        }
      }
    }

    var __defProp$i = Object.defineProperty;
    var __defNormalProp$i = (obj, key, value) => key in obj ? __defProp$i(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$i = (obj, key, value) => {
      __defNormalProp$i(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LEVELS$4 = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const COLORS$4 = ["#787b86", "#f44336", "#ff9800", "#4caf50", "#2196f3", "#00bcd4", "#787b86"];
    class FibonacciChannelDrawingRenderer {
      constructor() {
        __publicField$i(this, "type", "fibonacci_channel");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected } = ctx;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const [wx, wy] = pixelPoints[2];
        const color = drawing.style?.color || "#3b82f6";
        const bdx = x2 - x1;
        const bdy = y2 - y1;
        const blen = Math.sqrt(bdx * bdx + bdy * bdy);
        if (blen === 0)
          return;
        const nx = -bdy / blen;
        const ny = bdx / blen;
        const dist = (wx - x1) * nx + (wy - y1) * ny;
        const children = [];
        const levelCoords = [];
        LEVELS$4.forEach((level, index) => {
          const ox = nx * dist * level;
          const oy = ny * dist * level;
          const lx1 = x1 + ox;
          const ly1 = y1 + oy;
          const lx2 = x2 + ox;
          const ly2 = y2 + oy;
          levelCoords.push({ lx1, ly1, lx2, ly2 });
          if (index < LEVELS$4.length - 1) {
            const nextLevel = LEVELS$4[index + 1];
            const nox = nx * dist * nextLevel;
            const noy = ny * dist * nextLevel;
            children.push({
              type: "polygon",
              name: "line",
              // Enable dragging by clicking background
              shape: {
                points: [
                  [lx1, ly1],
                  [lx2, ly2],
                  [x2 + nox, y2 + noy],
                  [x1 + nox, y1 + noy]
                ]
              },
              style: {
                fill: COLORS$4[(index + 1) % COLORS$4.length],
                opacity: 0.1
              }
            });
          }
        });
        levelCoords.forEach((coords, index) => {
          const levelColor = COLORS$4[index % COLORS$4.length];
          children.push({
            type: "line",
            shape: { x1: coords.lx1, y1: coords.ly1, x2: coords.lx2, y2: coords.ly2 },
            style: { stroke: levelColor, lineWidth: 1 },
            silent: true
          });
          children.push({
            type: "text",
            style: {
              text: `${LEVELS$4[index]}`,
              x: coords.lx2 + 5,
              y: coords.ly2 - 5,
              fill: levelColor,
              fontSize: 10
            },
            silent: true
          });
        });
        children.push({
          type: "line",
          name: "line",
          shape: { x1, y1, x2, y2 },
          style: { stroke: "#999", lineWidth: 1, lineDash: [4, 4] }
        });
        children.push({
          type: "circle",
          name: "point-0",
          shape: { cx: x1, cy: y1, r: 4 },
          style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
          z: 100
        });
        children.push({
          type: "circle",
          name: "point-1",
          shape: { cx: x2, cy: y2, r: 4 },
          style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
          z: 100
        });
        children.push({
          type: "circle",
          name: "point-2",
          shape: { cx: wx, cy: wy, r: 4 },
          style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
          z: 100
        });
        return {
          type: "group",
          children
        };
      }
    }

    var __defProp$h = Object.defineProperty;
    var __defNormalProp$h = (obj, key, value) => key in obj ? __defProp$h(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$h = (obj, key, value) => {
      __defNormalProp$h(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class FibonacciChannelTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "fibonacci-channel-tool",
          name: options.name || "Fibonacci Channel",
          icon: options.icon || `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M120-200v-80l80-80H120v-80h160l120-120H120v-80h360l120-120H120v-80h720v80H520l-120 120h440v80H320L200-440h640v80H280l-80 80h640v80H120Z"/></svg>`
        });
        __publicField$h(this, "startPoint", null);
        __publicField$h(this, "endPoint", null);
        __publicField$h(this, "widthPoint", null);
        __publicField$h(this, "state", "idle");
        // Temporary ZRender elements
        __publicField$h(this, "graphicGroup", null);
        // Fib levels config
        __publicField$h(this, "levels", [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]);
        __publicField$h(this, "colors", [
          "#787b86",
          // 0
          "#f44336",
          // 0.236
          "#ff9800",
          // 0.382
          "#4caf50",
          // 0.5
          "#2196f3",
          // 0.618
          "#00bcd4",
          // 0.786
          "#787b86"
          // 1
        ]);
        __publicField$h(this, "onClick", (params) => {
          if (this.state === "idle") {
            this.state = "drawing-baseline";
            this.startPoint = this.getPoint(params);
            this.endPoint = this.getPoint(params);
            this.initGraphic();
            this.updateGraphic();
          } else if (this.state === "drawing-baseline") {
            this.state = "drawing-width";
            this.endPoint = this.getPoint(params);
            this.widthPoint = this.getPoint(params);
            this.updateGraphic();
          } else if (this.state === "drawing-width") {
            this.state = "finished";
            this.widthPoint = this.getPoint(params);
            this.updateGraphic();
            this.saveDrawing();
            this.removeGraphic();
            this.context.disableTools();
          }
        });
        __publicField$h(this, "onMouseMove", (params) => {
          if (this.state === "drawing-baseline") {
            this.endPoint = this.getPoint(params);
            this.updateGraphic();
          } else if (this.state === "drawing-width") {
            this.widthPoint = this.getPoint(params);
            this.updateGraphic();
          }
        });
      }
      onInit() {
        this.context.registerDrawingRenderer(new FibonacciChannelDrawingRenderer());
      }
      onActivate() {
        this.state = "idle";
        this.startPoint = null;
        this.endPoint = null;
        this.widthPoint = null;
        this.context.getChart().getZr().setCursorStyle("crosshair");
        this.bindEvents();
      }
      onDeactivate() {
        this.state = "idle";
        this.startPoint = null;
        this.endPoint = null;
        this.widthPoint = null;
        this.removeGraphic();
        this.unbindEvents();
        this.context.getChart().getZr().setCursorStyle("default");
      }
      bindEvents() {
        const zr = this.context.getChart().getZr();
        zr.on("click", this.onClick);
        zr.on("mousemove", this.onMouseMove);
      }
      unbindEvents() {
        const zr = this.context.getChart().getZr();
        zr.off("click", this.onClick);
        zr.off("mousemove", this.onMouseMove);
      }
      initGraphic() {
        this.graphicGroup = new echarts__namespace.graphic.Group();
        this.context.getChart().getZr().add(this.graphicGroup);
      }
      removeGraphic() {
        if (this.graphicGroup) {
          this.context.getChart().getZr().remove(this.graphicGroup);
          this.graphicGroup = null;
        }
      }
      updateGraphic() {
        if (!this.graphicGroup || !this.startPoint || !this.endPoint)
          return;
        this.graphicGroup.removeAll();
        const x1 = this.startPoint[0];
        const y1 = this.startPoint[1];
        const x2 = this.endPoint[0];
        const y2 = this.endPoint[1];
        this.graphicGroup.add(
          new echarts__namespace.graphic.Line({
            shape: { x1, y1, x2, y2 },
            style: { stroke: "#787b86", lineWidth: 2 },
            silent: true
          })
        );
        if (this.widthPoint && this.state !== "drawing-baseline") {
          const wp = this.widthPoint;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len === 0)
            return;
          const nx = -dy / len;
          const ny = dx / len;
          const dist = (wp[0] - x1) * nx + (wp[1] - y1) * ny;
          this.levels.forEach((level, index) => {
            const offsetX = nx * dist * level;
            const offsetY = ny * dist * level;
            const lx1 = x1 + offsetX;
            const ly1 = y1 + offsetY;
            const lx2 = x2 + offsetX;
            const ly2 = y2 + offsetY;
            const color = this.colors[index % this.colors.length];
            this.graphicGroup.add(
              new echarts__namespace.graphic.Line({
                shape: { x1: lx1, y1: ly1, x2: lx2, y2: ly2 },
                style: { stroke: color, lineWidth: 1 },
                silent: true
              })
            );
            if (index < this.levels.length - 1) {
              const nextLevel = this.levels[index + 1];
              const nOffsetX = nx * dist * nextLevel;
              const nOffsetY = ny * dist * nextLevel;
              const nx1 = x1 + nOffsetX;
              const ny1 = y1 + nOffsetY;
              const nx2 = x2 + nOffsetX;
              const ny2 = y2 + nOffsetY;
              this.graphicGroup.add(
                new echarts__namespace.graphic.Polygon({
                  shape: {
                    points: [
                      [lx1, ly1],
                      [lx2, ly2],
                      [nx2, ny2],
                      [nx1, ny1]
                    ]
                  },
                  style: {
                    fill: this.colors[(index + 1) % this.colors.length],
                    opacity: 0.1
                  },
                  silent: true
                })
              );
            }
          });
        }
      }
      saveDrawing() {
        if (!this.startPoint || !this.endPoint || !this.widthPoint)
          return;
        const start = this.context.coordinateConversion.pixelToData({
          x: this.startPoint[0],
          y: this.startPoint[1]
        });
        const end = this.context.coordinateConversion.pixelToData({
          x: this.endPoint[0],
          y: this.endPoint[1]
        });
        const width = this.context.coordinateConversion.pixelToData({
          x: this.widthPoint[0],
          y: this.widthPoint[1]
        });
        if (start && end && width) {
          const paneIndex = start.paneIndex || 0;
          this.context.addDrawing({
            id: `fib-channel-${Date.now()}`,
            type: "fibonacci_channel",
            points: [start, end, width],
            paneIndex,
            style: {
              color: "#3b82f6",
              lineWidth: 1
            }
          });
        }
      }
    }

    var __defProp$g = Object.defineProperty;
    var __defNormalProp$g = (obj, key, value) => key in obj ? __defProp$g(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$g = (obj, key, value) => {
      __defNormalProp$g(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LEVELS$3 = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const COLORS$3 = ["#787b86", "#f44336", "#ff9800", "#4caf50", "#2196f3", "#00bcd4", "#787b86"];
    class FibSpeedResistanceFanDrawingRenderer {
      constructor() {
        __publicField$g(this, "type", "fib_speed_resistance_fan");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected } = ctx;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const color = drawing.style?.color || "#3b82f6";
        const dx = x2 - x1;
        const dy = y2 - y1;
        const children = [];
        const priceRays = [];
        const timeRays = [];
        for (const level of LEVELS$3) {
          priceRays.push([x1 + dx, y1 + dy * level]);
          timeRays.push([x1 + dx * level, y1 + dy]);
        }
        for (let i = 0; i < priceRays.length - 1; i++) {
          children.push({
            type: "polygon",
            name: "line",
            shape: {
              points: [
                [x1, y1],
                priceRays[i],
                priceRays[i + 1]
              ]
            },
            style: {
              fill: COLORS$3[(i + 1) % COLORS$3.length],
              opacity: 0.06
            }
          });
        }
        for (let i = 0; i < timeRays.length - 1; i++) {
          children.push({
            type: "polygon",
            name: "line",
            shape: {
              points: [
                [x1, y1],
                timeRays[i],
                timeRays[i + 1]
              ]
            },
            style: {
              fill: COLORS$3[(i + 1) % COLORS$3.length],
              opacity: 0.06
            }
          });
        }
        LEVELS$3.forEach((level, index) => {
          const [ex, ey] = priceRays[index];
          const levelColor = COLORS$3[index % COLORS$3.length];
          children.push({
            type: "line",
            shape: { x1, y1, x2: ex, y2: ey },
            style: { stroke: levelColor, lineWidth: 1 },
            silent: true
          });
          children.push({
            type: "text",
            style: {
              text: `${level}`,
              x: ex + 3,
              y: ey - 2,
              fill: levelColor,
              fontSize: 9
            },
            silent: true
          });
        });
        LEVELS$3.forEach((level, index) => {
          const [ex, ey] = timeRays[index];
          const levelColor = COLORS$3[index % COLORS$3.length];
          children.push({
            type: "line",
            shape: { x1, y1, x2: ex, y2: ey },
            style: { stroke: levelColor, lineWidth: 1 },
            silent: true
          });
          children.push({
            type: "text",
            style: {
              text: `${level}`,
              x: ex - 2,
              y: ey + 8,
              fill: levelColor,
              fontSize: 9
            },
            silent: true
          });
        });
        children.push({
          type: "line",
          name: "line",
          shape: { x1: x2, y1, x2, y2 },
          style: { stroke: "#555", lineWidth: 1, lineDash: [3, 3] }
        });
        children.push({
          type: "line",
          name: "line",
          shape: { x1, y1: y2, x2, y2 },
          style: { stroke: "#555", lineWidth: 1, lineDash: [3, 3] }
        });
        children.push({
          type: "line",
          name: "line",
          shape: { x1, y1, x2, y2 },
          style: { stroke: "#999", lineWidth: 1, lineDash: [4, 4] }
        });
        children.push({
          type: "circle",
          name: "point-0",
          shape: { cx: x1, cy: y1, r: 4 },
          style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
          z: 100
        });
        children.push({
          type: "circle",
          name: "point-1",
          shape: { cx: x2, cy: y2, r: 4 },
          style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
          z: 100
        });
        return {
          type: "group",
          children
        };
      }
    }

    var __defProp$f = Object.defineProperty;
    var __defNormalProp$f = (obj, key, value) => key in obj ? __defProp$f(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$f = (obj, key, value) => {
      __defNormalProp$f(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LEVELS$2 = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const COLORS$2 = ["#787b86", "#f44336", "#ff9800", "#4caf50", "#2196f3", "#00bcd4", "#787b86"];
    class FibSpeedResistanceFanTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "fib-speed-resistance-fan-tool",
          name: options.name || "Fib Speed Resistance Fan",
          icon: options.icon || `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#e3e3e3"><path d="M2 21L22 3M2 21l20-6M2 21l20-9M2 21l20-12M2 21l20-15M2 21l6-18M2 21l9-18M2 21l12-18M2 21l15-18" stroke="#e3e3e3" stroke-width="1" fill="none"/></svg>`
        });
        __publicField$f(this, "startPoint", null);
        __publicField$f(this, "endPoint", null);
        __publicField$f(this, "state", "idle");
        // Temporary ZRender elements
        __publicField$f(this, "graphicGroup", null);
        __publicField$f(this, "onClick", (params) => {
          if (this.state === "idle") {
            this.state = "drawing";
            this.startPoint = this.getPoint(params);
            this.endPoint = this.getPoint(params);
            this.initGraphic();
            this.updateGraphic();
          } else if (this.state === "drawing") {
            this.state = "finished";
            this.endPoint = this.getPoint(params);
            this.updateGraphic();
            this.saveDrawing();
            this.removeGraphic();
            this.context.disableTools();
          }
        });
        __publicField$f(this, "onMouseMove", (params) => {
          if (this.state === "drawing") {
            this.endPoint = this.getPoint(params);
            this.updateGraphic();
          }
        });
      }
      onInit() {
        this.context.registerDrawingRenderer(new FibSpeedResistanceFanDrawingRenderer());
      }
      onActivate() {
        this.state = "idle";
        this.startPoint = null;
        this.endPoint = null;
        this.context.getChart().getZr().setCursorStyle("crosshair");
        this.bindEvents();
      }
      onDeactivate() {
        this.state = "idle";
        this.startPoint = null;
        this.endPoint = null;
        this.removeGraphic();
        this.unbindEvents();
        this.context.getChart().getZr().setCursorStyle("default");
      }
      bindEvents() {
        const zr = this.context.getChart().getZr();
        zr.on("click", this.onClick);
        zr.on("mousemove", this.onMouseMove);
      }
      unbindEvents() {
        const zr = this.context.getChart().getZr();
        zr.off("click", this.onClick);
        zr.off("mousemove", this.onMouseMove);
      }
      initGraphic() {
        this.graphicGroup = new echarts__namespace.graphic.Group();
        this.context.getChart().getZr().add(this.graphicGroup);
      }
      removeGraphic() {
        if (this.graphicGroup) {
          this.context.getChart().getZr().remove(this.graphicGroup);
          this.graphicGroup = null;
        }
      }
      updateGraphic() {
        if (!this.graphicGroup || !this.startPoint || !this.endPoint)
          return;
        this.graphicGroup.removeAll();
        const x1 = this.startPoint[0];
        const y1 = this.startPoint[1];
        const x2 = this.endPoint[0];
        const y2 = this.endPoint[1];
        const dx = x2 - x1;
        const dy = y2 - y1;
        LEVELS$2.forEach((level, index) => {
          const color = COLORS$2[index % COLORS$2.length];
          this.graphicGroup.add(
            new echarts__namespace.graphic.Line({
              shape: { x1, y1, x2: x1 + dx, y2: y1 + dy * level },
              style: { stroke: color, lineWidth: 1 },
              silent: true
            })
          );
          this.graphicGroup.add(
            new echarts__namespace.graphic.Line({
              shape: { x1, y1, x2: x1 + dx * level, y2: y1 + dy },
              style: { stroke: color, lineWidth: 1 },
              silent: true
            })
          );
        });
        for (let i = 0; i < LEVELS$2.length - 1; i++) {
          const pr1 = [x1 + dx, y1 + dy * LEVELS$2[i]];
          const pr2 = [x1 + dx, y1 + dy * LEVELS$2[i + 1]];
          this.graphicGroup.add(
            new echarts__namespace.graphic.Polygon({
              shape: { points: [[x1, y1], pr1, pr2] },
              style: { fill: COLORS$2[(i + 1) % COLORS$2.length], opacity: 0.06 },
              silent: true
            })
          );
        }
        for (let i = 0; i < LEVELS$2.length - 1; i++) {
          const tr1 = [x1 + dx * LEVELS$2[i], y1 + dy];
          const tr2 = [x1 + dx * LEVELS$2[i + 1], y1 + dy];
          this.graphicGroup.add(
            new echarts__namespace.graphic.Polygon({
              shape: { points: [[x1, y1], tr1, tr2] },
              style: { fill: COLORS$2[(i + 1) % COLORS$2.length], opacity: 0.06 },
              silent: true
            })
          );
        }
        this.graphicGroup.add(
          new echarts__namespace.graphic.Line({
            shape: { x1: x2, y1, x2, y2 },
            style: { stroke: "#555", lineWidth: 1, lineDash: [3, 3] },
            silent: true
          })
        );
        this.graphicGroup.add(
          new echarts__namespace.graphic.Line({
            shape: { x1, y1: y2, x2, y2 },
            style: { stroke: "#555", lineWidth: 1, lineDash: [3, 3] },
            silent: true
          })
        );
        this.graphicGroup.add(
          new echarts__namespace.graphic.Line({
            shape: { x1, y1, x2, y2 },
            style: { stroke: "#999", lineWidth: 1, lineDash: [4, 4] },
            silent: true
          })
        );
      }
      saveDrawing() {
        if (!this.startPoint || !this.endPoint)
          return;
        const start = this.context.coordinateConversion.pixelToData({
          x: this.startPoint[0],
          y: this.startPoint[1]
        });
        const end = this.context.coordinateConversion.pixelToData({
          x: this.endPoint[0],
          y: this.endPoint[1]
        });
        if (start && end) {
          this.context.addDrawing({
            id: `fib-fan-${Date.now()}`,
            type: "fib_speed_resistance_fan",
            points: [start, end],
            paneIndex: start.paneIndex || 0,
            style: {
              color: "#3b82f6",
              lineWidth: 1
            }
          });
        }
      }
    }

    var __defProp$e = Object.defineProperty;
    var __defNormalProp$e = (obj, key, value) => key in obj ? __defProp$e(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$e = (obj, key, value) => {
      __defNormalProp$e(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LEVELS$1 = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618, 2, 2.618];
    const COLORS$1 = [
      "#787b86",
      "#f44336",
      "#ff9800",
      "#4caf50",
      "#2196f3",
      "#00bcd4",
      "#787b86",
      "#e91e63",
      "#9c27b0",
      "#673ab7",
      "#3f51b5"
    ];
    class FibTrendExtensionDrawingRenderer {
      constructor() {
        __publicField$e(this, "type", "fib_trend_extension");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected, api } = ctx;
        const color = drawing.style?.color || "#3b82f6";
        if (pixelPoints.length < 3)
          return;
        const [x1, y1] = pixelPoints[0];
        const [x2, y2] = pixelPoints[1];
        const [x3, y3] = pixelPoints[2];
        const pts = drawing.points;
        const trendMove = pts[1].value - pts[0].value;
        const minX = Math.min(x1, x2, x3);
        const maxX = Math.max(x1, x2, x3);
        const extraWidth = (maxX - minX) * 0.5;
        const lineLeft = minX;
        const lineRight = maxX + extraWidth;
        const children = [];
        const levelData = [];
        for (let i = 0; i < LEVELS$1.length; i++) {
          const level = LEVELS$1[i];
          const price = pts[2].value + trendMove * level;
          api.coord([
            pts[2].timeIndex + ctx.drawing.points[2].timeIndex - pts[2].timeIndex,
            price
          ]);
          const py = y3 + (y2 - y1) * level;
          levelData.push({ level, y: py, price, color: COLORS$1[i % COLORS$1.length] });
        }
        for (let i = 0; i < levelData.length - 1; i++) {
          const curr = levelData[i];
          const next = levelData[i + 1];
          const rectY = Math.min(curr.y, next.y);
          const rectH = Math.abs(next.y - curr.y);
          children.push({
            type: "rect",
            name: "line",
            shape: { x: lineLeft, y: rectY, width: lineRight - lineLeft, height: rectH },
            style: { fill: next.color, opacity: 0.06 }
          });
        }
        for (const ld of levelData) {
          children.push({
            type: "line",
            shape: { x1: lineLeft, y1: ld.y, x2: lineRight, y2: ld.y },
            style: { stroke: ld.color, lineWidth: 1 },
            silent: true
          });
          children.push({
            type: "text",
            style: {
              text: `${ld.level} (${ld.price.toFixed(2)})`,
              x: lineRight + 4,
              y: ld.y - 6,
              fill: ld.color,
              fontSize: 9
            },
            silent: true
          });
        }
        children.push({
          type: "line",
          name: "line",
          shape: { x1, y1, x2, y2 },
          style: { stroke: "#2196f3", lineWidth: 1.5, lineDash: [5, 4] }
        });
        children.push({
          type: "line",
          name: "line",
          shape: { x1: x2, y1: y2, x2: x3, y2: y3 },
          style: { stroke: "#ff9800", lineWidth: 1.5, lineDash: [5, 4] }
        });
        children.push({
          type: "circle",
          name: "point-0",
          shape: { cx: x1, cy: y1, r: 4 },
          style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
          z: 100
        });
        children.push({
          type: "circle",
          name: "point-1",
          shape: { cx: x2, cy: y2, r: 4 },
          style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
          z: 100
        });
        children.push({
          type: "circle",
          name: "point-2",
          shape: { cx: x3, cy: y3, r: 4 },
          style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
          z: 100
        });
        const labels = ["1", "2", "3"];
        const points = [pixelPoints[0], pixelPoints[1], pixelPoints[2]];
        for (let i = 0; i < 3; i++) {
          const [px, py] = points[i];
          const isHigh = (i === 0 || py <= points[i - 1][1]) && (i === 2 || py <= points[i + 1]?.[1]);
          children.push({
            type: "text",
            style: { text: labels[i], x: px, y: isHigh ? py - 14 : py + 16, fill: "#e2e8f0", fontSize: 12, fontWeight: "bold", align: "center", verticalAlign: "middle" },
            silent: true
          });
        }
        return { type: "group", children };
      }
    }

    var __defProp$d = Object.defineProperty;
    var __defNormalProp$d = (obj, key, value) => key in obj ? __defProp$d(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$d = (obj, key, value) => {
      __defNormalProp$d(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618, 2, 2.618];
    const COLORS = [
      "#787b86",
      "#f44336",
      "#ff9800",
      "#4caf50",
      "#2196f3",
      "#00bcd4",
      "#787b86",
      "#e91e63",
      "#9c27b0",
      "#673ab7",
      "#3f51b5"
    ];
    class FibTrendExtensionTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "fib-trend-extension-tool",
          name: options.name || "Fib Trend Extension",
          icon: options.icon || `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M120-80v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Z"/></svg>`
        });
        __publicField$d(this, "points", []);
        __publicField$d(this, "state", "idle");
        __publicField$d(this, "graphicGroup", null);
        __publicField$d(this, "onClick", (params) => {
          const pt = this.getPoint(params);
          if (this.state === "idle") {
            this.state = "drawing-trend";
            this.points = [pt, [...pt]];
            this.initGraphic();
            this.updateGraphic();
          } else if (this.state === "drawing-trend") {
            this.state = "drawing-retracement";
            this.points[1] = pt;
            this.points.push([...pt]);
            this.updateGraphic();
          } else if (this.state === "drawing-retracement") {
            this.state = "finished";
            this.points[2] = pt;
            this.updateGraphic();
            this.saveDrawing();
            this.removeGraphic();
            this.context.disableTools();
          }
        });
        __publicField$d(this, "onMouseMove", (params) => {
          if (this.state === "drawing-trend") {
            this.points[1] = this.getPoint(params);
            this.updateGraphic();
          } else if (this.state === "drawing-retracement") {
            this.points[2] = this.getPoint(params);
            this.updateGraphic();
          }
        });
      }
      onInit() {
        this.context.registerDrawingRenderer(new FibTrendExtensionDrawingRenderer());
      }
      onActivate() {
        this.state = "idle";
        this.points = [];
        this.context.getChart().getZr().setCursorStyle("crosshair");
        this.bindEvents();
      }
      onDeactivate() {
        this.state = "idle";
        this.points = [];
        this.removeGraphic();
        this.unbindEvents();
        this.context.getChart().getZr().setCursorStyle("default");
      }
      bindEvents() {
        const zr = this.context.getChart().getZr();
        zr.on("click", this.onClick);
        zr.on("mousemove", this.onMouseMove);
      }
      unbindEvents() {
        const zr = this.context.getChart().getZr();
        zr.off("click", this.onClick);
        zr.off("mousemove", this.onMouseMove);
      }
      initGraphic() {
        this.graphicGroup = new echarts__namespace.graphic.Group();
        this.context.getChart().getZr().add(this.graphicGroup);
      }
      removeGraphic() {
        if (this.graphicGroup) {
          this.context.getChart().getZr().remove(this.graphicGroup);
          this.graphicGroup = null;
        }
      }
      updateGraphic() {
        if (!this.graphicGroup)
          return;
        this.graphicGroup.removeAll();
        const [x1, y1] = this.points[0];
        const [x2, y2] = this.points[1];
        this.graphicGroup.add(new echarts__namespace.graphic.Line({
          shape: { x1, y1, x2, y2 },
          style: { stroke: "#2196f3", lineWidth: 1.5, lineDash: [5, 4] },
          silent: true
        }));
        if (this.points.length >= 3) {
          const [x3, y3] = this.points[2];
          this.graphicGroup.add(new echarts__namespace.graphic.Line({
            shape: { x1: x2, y1: y2, x2: x3, y2: y3 },
            style: { stroke: "#ff9800", lineWidth: 1.5, lineDash: [5, 4] },
            silent: true
          }));
          const trendPixelDy = y2 - y1;
          const minX = Math.min(x1, x2, x3);
          const maxX = Math.max(x1, x2, x3);
          const extraWidth = (maxX - minX) * 0.5;
          const lineLeft = minX;
          const lineRight = maxX + extraWidth;
          for (let i = 0; i < LEVELS.length; i++) {
            const level = LEVELS[i];
            const ly = y3 + trendPixelDy * level;
            const lColor = COLORS[i % COLORS.length];
            this.graphicGroup.add(new echarts__namespace.graphic.Line({
              shape: { x1: lineLeft, y1: ly, x2: lineRight, y2: ly },
              style: { stroke: lColor, lineWidth: 1 },
              silent: true
            }));
            this.graphicGroup.add(new echarts__namespace.graphic.Text({
              style: { text: `${level}`, x: lineRight + 4, y: ly - 6, fill: lColor, fontSize: 9 },
              silent: true
            }));
            if (i < LEVELS.length - 1) {
              const nextLy = y3 + trendPixelDy * LEVELS[i + 1];
              const rectY = Math.min(ly, nextLy);
              const rectH = Math.abs(nextLy - ly);
              this.graphicGroup.add(new echarts__namespace.graphic.Rect({
                shape: { x: lineLeft, y: rectY, width: lineRight - lineLeft, height: rectH },
                style: { fill: COLORS[(i + 1) % COLORS.length], opacity: 0.06 },
                silent: true
              }));
            }
          }
        }
        for (const pt of this.points) {
          this.graphicGroup.add(new echarts__namespace.graphic.Circle({
            shape: { cx: pt[0], cy: pt[1], r: 4 },
            style: { fill: "#fff", stroke: "#3b82f6", lineWidth: 1.5 },
            z: 101,
            silent: true
          }));
        }
      }
      saveDrawing() {
        const dataPoints = this.points.map(
          (pt) => this.context.coordinateConversion.pixelToData({ x: pt[0], y: pt[1] })
        );
        if (dataPoints.every((p) => p !== null)) {
          this.context.addDrawing({
            id: `fib-ext-${Date.now()}`,
            type: "fib_trend_extension",
            points: dataPoints,
            paneIndex: dataPoints[0].paneIndex || 0,
            style: { color: "#3b82f6", lineWidth: 1 }
          });
        }
      }
    }

    var __defProp$c = Object.defineProperty;
    var __defNormalProp$c = (obj, key, value) => key in obj ? __defProp$c(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$c = (obj, key, value) => {
      __defNormalProp$c(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LABELS$b = ["X", "A", "B", "C", "D"];
    const LEG_COLORS$7 = ["#2196f3", "#ff9800", "#4caf50", "#f44336"];
    const FILL_COLOR_1 = "rgba(33, 150, 243, 0.08)";
    const FILL_COLOR_2 = "rgba(244, 67, 54, 0.08)";
    class XABCDPatternDrawingRenderer {
      constructor() {
        __publicField$c(this, "type", "xabcd_pattern");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected } = ctx;
        const color = drawing.style?.color || "#3b82f6";
        if (pixelPoints.length < 2)
          return;
        const children = [];
        if (pixelPoints.length >= 3) {
          children.push({
            type: "polygon",
            name: "line",
            shape: {
              points: pixelPoints.slice(0, 3).map(([x, y]) => [x, y])
            },
            style: { fill: FILL_COLOR_1, opacity: 1 }
          });
        }
        if (pixelPoints.length >= 5) {
          children.push({
            type: "polygon",
            name: "line",
            shape: {
              points: pixelPoints.slice(2, 5).map(([x, y]) => [x, y])
            },
            style: { fill: FILL_COLOR_2, opacity: 1 }
          });
        }
        for (let i = 0; i < pixelPoints.length - 1; i++) {
          const [x1, y1] = pixelPoints[i];
          const [x2, y2] = pixelPoints[i + 1];
          const legColor = LEG_COLORS$7[i % LEG_COLORS$7.length];
          children.push({
            type: "line",
            name: "line",
            shape: { x1, y1, x2, y2 },
            style: { stroke: legColor, lineWidth: drawing.style?.lineWidth || 2 }
          });
        }
        const connectors = [[0, 2], [1, 3], [2, 4]];
        for (const [from, to] of connectors) {
          if (from < pixelPoints.length && to < pixelPoints.length) {
            const [x1, y1] = pixelPoints[from];
            const [x2, y2] = pixelPoints[to];
            children.push({
              type: "line",
              shape: { x1, y1, x2, y2 },
              style: { stroke: "#555", lineWidth: 1, lineDash: [4, 4] },
              silent: true
            });
          }
        }
        if (drawing.points.length >= 3) {
          const xa = Math.abs(drawing.points[1].value - drawing.points[0].value);
          const ab = Math.abs(drawing.points[2].value - drawing.points[1].value);
          if (xa !== 0) {
            const ratio = (ab / xa).toFixed(3);
            const mx = (pixelPoints[1][0] + pixelPoints[2][0]) / 2;
            const my = (pixelPoints[1][1] + pixelPoints[2][1]) / 2;
            children.push({
              type: "text",
              style: { text: ratio, x: mx + 8, y: my, fill: "#ff9800", fontSize: 10 },
              silent: true
            });
          }
        }
        if (drawing.points.length >= 4) {
          const ab = Math.abs(drawing.points[2].value - drawing.points[1].value);
          const bc = Math.abs(drawing.points[3].value - drawing.points[2].value);
          if (ab !== 0) {
            const ratio = (bc / ab).toFixed(3);
            const mx = (pixelPoints[2][0] + pixelPoints[3][0]) / 2;
            const my = (pixelPoints[2][1] + pixelPoints[3][1]) / 2;
            children.push({
              type: "text",
              style: { text: ratio, x: mx + 8, y: my, fill: "#4caf50", fontSize: 10 },
              silent: true
            });
          }
        }
        if (drawing.points.length >= 5) {
          const bc = Math.abs(drawing.points[3].value - drawing.points[2].value);
          const cd = Math.abs(drawing.points[4].value - drawing.points[3].value);
          if (bc !== 0) {
            const ratio = (cd / bc).toFixed(3);
            const mx = (pixelPoints[3][0] + pixelPoints[4][0]) / 2;
            const my = (pixelPoints[3][1] + pixelPoints[4][1]) / 2;
            children.push({
              type: "text",
              style: { text: ratio, x: mx + 8, y: my, fill: "#f44336", fontSize: 10 },
              silent: true
            });
          }
          const xa = Math.abs(drawing.points[1].value - drawing.points[0].value);
          const ad = Math.abs(drawing.points[4].value - drawing.points[1].value);
          if (xa !== 0) {
            const ratio = (ad / xa).toFixed(3);
            const [dx, dy] = pixelPoints[4];
            children.push({
              type: "text",
              style: { text: `AD/XA: ${ratio}`, x: dx + 10, y: dy + 14, fill: "#aaa", fontSize: 9 },
              silent: true
            });
          }
        }
        for (let i = 0; i < pixelPoints.length && i < LABELS$b.length; i++) {
          const [px, py] = pixelPoints[i];
          const isLocalHigh = (i === 0 || py <= pixelPoints[i - 1][1]) && (i === pixelPoints.length - 1 || py <= pixelPoints[i + 1]?.[1]);
          const labelY = isLocalHigh ? py - 14 : py + 16;
          children.push({
            type: "text",
            style: {
              text: LABELS$b[i],
              x: px,
              y: labelY,
              fill: "#e2e8f0",
              fontSize: 12,
              fontWeight: "bold",
              align: "center",
              verticalAlign: "middle"
            },
            silent: true
          });
        }
        for (let i = 0; i < pixelPoints.length; i++) {
          const [px, py] = pixelPoints[i];
          children.push({
            type: "circle",
            name: `point-${i}`,
            shape: { cx: px, cy: py, r: 4 },
            style: {
              fill: "#fff",
              stroke: color,
              lineWidth: 1,
              opacity: isSelected ? 1 : 0
            },
            z: 100
          });
        }
        return {
          type: "group",
          children
        };
      }
    }

    var __defProp$b = Object.defineProperty;
    var __defNormalProp$b = (obj, key, value) => key in obj ? __defProp$b(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$b = (obj, key, value) => {
      __defNormalProp$b(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LABELS$a = ["X", "A", "B", "C", "D"];
    const LEG_COLORS$6 = ["#2196f3", "#ff9800", "#4caf50", "#f44336"];
    const TOTAL_POINTS$5 = 5;
    class XABCDPatternTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "xabcd-pattern-tool",
          name: options.name || "XABCD Pattern",
          icon: options.icon || `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#e3e3e3" stroke-width="1.5"><polyline points="2,18 6,6 11,14 16,4 21,16"/><circle cx="2" cy="18" r="1.5" fill="#e3e3e3"/><circle cx="6" cy="6" r="1.5" fill="#e3e3e3"/><circle cx="11" cy="14" r="1.5" fill="#e3e3e3"/><circle cx="16" cy="4" r="1.5" fill="#e3e3e3"/><circle cx="21" cy="16" r="1.5" fill="#e3e3e3"/></svg>`
        });
        __publicField$b(this, "points", []);
        __publicField$b(this, "state", "idle");
        __publicField$b(this, "graphicGroup", null);
        __publicField$b(this, "onClick", (params) => {
          const pt = this.getPoint(params);
          if (this.state === "idle") {
            this.state = "drawing";
            this.points = [pt, [...pt]];
            this.initGraphic();
            this.updateGraphic();
          } else if (this.state === "drawing") {
            this.points[this.points.length - 1] = pt;
            if (this.points.length >= TOTAL_POINTS$5) {
              this.state = "finished";
              this.updateGraphic();
              this.saveDrawing();
              this.removeGraphic();
              this.context.disableTools();
            } else {
              this.points.push([...pt]);
              this.updateGraphic();
            }
          }
        });
        __publicField$b(this, "onMouseMove", (params) => {
          if (this.state !== "drawing" || this.points.length < 2)
            return;
          this.points[this.points.length - 1] = this.getPoint(params);
          this.updateGraphic();
        });
      }
      onInit() {
        this.context.registerDrawingRenderer(new XABCDPatternDrawingRenderer());
      }
      onActivate() {
        this.state = "idle";
        this.points = [];
        this.context.getChart().getZr().setCursorStyle("crosshair");
        this.bindEvents();
      }
      onDeactivate() {
        this.state = "idle";
        this.points = [];
        this.removeGraphic();
        this.unbindEvents();
        this.context.getChart().getZr().setCursorStyle("default");
      }
      bindEvents() {
        const zr = this.context.getChart().getZr();
        zr.on("click", this.onClick);
        zr.on("mousemove", this.onMouseMove);
      }
      unbindEvents() {
        const zr = this.context.getChart().getZr();
        zr.off("click", this.onClick);
        zr.off("mousemove", this.onMouseMove);
      }
      initGraphic() {
        this.graphicGroup = new echarts__namespace.graphic.Group();
        this.context.getChart().getZr().add(this.graphicGroup);
      }
      removeGraphic() {
        if (this.graphicGroup) {
          this.context.getChart().getZr().remove(this.graphicGroup);
          this.graphicGroup = null;
        }
      }
      updateGraphic() {
        if (!this.graphicGroup)
          return;
        this.graphicGroup.removeAll();
        const pts = this.points;
        if (pts.length >= 3) {
          this.graphicGroup.add(
            new echarts__namespace.graphic.Polygon({
              shape: { points: pts.slice(0, 3) },
              style: { fill: "rgba(33, 150, 243, 0.08)" },
              silent: true
            })
          );
        }
        if (pts.length >= 5) {
          this.graphicGroup.add(
            new echarts__namespace.graphic.Polygon({
              shape: { points: pts.slice(2, 5) },
              style: { fill: "rgba(244, 67, 54, 0.08)" },
              silent: true
            })
          );
        }
        for (let i = 0; i < pts.length - 1; i++) {
          const [x1, y1] = pts[i];
          const [x2, y2] = pts[i + 1];
          this.graphicGroup.add(
            new echarts__namespace.graphic.Line({
              shape: { x1, y1, x2, y2 },
              style: { stroke: LEG_COLORS$6[i % LEG_COLORS$6.length], lineWidth: 2 },
              silent: true
            })
          );
        }
        const connectors = [[0, 2], [1, 3], [2, 4]];
        for (const [from, to] of connectors) {
          if (from < pts.length && to < pts.length) {
            const [x1, y1] = pts[from];
            const [x2, y2] = pts[to];
            this.graphicGroup.add(
              new echarts__namespace.graphic.Line({
                shape: { x1, y1, x2, y2 },
                style: { stroke: "#555", lineWidth: 1, lineDash: [4, 4] },
                silent: true
              })
            );
          }
        }
        for (let i = 0; i < pts.length && i < LABELS$a.length; i++) {
          const [px, py] = pts[i];
          const isLocalHigh = (i === 0 || py <= pts[i - 1][1]) && (i === pts.length - 1 || py <= pts[i + 1]?.[1]);
          const labelY = isLocalHigh ? py - 14 : py + 16;
          this.graphicGroup.add(
            new echarts__namespace.graphic.Text({
              style: {
                text: LABELS$a[i],
                x: px,
                y: labelY,
                fill: "#e2e8f0",
                fontSize: 12,
                fontWeight: "bold",
                align: "center",
                verticalAlign: "middle"
              },
              silent: true
            })
          );
        }
        for (let i = 0; i < pts.length; i++) {
          const [px, py] = pts[i];
          this.graphicGroup.add(
            new echarts__namespace.graphic.Circle({
              shape: { cx: px, cy: py, r: 4 },
              style: { fill: "#fff", stroke: "#3b82f6", lineWidth: 1.5 },
              z: 101,
              silent: true
            })
          );
        }
      }
      saveDrawing() {
        const dataPoints = this.points.map(
          (pt) => this.context.coordinateConversion.pixelToData({ x: pt[0], y: pt[1] })
        );
        if (dataPoints.every((p) => p !== null)) {
          this.context.addDrawing({
            id: `xabcd-${Date.now()}`,
            type: "xabcd_pattern",
            points: dataPoints,
            paneIndex: dataPoints[0].paneIndex || 0,
            style: {
              color: "#3b82f6",
              lineWidth: 2
            }
          });
        }
      }
    }

    var __defProp$a = Object.defineProperty;
    var __defNormalProp$a = (obj, key, value) => key in obj ? __defProp$a(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$a = (obj, key, value) => {
      __defNormalProp$a(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LABELS$9 = ["A", "B", "C", "D"];
    const LEG_COLORS$5 = ["#2196f3", "#ff9800", "#4caf50"];
    class ABCDPatternDrawingRenderer {
      constructor() {
        __publicField$a(this, "type", "abcd_pattern");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected } = ctx;
        const color = drawing.style?.color || "#3b82f6";
        if (pixelPoints.length < 2)
          return;
        const children = [];
        if (pixelPoints.length >= 3) {
          children.push({
            type: "polygon",
            name: "line",
            shape: { points: pixelPoints.slice(0, 3).map(([x, y]) => [x, y]) },
            style: { fill: "rgba(33, 150, 243, 0.08)" }
          });
        }
        if (pixelPoints.length >= 4) {
          children.push({
            type: "polygon",
            name: "line",
            shape: { points: pixelPoints.slice(1, 4).map(([x, y]) => [x, y]) },
            style: { fill: "rgba(244, 67, 54, 0.08)" }
          });
        }
        for (let i = 0; i < pixelPoints.length - 1; i++) {
          const [x1, y1] = pixelPoints[i];
          const [x2, y2] = pixelPoints[i + 1];
          children.push({
            type: "line",
            name: "line",
            shape: { x1, y1, x2, y2 },
            style: { stroke: LEG_COLORS$5[i % LEG_COLORS$5.length], lineWidth: drawing.style?.lineWidth || 2 }
          });
        }
        if (pixelPoints.length >= 3) {
          children.push({
            type: "line",
            shape: { x1: pixelPoints[0][0], y1: pixelPoints[0][1], x2: pixelPoints[2][0], y2: pixelPoints[2][1] },
            style: { stroke: "#555", lineWidth: 1, lineDash: [4, 4] },
            silent: true
          });
        }
        if (pixelPoints.length >= 4) {
          children.push({
            type: "line",
            shape: { x1: pixelPoints[1][0], y1: pixelPoints[1][1], x2: pixelPoints[3][0], y2: pixelPoints[3][1] },
            style: { stroke: "#555", lineWidth: 1, lineDash: [4, 4] },
            silent: true
          });
        }
        if (drawing.points.length >= 3) {
          const ab = Math.abs(drawing.points[1].value - drawing.points[0].value);
          const bc = Math.abs(drawing.points[2].value - drawing.points[1].value);
          if (ab !== 0) {
            const ratio = (bc / ab).toFixed(3);
            const mx = (pixelPoints[1][0] + pixelPoints[2][0]) / 2;
            const my = (pixelPoints[1][1] + pixelPoints[2][1]) / 2;
            children.push({ type: "text", style: { text: ratio, x: mx + 8, y: my, fill: "#ff9800", fontSize: 10 }, silent: true });
          }
        }
        if (drawing.points.length >= 4) {
          const bc = Math.abs(drawing.points[2].value - drawing.points[1].value);
          const cd = Math.abs(drawing.points[3].value - drawing.points[2].value);
          if (bc !== 0) {
            const ratio = (cd / bc).toFixed(3);
            const mx = (pixelPoints[2][0] + pixelPoints[3][0]) / 2;
            const my = (pixelPoints[2][1] + pixelPoints[3][1]) / 2;
            children.push({ type: "text", style: { text: ratio, x: mx + 8, y: my, fill: "#4caf50", fontSize: 10 }, silent: true });
          }
        }
        for (let i = 0; i < pixelPoints.length && i < LABELS$9.length; i++) {
          const [px, py] = pixelPoints[i];
          const isHigh = (i === 0 || py <= pixelPoints[i - 1][1]) && (i === pixelPoints.length - 1 || py <= pixelPoints[i + 1]?.[1]);
          children.push({
            type: "text",
            style: { text: LABELS$9[i], x: px, y: isHigh ? py - 14 : py + 16, fill: "#e2e8f0", fontSize: 12, fontWeight: "bold", align: "center", verticalAlign: "middle" },
            silent: true
          });
        }
        for (let i = 0; i < pixelPoints.length; i++) {
          children.push({
            type: "circle",
            name: `point-${i}`,
            shape: { cx: pixelPoints[i][0], cy: pixelPoints[i][1], r: 4 },
            style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
            z: 100
          });
        }
        return { type: "group", children };
      }
    }

    var __defProp$9 = Object.defineProperty;
    var __defNormalProp$9 = (obj, key, value) => key in obj ? __defProp$9(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$9 = (obj, key, value) => {
      __defNormalProp$9(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LABELS$8 = ["A", "B", "C", "D"];
    const LEG_COLORS$4 = ["#2196f3", "#ff9800", "#4caf50"];
    const TOTAL_POINTS$4 = 4;
    class ABCDPatternTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "abcd-pattern-tool",
          name: options.name || "ABCD Pattern",
          icon: options.icon || `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#e3e3e3" stroke-width="1.5"><polyline points="3,18 8,5 15,15 21,3"/><circle cx="3" cy="18" r="1.5" fill="#e3e3e3"/><circle cx="8" cy="5" r="1.5" fill="#e3e3e3"/><circle cx="15" cy="15" r="1.5" fill="#e3e3e3"/><circle cx="21" cy="3" r="1.5" fill="#e3e3e3"/></svg>`
        });
        __publicField$9(this, "points", []);
        __publicField$9(this, "state", "idle");
        __publicField$9(this, "graphicGroup", null);
        __publicField$9(this, "onClick", (params) => {
          const pt = this.getPoint(params);
          if (this.state === "idle") {
            this.state = "drawing";
            this.points = [pt, [...pt]];
            this.initGraphic();
            this.updateGraphic();
          } else if (this.state === "drawing") {
            this.points[this.points.length - 1] = pt;
            if (this.points.length >= TOTAL_POINTS$4) {
              this.state = "finished";
              this.updateGraphic();
              this.saveDrawing();
              this.removeGraphic();
              this.context.disableTools();
            } else {
              this.points.push([...pt]);
              this.updateGraphic();
            }
          }
        });
        __publicField$9(this, "onMouseMove", (params) => {
          if (this.state !== "drawing" || this.points.length < 2)
            return;
          this.points[this.points.length - 1] = this.getPoint(params);
          this.updateGraphic();
        });
      }
      onInit() {
        this.context.registerDrawingRenderer(new ABCDPatternDrawingRenderer());
      }
      onActivate() {
        this.state = "idle";
        this.points = [];
        this.context.getChart().getZr().setCursorStyle("crosshair");
        const zr = this.context.getChart().getZr();
        zr.on("click", this.onClick);
        zr.on("mousemove", this.onMouseMove);
      }
      onDeactivate() {
        this.state = "idle";
        this.points = [];
        this.removeGraphic();
        const zr = this.context.getChart().getZr();
        zr.off("click", this.onClick);
        zr.off("mousemove", this.onMouseMove);
        this.context.getChart().getZr().setCursorStyle("default");
      }
      initGraphic() {
        this.graphicGroup = new echarts__namespace.graphic.Group();
        this.context.getChart().getZr().add(this.graphicGroup);
      }
      removeGraphic() {
        if (this.graphicGroup) {
          this.context.getChart().getZr().remove(this.graphicGroup);
          this.graphicGroup = null;
        }
      }
      updateGraphic() {
        if (!this.graphicGroup)
          return;
        this.graphicGroup.removeAll();
        const pts = this.points;
        if (pts.length >= 3) {
          this.graphicGroup.add(new echarts__namespace.graphic.Polygon({ shape: { points: pts.slice(0, 3) }, style: { fill: "rgba(33,150,243,0.08)" }, silent: true }));
        }
        if (pts.length >= 4) {
          this.graphicGroup.add(new echarts__namespace.graphic.Polygon({ shape: { points: pts.slice(1, 4) }, style: { fill: "rgba(244,67,54,0.08)" }, silent: true }));
        }
        for (let i = 0; i < pts.length - 1; i++) {
          this.graphicGroup.add(new echarts__namespace.graphic.Line({
            shape: { x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1] },
            style: { stroke: LEG_COLORS$4[i % LEG_COLORS$4.length], lineWidth: 2 },
            silent: true
          }));
        }
        if (pts.length >= 3) {
          this.graphicGroup.add(new echarts__namespace.graphic.Line({ shape: { x1: pts[0][0], y1: pts[0][1], x2: pts[2][0], y2: pts[2][1] }, style: { stroke: "#555", lineWidth: 1, lineDash: [4, 4] }, silent: true }));
        }
        if (pts.length >= 4) {
          this.graphicGroup.add(new echarts__namespace.graphic.Line({ shape: { x1: pts[1][0], y1: pts[1][1], x2: pts[3][0], y2: pts[3][1] }, style: { stroke: "#555", lineWidth: 1, lineDash: [4, 4] }, silent: true }));
        }
        for (let i = 0; i < pts.length && i < LABELS$8.length; i++) {
          const [px, py] = pts[i];
          const isHigh = (i === 0 || py <= pts[i - 1][1]) && (i === pts.length - 1 || py <= pts[i + 1]?.[1]);
          this.graphicGroup.add(new echarts__namespace.graphic.Text({ style: { text: LABELS$8[i], x: px, y: isHigh ? py - 14 : py + 16, fill: "#e2e8f0", fontSize: 12, fontWeight: "bold", align: "center", verticalAlign: "middle" }, silent: true }));
          this.graphicGroup.add(new echarts__namespace.graphic.Circle({ shape: { cx: px, cy: py, r: 4 }, style: { fill: "#fff", stroke: "#3b82f6", lineWidth: 1.5 }, z: 101, silent: true }));
        }
      }
      saveDrawing() {
        const dataPoints = this.points.map((pt) => this.context.coordinateConversion.pixelToData({ x: pt[0], y: pt[1] }));
        if (dataPoints.every((p) => p !== null)) {
          this.context.addDrawing({
            id: `abcd-${Date.now()}`,
            type: "abcd_pattern",
            points: dataPoints,
            paneIndex: dataPoints[0].paneIndex || 0,
            style: { color: "#3b82f6", lineWidth: 2 }
          });
        }
      }
    }

    var __defProp$8 = Object.defineProperty;
    var __defNormalProp$8 = (obj, key, value) => key in obj ? __defProp$8(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$8 = (obj, key, value) => {
      __defNormalProp$8(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LABELS$7 = ["X", "A", "B", "C", "D"];
    const LEG_COLORS$3 = ["#00bcd4", "#e91e63", "#8bc34a", "#ff5722"];
    class CypherPatternDrawingRenderer {
      constructor() {
        __publicField$8(this, "type", "cypher_pattern");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected } = ctx;
        const color = drawing.style?.color || "#3b82f6";
        if (pixelPoints.length < 2)
          return;
        const children = [];
        if (pixelPoints.length >= 3) {
          children.push({ type: "polygon", name: "line", shape: { points: pixelPoints.slice(0, 3).map(([x, y]) => [x, y]) }, style: { fill: "rgba(0, 188, 212, 0.08)" } });
        }
        if (pixelPoints.length >= 5) {
          children.push({ type: "polygon", name: "line", shape: { points: pixelPoints.slice(2, 5).map(([x, y]) => [x, y]) }, style: { fill: "rgba(233, 30, 99, 0.08)" } });
        }
        for (let i = 0; i < pixelPoints.length - 1; i++) {
          const [x1, y1] = pixelPoints[i];
          const [x2, y2] = pixelPoints[i + 1];
          children.push({ type: "line", name: "line", shape: { x1, y1, x2, y2 }, style: { stroke: LEG_COLORS$3[i % LEG_COLORS$3.length], lineWidth: drawing.style?.lineWidth || 2 } });
        }
        const connectors = [[0, 2], [0, 3], [1, 4]];
        for (const [from, to] of connectors) {
          if (from < pixelPoints.length && to < pixelPoints.length) {
            children.push({ type: "line", shape: { x1: pixelPoints[from][0], y1: pixelPoints[from][1], x2: pixelPoints[to][0], y2: pixelPoints[to][1] }, style: { stroke: "#555", lineWidth: 1, lineDash: [4, 4] }, silent: true });
          }
        }
        const pts = drawing.points;
        if (pts.length >= 3) {
          const xa = Math.abs(pts[1].value - pts[0].value);
          const ab = Math.abs(pts[2].value - pts[1].value);
          if (xa !== 0) {
            const r = (ab / xa).toFixed(3);
            children.push({ type: "text", style: { text: r, x: (pixelPoints[1][0] + pixelPoints[2][0]) / 2 + 8, y: (pixelPoints[1][1] + pixelPoints[2][1]) / 2, fill: "#e91e63", fontSize: 10 }, silent: true });
          }
        }
        if (pts.length >= 4) {
          const xa = Math.abs(pts[1].value - pts[0].value);
          const xc = Math.abs(pts[3].value - pts[0].value);
          if (xa !== 0) {
            const r = (xc / xa).toFixed(3);
            children.push({ type: "text", style: { text: `XC/XA: ${r}`, x: (pixelPoints[0][0] + pixelPoints[3][0]) / 2 + 8, y: (pixelPoints[0][1] + pixelPoints[3][1]) / 2, fill: "#8bc34a", fontSize: 10 }, silent: true });
          }
        }
        if (pts.length >= 5) {
          const xc = Math.abs(pts[3].value - pts[0].value);
          const cd = Math.abs(pts[4].value - pts[3].value);
          if (xc !== 0) {
            const r = (cd / xc).toFixed(3);
            children.push({ type: "text", style: { text: r, x: (pixelPoints[3][0] + pixelPoints[4][0]) / 2 + 8, y: (pixelPoints[3][1] + pixelPoints[4][1]) / 2, fill: "#ff5722", fontSize: 10 }, silent: true });
          }
        }
        for (let i = 0; i < pixelPoints.length && i < LABELS$7.length; i++) {
          const [px, py] = pixelPoints[i];
          const isHigh = (i === 0 || py <= pixelPoints[i - 1][1]) && (i === pixelPoints.length - 1 || py <= pixelPoints[i + 1]?.[1]);
          children.push({ type: "text", style: { text: LABELS$7[i], x: px, y: isHigh ? py - 14 : py + 16, fill: "#e2e8f0", fontSize: 12, fontWeight: "bold", align: "center", verticalAlign: "middle" }, silent: true });
        }
        for (let i = 0; i < pixelPoints.length; i++) {
          children.push({ type: "circle", name: `point-${i}`, shape: { cx: pixelPoints[i][0], cy: pixelPoints[i][1], r: 4 }, style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }, z: 100 });
        }
        return { type: "group", children };
      }
    }

    var __defProp$7 = Object.defineProperty;
    var __defNormalProp$7 = (obj, key, value) => key in obj ? __defProp$7(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$7 = (obj, key, value) => {
      __defNormalProp$7(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LABELS$6 = ["X", "A", "B", "C", "D"];
    const LEG_COLORS$2 = ["#00bcd4", "#e91e63", "#8bc34a", "#ff5722"];
    const TOTAL_POINTS$3 = 5;
    class CypherPatternTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "cypher-pattern-tool",
          name: options.name || "Cypher Pattern",
          icon: options.icon || `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#e3e3e3" stroke-width="1.5"><polyline points="2,16 7,4 11,12 17,2 22,14"/><circle cx="2" cy="16" r="1.5" fill="#e3e3e3"/><circle cx="7" cy="4" r="1.5" fill="#e3e3e3"/><circle cx="11" cy="12" r="1.5" fill="#e3e3e3"/><circle cx="17" cy="2" r="1.5" fill="#e3e3e3"/><circle cx="22" cy="14" r="1.5" fill="#e3e3e3"/></svg>`
        });
        __publicField$7(this, "points", []);
        __publicField$7(this, "state", "idle");
        __publicField$7(this, "graphicGroup", null);
        __publicField$7(this, "onClick", (params) => {
          const pt = this.getPoint(params);
          if (this.state === "idle") {
            this.state = "drawing";
            this.points = [pt, [...pt]];
            this.initGraphic();
            this.updateGraphic();
          } else if (this.state === "drawing") {
            this.points[this.points.length - 1] = pt;
            if (this.points.length >= TOTAL_POINTS$3) {
              this.state = "finished";
              this.updateGraphic();
              this.saveDrawing();
              this.removeGraphic();
              this.context.disableTools();
            } else {
              this.points.push([...pt]);
              this.updateGraphic();
            }
          }
        });
        __publicField$7(this, "onMouseMove", (params) => {
          if (this.state !== "drawing" || this.points.length < 2)
            return;
          this.points[this.points.length - 1] = this.getPoint(params);
          this.updateGraphic();
        });
      }
      onInit() {
        this.context.registerDrawingRenderer(new CypherPatternDrawingRenderer());
      }
      onActivate() {
        this.state = "idle";
        this.points = [];
        this.context.getChart().getZr().setCursorStyle("crosshair");
        const zr = this.context.getChart().getZr();
        zr.on("click", this.onClick);
        zr.on("mousemove", this.onMouseMove);
      }
      onDeactivate() {
        this.state = "idle";
        this.points = [];
        this.removeGraphic();
        const zr = this.context.getChart().getZr();
        zr.off("click", this.onClick);
        zr.off("mousemove", this.onMouseMove);
        zr.setCursorStyle("default");
      }
      initGraphic() {
        this.graphicGroup = new echarts__namespace.graphic.Group();
        this.context.getChart().getZr().add(this.graphicGroup);
      }
      removeGraphic() {
        if (this.graphicGroup) {
          this.context.getChart().getZr().remove(this.graphicGroup);
          this.graphicGroup = null;
        }
      }
      updateGraphic() {
        if (!this.graphicGroup)
          return;
        this.graphicGroup.removeAll();
        const pts = this.points;
        if (pts.length >= 3)
          this.graphicGroup.add(new echarts__namespace.graphic.Polygon({ shape: { points: pts.slice(0, 3) }, style: { fill: "rgba(0,188,212,0.08)" }, silent: true }));
        if (pts.length >= 5)
          this.graphicGroup.add(new echarts__namespace.graphic.Polygon({ shape: { points: pts.slice(2, 5) }, style: { fill: "rgba(233,30,99,0.08)" }, silent: true }));
        for (let i = 0; i < pts.length - 1; i++) {
          this.graphicGroup.add(new echarts__namespace.graphic.Line({ shape: { x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1] }, style: { stroke: LEG_COLORS$2[i % LEG_COLORS$2.length], lineWidth: 2 }, silent: true }));
        }
        for (let i = 0; i < pts.length && i < LABELS$6.length; i++) {
          const [px, py] = pts[i];
          const isHigh = (i === 0 || py <= pts[i - 1][1]) && (i === pts.length - 1 || py <= pts[i + 1]?.[1]);
          this.graphicGroup.add(new echarts__namespace.graphic.Text({ style: { text: LABELS$6[i], x: px, y: isHigh ? py - 14 : py + 16, fill: "#e2e8f0", fontSize: 12, fontWeight: "bold", align: "center", verticalAlign: "middle" }, silent: true }));
          this.graphicGroup.add(new echarts__namespace.graphic.Circle({ shape: { cx: px, cy: py, r: 4 }, style: { fill: "#fff", stroke: "#3b82f6", lineWidth: 1.5 }, z: 101, silent: true }));
        }
      }
      saveDrawing() {
        const dataPoints = this.points.map((pt) => this.context.coordinateConversion.pixelToData({ x: pt[0], y: pt[1] }));
        if (dataPoints.every((p) => p !== null)) {
          this.context.addDrawing({ id: `cypher-${Date.now()}`, type: "cypher_pattern", points: dataPoints, paneIndex: dataPoints[0].paneIndex || 0, style: { color: "#3b82f6", lineWidth: 2 } });
        }
      }
    }

    var __defProp$6 = Object.defineProperty;
    var __defNormalProp$6 = (obj, key, value) => key in obj ? __defProp$6(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$6 = (obj, key, value) => {
      __defNormalProp$6(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LABELS$5 = ["", "LS", "", "H", "", "RS", ""];
    class HeadAndShouldersDrawingRenderer {
      constructor() {
        __publicField$6(this, "type", "head_and_shoulders");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected } = ctx;
        const color = drawing.style?.color || "#3b82f6";
        if (pixelPoints.length < 2)
          return;
        const children = [];
        if (pixelPoints.length >= 3) {
          children.push({ type: "polygon", name: "line", shape: { points: pixelPoints.slice(0, 3).map(([x, y]) => [x, y]) }, style: { fill: "rgba(33, 150, 243, 0.06)" } });
        }
        if (pixelPoints.length >= 5) {
          children.push({ type: "polygon", name: "line", shape: { points: pixelPoints.slice(2, 5).map(([x, y]) => [x, y]) }, style: { fill: "rgba(244, 67, 54, 0.08)" } });
        }
        if (pixelPoints.length >= 7) {
          children.push({ type: "polygon", name: "line", shape: { points: pixelPoints.slice(4, 7).map(([x, y]) => [x, y]) }, style: { fill: "rgba(33, 150, 243, 0.06)" } });
        }
        for (let i = 0; i < pixelPoints.length - 1; i++) {
          const [x1, y1] = pixelPoints[i];
          const [x2, y2] = pixelPoints[i + 1];
          children.push({
            type: "line",
            name: "line",
            shape: { x1, y1, x2, y2 },
            style: { stroke: "#2196f3", lineWidth: drawing.style?.lineWidth || 2 }
          });
        }
        if (pixelPoints.length >= 5) {
          const [nx1, ny1] = pixelPoints[2];
          const [nx2, ny2] = pixelPoints[4];
          const dx = nx2 - nx1;
          const dy = ny2 - ny1;
          const extL = 0.3;
          const extR = 0.3;
          const exlx = nx1 - dx * extL;
          const exly = ny1 - dy * extL;
          const exrx = nx2 + dx * extR;
          const exry = ny2 + dy * extR;
          children.push({
            type: "line",
            shape: { x1: exlx, y1: exly, x2: exrx, y2: exry },
            style: { stroke: "#ff9800", lineWidth: 2, lineDash: [6, 4] },
            silent: true
          });
          children.push({
            type: "text",
            style: { text: "Neckline", x: (nx1 + nx2) / 2, y: (ny1 + ny2) / 2 + 14, fill: "#ff9800", fontSize: 10, align: "center" },
            silent: true
          });
        }
        for (let i = 0; i < pixelPoints.length && i < LABELS$5.length; i++) {
          if (!LABELS$5[i])
            continue;
          const [px, py] = pixelPoints[i];
          const isHigh = (i === 0 || py <= pixelPoints[i - 1][1]) && (i === pixelPoints.length - 1 || py <= pixelPoints[i + 1]?.[1]);
          children.push({
            type: "text",
            style: { text: LABELS$5[i], x: px, y: isHigh ? py - 14 : py + 16, fill: "#e2e8f0", fontSize: 12, fontWeight: "bold", align: "center", verticalAlign: "middle" },
            silent: true
          });
        }
        for (let i = 0; i < pixelPoints.length; i++) {
          children.push({
            type: "circle",
            name: `point-${i}`,
            shape: { cx: pixelPoints[i][0], cy: pixelPoints[i][1], r: 4 },
            style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 },
            z: 100
          });
        }
        return { type: "group", children };
      }
    }

    var __defProp$5 = Object.defineProperty;
    var __defNormalProp$5 = (obj, key, value) => key in obj ? __defProp$5(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$5 = (obj, key, value) => {
      __defNormalProp$5(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LABELS$4 = ["", "LS", "", "H", "", "RS", ""];
    const TOTAL_POINTS$2 = 7;
    class HeadAndShouldersTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "head-and-shoulders-tool",
          name: options.name || "Head & Shoulders",
          icon: options.icon || `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#e3e3e3" stroke-width="1.5"><polyline points="1,18 4,10 7,14 12,3 17,14 20,10 23,18"/></svg>`
        });
        __publicField$5(this, "points", []);
        __publicField$5(this, "state", "idle");
        __publicField$5(this, "graphicGroup", null);
        __publicField$5(this, "onClick", (params) => {
          const pt = this.getPoint(params);
          if (this.state === "idle") {
            this.state = "drawing";
            this.points = [pt, [...pt]];
            this.initGraphic();
            this.updateGraphic();
          } else if (this.state === "drawing") {
            this.points[this.points.length - 1] = pt;
            if (this.points.length >= TOTAL_POINTS$2) {
              this.state = "finished";
              this.updateGraphic();
              this.saveDrawing();
              this.removeGraphic();
              this.context.disableTools();
            } else {
              this.points.push([...pt]);
              this.updateGraphic();
            }
          }
        });
        __publicField$5(this, "onMouseMove", (params) => {
          if (this.state !== "drawing" || this.points.length < 2)
            return;
          this.points[this.points.length - 1] = this.getPoint(params);
          this.updateGraphic();
        });
      }
      onInit() {
        this.context.registerDrawingRenderer(new HeadAndShouldersDrawingRenderer());
      }
      onActivate() {
        this.state = "idle";
        this.points = [];
        this.context.getChart().getZr().setCursorStyle("crosshair");
        const zr = this.context.getChart().getZr();
        zr.on("click", this.onClick);
        zr.on("mousemove", this.onMouseMove);
      }
      onDeactivate() {
        this.state = "idle";
        this.points = [];
        this.removeGraphic();
        const zr = this.context.getChart().getZr();
        zr.off("click", this.onClick);
        zr.off("mousemove", this.onMouseMove);
        zr.setCursorStyle("default");
      }
      initGraphic() {
        this.graphicGroup = new echarts__namespace.graphic.Group();
        this.context.getChart().getZr().add(this.graphicGroup);
      }
      removeGraphic() {
        if (this.graphicGroup) {
          this.context.getChart().getZr().remove(this.graphicGroup);
          this.graphicGroup = null;
        }
      }
      updateGraphic() {
        if (!this.graphicGroup)
          return;
        this.graphicGroup.removeAll();
        const pts = this.points;
        if (pts.length >= 3)
          this.graphicGroup.add(new echarts__namespace.graphic.Polygon({ shape: { points: pts.slice(0, 3) }, style: { fill: "rgba(33,150,243,0.06)" }, silent: true }));
        if (pts.length >= 5)
          this.graphicGroup.add(new echarts__namespace.graphic.Polygon({ shape: { points: pts.slice(2, 5) }, style: { fill: "rgba(244,67,54,0.08)" }, silent: true }));
        if (pts.length >= 7)
          this.graphicGroup.add(new echarts__namespace.graphic.Polygon({ shape: { points: pts.slice(4, 7) }, style: { fill: "rgba(33,150,243,0.06)" }, silent: true }));
        for (let i = 0; i < pts.length - 1; i++) {
          this.graphicGroup.add(new echarts__namespace.graphic.Line({ shape: { x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1] }, style: { stroke: "#2196f3", lineWidth: 2 }, silent: true }));
        }
        if (pts.length >= 5) {
          const [nx1, ny1] = pts[2];
          const [nx2, ny2] = pts[4];
          const dx = nx2 - nx1;
          const dy = ny2 - ny1;
          this.graphicGroup.add(new echarts__namespace.graphic.Line({ shape: { x1: nx1 - dx * 0.3, y1: ny1 - dy * 0.3, x2: nx2 + dx * 0.3, y2: ny2 + dy * 0.3 }, style: { stroke: "#ff9800", lineWidth: 2, lineDash: [6, 4] }, silent: true }));
        }
        for (let i = 0; i < pts.length && i < LABELS$4.length; i++) {
          const [px, py] = pts[i];
          const isHigh = (i === 0 || py <= pts[i - 1][1]) && (i === pts.length - 1 || py <= pts[i + 1]?.[1]);
          if (LABELS$4[i]) {
            this.graphicGroup.add(new echarts__namespace.graphic.Text({ style: { text: LABELS$4[i], x: px, y: isHigh ? py - 14 : py + 16, fill: "#e2e8f0", fontSize: 12, fontWeight: "bold", align: "center", verticalAlign: "middle" }, silent: true }));
          }
          this.graphicGroup.add(new echarts__namespace.graphic.Circle({ shape: { cx: px, cy: py, r: 4 }, style: { fill: "#fff", stroke: "#3b82f6", lineWidth: 1.5 }, z: 101, silent: true }));
        }
      }
      saveDrawing() {
        const dataPoints = this.points.map((pt) => this.context.coordinateConversion.pixelToData({ x: pt[0], y: pt[1] }));
        if (dataPoints.every((p) => p !== null)) {
          this.context.addDrawing({ id: `hs-${Date.now()}`, type: "head_and_shoulders", points: dataPoints, paneIndex: dataPoints[0].paneIndex || 0, style: { color: "#3b82f6", lineWidth: 2 } });
        }
      }
    }

    var __defProp$4 = Object.defineProperty;
    var __defNormalProp$4 = (obj, key, value) => key in obj ? __defProp$4(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$4 = (obj, key, value) => {
      __defNormalProp$4(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LABELS$3 = ["1", "2", "3", "4", "5"];
    class TrianglePatternDrawingRenderer {
      constructor() {
        __publicField$4(this, "type", "triangle_pattern");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected } = ctx;
        const color = drawing.style?.color || "#3b82f6";
        if (pixelPoints.length < 2)
          return;
        const children = [];
        if (pixelPoints.length >= 3) {
          children.push({
            type: "polygon",
            name: "line",
            shape: { points: pixelPoints.map(([x, y]) => [x, y]) },
            style: { fill: "rgba(156, 39, 176, 0.06)" }
          });
        }
        const upperPts = pixelPoints.filter((_, i) => i % 2 === 0);
        if (upperPts.length >= 2) {
          for (let i = 0; i < upperPts.length - 1; i++) {
            children.push({
              type: "line",
              name: "line",
              shape: { x1: upperPts[i][0], y1: upperPts[i][1], x2: upperPts[i + 1][0], y2: upperPts[i + 1][1] },
              style: { stroke: "#f44336", lineWidth: 2 }
            });
          }
          if (upperPts.length >= 2) {
            const last = upperPts[upperPts.length - 1];
            const prev = upperPts[upperPts.length - 2];
            const dx = last[0] - prev[0];
            const dy = last[1] - prev[1];
            if (dx !== 0) {
              const extendX = last[0] + dx * 0.5;
              const extendY = last[1] + dy * 0.5;
              children.push({
                type: "line",
                shape: { x1: last[0], y1: last[1], x2: extendX, y2: extendY },
                style: { stroke: "#f44336", lineWidth: 1, lineDash: [4, 4] },
                silent: true
              });
            }
          }
        }
        const lowerPts = pixelPoints.filter((_, i) => i % 2 === 1);
        if (lowerPts.length >= 2) {
          for (let i = 0; i < lowerPts.length - 1; i++) {
            children.push({
              type: "line",
              name: "line",
              shape: { x1: lowerPts[i][0], y1: lowerPts[i][1], x2: lowerPts[i + 1][0], y2: lowerPts[i + 1][1] },
              style: { stroke: "#4caf50", lineWidth: 2 }
            });
          }
          if (lowerPts.length >= 2) {
            const last = lowerPts[lowerPts.length - 1];
            const prev = lowerPts[lowerPts.length - 2];
            const dx = last[0] - prev[0];
            const dy = last[1] - prev[1];
            if (dx !== 0) {
              const extendX = last[0] + dx * 0.5;
              const extendY = last[1] + dy * 0.5;
              children.push({
                type: "line",
                shape: { x1: last[0], y1: last[1], x2: extendX, y2: extendY },
                style: { stroke: "#4caf50", lineWidth: 1, lineDash: [4, 4] },
                silent: true
              });
            }
          }
        }
        for (let i = 0; i < pixelPoints.length - 1; i++) {
          children.push({
            type: "line",
            shape: { x1: pixelPoints[i][0], y1: pixelPoints[i][1], x2: pixelPoints[i + 1][0], y2: pixelPoints[i + 1][1] },
            style: { stroke: "#9c27b0", lineWidth: 1, lineDash: [2, 2] },
            silent: true
          });
        }
        for (let i = 0; i < pixelPoints.length && i < LABELS$3.length; i++) {
          const [px, py] = pixelPoints[i];
          const isHigh = i % 2 === 0;
          children.push({ type: "text", style: { text: LABELS$3[i], x: px, y: isHigh ? py - 14 : py + 16, fill: "#e2e8f0", fontSize: 12, fontWeight: "bold", align: "center", verticalAlign: "middle" }, silent: true });
        }
        for (let i = 0; i < pixelPoints.length; i++) {
          children.push({ type: "circle", name: `point-${i}`, shape: { cx: pixelPoints[i][0], cy: pixelPoints[i][1], r: 4 }, style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }, z: 100 });
        }
        return { type: "group", children };
      }
    }

    var __defProp$3 = Object.defineProperty;
    var __defNormalProp$3 = (obj, key, value) => key in obj ? __defProp$3(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$3 = (obj, key, value) => {
      __defNormalProp$3(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LABELS$2 = ["1", "2", "3", "4", "5"];
    const TOTAL_POINTS$1 = 5;
    class TrianglePatternTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "triangle-pattern-tool",
          name: options.name || "Triangle Pattern",
          icon: options.icon || `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#e3e3e3" stroke-width="1.5"><path d="M2,4 L22,4 L12,20 Z"/></svg>`
        });
        __publicField$3(this, "points", []);
        __publicField$3(this, "state", "idle");
        __publicField$3(this, "graphicGroup", null);
        __publicField$3(this, "onClick", (params) => {
          const pt = this.getPoint(params);
          if (this.state === "idle") {
            this.state = "drawing";
            this.points = [pt, [...pt]];
            this.initGraphic();
            this.updateGraphic();
          } else if (this.state === "drawing") {
            this.points[this.points.length - 1] = pt;
            if (this.points.length >= TOTAL_POINTS$1) {
              this.state = "finished";
              this.updateGraphic();
              this.saveDrawing();
              this.removeGraphic();
              this.context.disableTools();
            } else {
              this.points.push([...pt]);
              this.updateGraphic();
            }
          }
        });
        __publicField$3(this, "onMouseMove", (params) => {
          if (this.state !== "drawing" || this.points.length < 2)
            return;
          this.points[this.points.length - 1] = this.getPoint(params);
          this.updateGraphic();
        });
      }
      onInit() {
        this.context.registerDrawingRenderer(new TrianglePatternDrawingRenderer());
      }
      onActivate() {
        this.state = "idle";
        this.points = [];
        this.context.getChart().getZr().setCursorStyle("crosshair");
        const zr = this.context.getChart().getZr();
        zr.on("click", this.onClick);
        zr.on("mousemove", this.onMouseMove);
      }
      onDeactivate() {
        this.state = "idle";
        this.points = [];
        this.removeGraphic();
        const zr = this.context.getChart().getZr();
        zr.off("click", this.onClick);
        zr.off("mousemove", this.onMouseMove);
        zr.setCursorStyle("default");
      }
      initGraphic() {
        this.graphicGroup = new echarts__namespace.graphic.Group();
        this.context.getChart().getZr().add(this.graphicGroup);
      }
      removeGraphic() {
        if (this.graphicGroup) {
          this.context.getChart().getZr().remove(this.graphicGroup);
          this.graphicGroup = null;
        }
      }
      updateGraphic() {
        if (!this.graphicGroup)
          return;
        this.graphicGroup.removeAll();
        const pts = this.points;
        if (pts.length >= 3)
          this.graphicGroup.add(new echarts__namespace.graphic.Polygon({ shape: { points: pts }, style: { fill: "rgba(156,39,176,0.06)" }, silent: true }));
        for (let i = 0; i < pts.length - 1; i++) {
          this.graphicGroup.add(new echarts__namespace.graphic.Line({ shape: { x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1] }, style: { stroke: "#9c27b0", lineWidth: 2 }, silent: true }));
        }
        const upper = pts.filter((_, i) => i % 2 === 0);
        if (upper.length >= 2) {
          for (let i = 0; i < upper.length - 1; i++) {
            this.graphicGroup.add(new echarts__namespace.graphic.Line({ shape: { x1: upper[i][0], y1: upper[i][1], x2: upper[i + 1][0], y2: upper[i + 1][1] }, style: { stroke: "#f44336", lineWidth: 1, lineDash: [4, 4] }, silent: true }));
          }
        }
        const lower = pts.filter((_, i) => i % 2 === 1);
        if (lower.length >= 2) {
          for (let i = 0; i < lower.length - 1; i++) {
            this.graphicGroup.add(new echarts__namespace.graphic.Line({ shape: { x1: lower[i][0], y1: lower[i][1], x2: lower[i + 1][0], y2: lower[i + 1][1] }, style: { stroke: "#4caf50", lineWidth: 1, lineDash: [4, 4] }, silent: true }));
          }
        }
        for (let i = 0; i < pts.length && i < LABELS$2.length; i++) {
          const [px, py] = pts[i];
          const isHigh = i % 2 === 0;
          this.graphicGroup.add(new echarts__namespace.graphic.Text({ style: { text: LABELS$2[i], x: px, y: isHigh ? py - 14 : py + 16, fill: "#e2e8f0", fontSize: 12, fontWeight: "bold", align: "center", verticalAlign: "middle" }, silent: true }));
          this.graphicGroup.add(new echarts__namespace.graphic.Circle({ shape: { cx: px, cy: py, r: 4 }, style: { fill: "#fff", stroke: "#3b82f6", lineWidth: 1.5 }, z: 101, silent: true }));
        }
      }
      saveDrawing() {
        const dataPoints = this.points.map((pt) => this.context.coordinateConversion.pixelToData({ x: pt[0], y: pt[1] }));
        if (dataPoints.every((p) => p !== null)) {
          this.context.addDrawing({ id: `triangle-${Date.now()}`, type: "triangle_pattern", points: dataPoints, paneIndex: dataPoints[0].paneIndex || 0, style: { color: "#3b82f6", lineWidth: 2 } });
        }
      }
    }

    var __defProp$2 = Object.defineProperty;
    var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$2 = (obj, key, value) => {
      __defNormalProp$2(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LABELS$1 = ["0", "D1", "C1", "D2", "C2", "D3", ""];
    const LEG_COLORS$1 = ["#2196f3", "#ff9800", "#4caf50", "#f44336", "#00bcd4", "#e91e63"];
    class ThreeDrivesPatternDrawingRenderer {
      constructor() {
        __publicField$2(this, "type", "three_drives_pattern");
      }
      render(ctx) {
        const { drawing, pixelPoints, isSelected } = ctx;
        const color = drawing.style?.color || "#3b82f6";
        if (pixelPoints.length < 2)
          return;
        const children = [];
        if (pixelPoints.length >= 3) {
          children.push({ type: "polygon", name: "line", shape: { points: pixelPoints.slice(0, 3).map(([x, y]) => [x, y]) }, style: { fill: "rgba(33, 150, 243, 0.06)" } });
        }
        if (pixelPoints.length >= 5) {
          children.push({ type: "polygon", name: "line", shape: { points: pixelPoints.slice(2, 5).map(([x, y]) => [x, y]) }, style: { fill: "rgba(76, 175, 80, 0.06)" } });
        }
        if (pixelPoints.length >= 7) {
          children.push({ type: "polygon", name: "line", shape: { points: pixelPoints.slice(4, 7).map(([x, y]) => [x, y]) }, style: { fill: "rgba(0, 188, 212, 0.06)" } });
        }
        for (let i = 0; i < pixelPoints.length - 1; i++) {
          const [x1, y1] = pixelPoints[i];
          const [x2, y2] = pixelPoints[i + 1];
          children.push({
            type: "line",
            name: "line",
            shape: { x1, y1, x2, y2 },
            style: { stroke: LEG_COLORS$1[i % LEG_COLORS$1.length], lineWidth: drawing.style?.lineWidth || 2 }
          });
        }
        const connectors = [[1, 3], [3, 5], [2, 4]];
        for (const [from, to] of connectors) {
          if (from < pixelPoints.length && to < pixelPoints.length) {
            children.push({
              type: "line",
              shape: { x1: pixelPoints[from][0], y1: pixelPoints[from][1], x2: pixelPoints[to][0], y2: pixelPoints[to][1] },
              style: { stroke: "#555", lineWidth: 1, lineDash: [4, 4] },
              silent: true
            });
          }
        }
        const pts = drawing.points;
        if (pts.length >= 4) {
          const d1 = Math.abs(pts[1].value - pts[0].value);
          const d2 = Math.abs(pts[3].value - pts[2].value);
          if (d1 !== 0) {
            const r = (d2 / d1).toFixed(3);
            const mx = (pixelPoints[2][0] + pixelPoints[3][0]) / 2;
            const my = (pixelPoints[2][1] + pixelPoints[3][1]) / 2;
            children.push({ type: "text", style: { text: `D2/D1: ${r}`, x: mx + 10, y: my, fill: "#4caf50", fontSize: 9 }, silent: true });
          }
        }
        if (pts.length >= 6) {
          const d2 = Math.abs(pts[3].value - pts[2].value);
          const d3 = Math.abs(pts[5].value - pts[4].value);
          if (d2 !== 0) {
            const r = (d3 / d2).toFixed(3);
            const mx = (pixelPoints[4][0] + pixelPoints[5][0]) / 2;
            const my = (pixelPoints[4][1] + pixelPoints[5][1]) / 2;
            children.push({ type: "text", style: { text: `D3/D2: ${r}`, x: mx + 10, y: my, fill: "#00bcd4", fontSize: 9 }, silent: true });
          }
        }
        if (pts.length >= 3) {
          const d1 = Math.abs(pts[1].value - pts[0].value);
          const c1 = Math.abs(pts[2].value - pts[1].value);
          if (d1 !== 0) {
            const r = (c1 / d1).toFixed(3);
            const mx = (pixelPoints[1][0] + pixelPoints[2][0]) / 2;
            const my = (pixelPoints[1][1] + pixelPoints[2][1]) / 2;
            children.push({ type: "text", style: { text: r, x: mx + 8, y: my, fill: "#ff9800", fontSize: 10 }, silent: true });
          }
        }
        for (let i = 0; i < pixelPoints.length && i < LABELS$1.length; i++) {
          if (!LABELS$1[i])
            continue;
          const [px, py] = pixelPoints[i];
          const isHigh = (i === 0 || py <= pixelPoints[i - 1][1]) && (i === pixelPoints.length - 1 || py <= pixelPoints[i + 1]?.[1]);
          children.push({ type: "text", style: { text: LABELS$1[i], x: px, y: isHigh ? py - 14 : py + 16, fill: "#e2e8f0", fontSize: 11, fontWeight: "bold", align: "center", verticalAlign: "middle" }, silent: true });
        }
        for (let i = 0; i < pixelPoints.length; i++) {
          children.push({ type: "circle", name: `point-${i}`, shape: { cx: pixelPoints[i][0], cy: pixelPoints[i][1], r: 4 }, style: { fill: "#fff", stroke: color, lineWidth: 1, opacity: isSelected ? 1 : 0 }, z: 100 });
        }
        return { type: "group", children };
      }
    }

    var __defProp$1 = Object.defineProperty;
    var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField$1 = (obj, key, value) => {
      __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    const LABELS = ["0", "D1", "C1", "D2", "C2", "D3", ""];
    const LEG_COLORS = ["#2196f3", "#ff9800", "#4caf50", "#f44336", "#00bcd4", "#e91e63"];
    const TOTAL_POINTS = 7;
    class ThreeDrivesPatternTool extends AbstractPlugin {
      constructor(options = {}) {
        super({
          id: "three-drives-pattern-tool",
          name: options.name || "Three Drives",
          icon: options.icon || `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#e3e3e3" stroke-width="1.5"><polyline points="1,20 4,8 7,14 11,5 15,12 19,2 23,10"/></svg>`
        });
        __publicField$1(this, "points", []);
        __publicField$1(this, "state", "idle");
        __publicField$1(this, "graphicGroup", null);
        __publicField$1(this, "onClick", (params) => {
          const pt = this.getPoint(params);
          if (this.state === "idle") {
            this.state = "drawing";
            this.points = [pt, [...pt]];
            this.initGraphic();
            this.updateGraphic();
          } else if (this.state === "drawing") {
            this.points[this.points.length - 1] = pt;
            if (this.points.length >= TOTAL_POINTS) {
              this.state = "finished";
              this.updateGraphic();
              this.saveDrawing();
              this.removeGraphic();
              this.context.disableTools();
            } else {
              this.points.push([...pt]);
              this.updateGraphic();
            }
          }
        });
        __publicField$1(this, "onMouseMove", (params) => {
          if (this.state !== "drawing" || this.points.length < 2)
            return;
          this.points[this.points.length - 1] = this.getPoint(params);
          this.updateGraphic();
        });
      }
      onInit() {
        this.context.registerDrawingRenderer(new ThreeDrivesPatternDrawingRenderer());
      }
      onActivate() {
        this.state = "idle";
        this.points = [];
        this.context.getChart().getZr().setCursorStyle("crosshair");
        const zr = this.context.getChart().getZr();
        zr.on("click", this.onClick);
        zr.on("mousemove", this.onMouseMove);
      }
      onDeactivate() {
        this.state = "idle";
        this.points = [];
        this.removeGraphic();
        const zr = this.context.getChart().getZr();
        zr.off("click", this.onClick);
        zr.off("mousemove", this.onMouseMove);
        zr.setCursorStyle("default");
      }
      initGraphic() {
        this.graphicGroup = new echarts__namespace.graphic.Group();
        this.context.getChart().getZr().add(this.graphicGroup);
      }
      removeGraphic() {
        if (this.graphicGroup) {
          this.context.getChart().getZr().remove(this.graphicGroup);
          this.graphicGroup = null;
        }
      }
      updateGraphic() {
        if (!this.graphicGroup)
          return;
        this.graphicGroup.removeAll();
        const pts = this.points;
        if (pts.length >= 3)
          this.graphicGroup.add(new echarts__namespace.graphic.Polygon({ shape: { points: pts.slice(0, 3) }, style: { fill: "rgba(33,150,243,0.06)" }, silent: true }));
        if (pts.length >= 5)
          this.graphicGroup.add(new echarts__namespace.graphic.Polygon({ shape: { points: pts.slice(2, 5) }, style: { fill: "rgba(76,175,80,0.06)" }, silent: true }));
        if (pts.length >= 7)
          this.graphicGroup.add(new echarts__namespace.graphic.Polygon({ shape: { points: pts.slice(4, 7) }, style: { fill: "rgba(0,188,212,0.06)" }, silent: true }));
        for (let i = 0; i < pts.length - 1; i++) {
          this.graphicGroup.add(new echarts__namespace.graphic.Line({ shape: { x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1] }, style: { stroke: LEG_COLORS[i % LEG_COLORS.length], lineWidth: 2 }, silent: true }));
        }
        const conn = [[1, 3], [3, 5], [2, 4]];
        for (const [f, t] of conn) {
          if (f < pts.length && t < pts.length) {
            this.graphicGroup.add(new echarts__namespace.graphic.Line({ shape: { x1: pts[f][0], y1: pts[f][1], x2: pts[t][0], y2: pts[t][1] }, style: { stroke: "#555", lineWidth: 1, lineDash: [4, 4] }, silent: true }));
          }
        }
        for (let i = 0; i < pts.length && i < LABELS.length; i++) {
          const [px, py] = pts[i];
          const isHigh = (i === 0 || py <= pts[i - 1][1]) && (i === pts.length - 1 || py <= pts[i + 1]?.[1]);
          if (LABELS[i]) {
            this.graphicGroup.add(new echarts__namespace.graphic.Text({ style: { text: LABELS[i], x: px, y: isHigh ? py - 14 : py + 16, fill: "#e2e8f0", fontSize: 11, fontWeight: "bold", align: "center", verticalAlign: "middle" }, silent: true }));
          }
          this.graphicGroup.add(new echarts__namespace.graphic.Circle({ shape: { cx: px, cy: py, r: 4 }, style: { fill: "#fff", stroke: "#3b82f6", lineWidth: 1.5 }, z: 101, silent: true }));
        }
      }
      saveDrawing() {
        const dataPoints = this.points.map((pt) => this.context.coordinateConversion.pixelToData({ x: pt[0], y: pt[1] }));
        if (dataPoints.every((p) => p !== null)) {
          this.context.addDrawing({ id: `3drives-${Date.now()}`, type: "three_drives_pattern", points: dataPoints, paneIndex: dataPoints[0].paneIndex || 0, style: { color: "#3b82f6", lineWidth: 2 } });
        }
      }
    }

    var __defProp = Object.defineProperty;
    var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
    var __publicField = (obj, key, value) => {
      __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
      return value;
    };
    class ToolGroup extends AbstractPlugin {
      constructor(config) {
        const arrowSvg = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; right: -4px; top: 50%; transform: translateY(-50%); opacity: 0.6;"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
        let enhancedIcon = "";
        if (config.icon) {
          enhancedIcon = `<div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    ${config.icon}
                </div>
                ${arrowSvg}
            </div>`;
        } else {
          enhancedIcon = `<div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                <span>${config.name.substring(0, 2).toUpperCase()}</span>
                ${arrowSvg}
            </div>`;
        }
        super({
          id: config.id || `group-${config.name.toLowerCase().replace(/\s+/g, "-")}`,
          name: config.name,
          icon: enhancedIcon
        });
        __publicField(this, "plugins", []);
        __publicField(this, "activeSubPlugin", null);
        __publicField(this, "menuElement", null);
        __publicField(this, "buttonElement", null);
        __publicField(this, "originalIcon", "");
        __publicField(this, "arrowSvg", "");
        __publicField(this, "handleOutsideClick", (e) => {
          if (this.menuElement && !this.menuElement.contains(e.target)) {
            this.hideMenu();
            if (!this.activeSubPlugin) {
              this.buttonElement?.click();
            }
          }
        });
        this.originalIcon = enhancedIcon;
        this.arrowSvg = arrowSvg;
      }
      add(plugin) {
        this.plugins.push(plugin);
      }
      onInit() {
        this.plugins.forEach((p) => p.init(this.context));
      }
      onActivate() {
        this.showMenu();
      }
      onDeactivate() {
        this.hideMenu();
        if (this.activeSubPlugin) {
          this.activeSubPlugin.deactivate?.();
          this.activeSubPlugin = null;
        }
        if (this.buttonElement) {
          this.buttonElement.innerHTML = this.originalIcon;
        }
      }
      onDestroy() {
        this.hideMenu();
        this.plugins.forEach((p) => p.destroy?.());
      }
      showMenu() {
        this.buttonElement = document.getElementById(`qfchart-plugin-btn-${this.id}`);
        if (!this.buttonElement)
          return;
        if (this.menuElement) {
          this.hideMenu();
        }
        this.menuElement = document.createElement("div");
        Object.assign(this.menuElement.style, {
          position: "fixed",
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "6px",
          padding: "4px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          zIndex: "10000",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
          minWidth: "150px"
        });
        this.plugins.forEach((plugin) => {
          const item = document.createElement("div");
          Object.assign(item.style, {
            display: "flex",
            alignItems: "center",
            padding: "8px 12px",
            cursor: "pointer",
            color: "#cbd5e1",
            borderRadius: "4px",
            fontSize: "13px",
            fontFamily: this.context.getOptions().fontFamily || "sans-serif",
            transition: "background-color 0.2s"
          });
          item.addEventListener("mouseenter", () => {
            item.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
          });
          item.addEventListener("mouseleave", () => {
            item.style.backgroundColor = "transparent";
          });
          if (plugin.icon) {
            const iconContainer = document.createElement("div");
            iconContainer.innerHTML = plugin.icon;
            Object.assign(iconContainer.style, {
              width: "20px",
              height: "20px",
              marginRight: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            });
            const svg = iconContainer.querySelector("svg");
            if (svg) {
              svg.style.width = "100%";
              svg.style.height = "100%";
            }
            item.appendChild(iconContainer);
          }
          const nameSpan = document.createElement("span");
          nameSpan.textContent = plugin.name || plugin.id;
          item.appendChild(nameSpan);
          item.addEventListener("click", (e) => {
            e.stopPropagation();
            this.activateSubPlugin(plugin);
          });
          this.menuElement.appendChild(item);
        });
        document.body.appendChild(this.menuElement);
        const rect = this.buttonElement.getBoundingClientRect();
        this.menuElement.style.top = `${rect.top}px`;
        this.menuElement.style.left = `${rect.right + 5}px`;
        setTimeout(() => {
          document.addEventListener("click", this.handleOutsideClick);
        }, 0);
      }
      hideMenu() {
        if (this.menuElement && this.menuElement.parentNode) {
          this.menuElement.parentNode.removeChild(this.menuElement);
        }
        this.menuElement = null;
        document.removeEventListener("click", this.handleOutsideClick);
      }
      activateSubPlugin(plugin) {
        this.hideMenu();
        if (this.activeSubPlugin) {
          this.activeSubPlugin.deactivate?.();
        }
        this.activeSubPlugin = plugin;
        this.activeSubPlugin.activate?.();
        if (this.buttonElement) {
          let subIcon = "";
          if (plugin.icon) {
            subIcon = `<div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                        ${plugin.icon}
                    </div>
                    ${this.arrowSvg}
                </div>`;
          } else {
            subIcon = `<div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    <span>${(plugin.name || plugin.id).substring(0, 2).toUpperCase()}</span>
                    ${this.arrowSvg}
                </div>`;
          }
          this.buttonElement.innerHTML = subIcon;
        }
      }
    }

    exports.ABCDPatternDrawingRenderer = ABCDPatternDrawingRenderer;
    exports.ABCDPatternTool = ABCDPatternTool;
    exports.AbstractPlugin = AbstractPlugin;
    exports.CrossLineDrawingRenderer = CrossLineDrawingRenderer;
    exports.CrossLineTool = CrossLineTool;
    exports.CypherPatternDrawingRenderer = CypherPatternDrawingRenderer;
    exports.CypherPatternTool = CypherPatternTool;
    exports.DrawingRendererRegistry = DrawingRendererRegistry;
    exports.ExtendedLineDrawingRenderer = ExtendedLineDrawingRenderer;
    exports.ExtendedLineTool = ExtendedLineTool;
    exports.FibSpeedResistanceFanDrawingRenderer = FibSpeedResistanceFanDrawingRenderer;
    exports.FibSpeedResistanceFanTool = FibSpeedResistanceFanTool;
    exports.FibTrendExtensionDrawingRenderer = FibTrendExtensionDrawingRenderer;
    exports.FibTrendExtensionTool = FibTrendExtensionTool;
    exports.FibonacciChannelDrawingRenderer = FibonacciChannelDrawingRenderer;
    exports.FibonacciChannelTool = FibonacciChannelTool;
    exports.FibonacciDrawingRenderer = FibonacciDrawingRenderer;
    exports.FibonacciTool = FibonacciTool;
    exports.HeadAndShouldersDrawingRenderer = HeadAndShouldersDrawingRenderer;
    exports.HeadAndShouldersTool = HeadAndShouldersTool;
    exports.HorizontalLineDrawingRenderer = HorizontalLineDrawingRenderer;
    exports.HorizontalLineTool = HorizontalLineTool;
    exports.HorizontalRayDrawingRenderer = HorizontalRayDrawingRenderer;
    exports.HorizontalRayTool = HorizontalRayTool;
    exports.InfoLineDrawingRenderer = InfoLineDrawingRenderer;
    exports.InfoLineTool = InfoLineTool;
    exports.LineDrawingRenderer = LineDrawingRenderer;
    exports.LineTool = LineTool;
    exports.MeasureTool = MeasureTool;
    exports.QFChart = QFChart;
    exports.RayDrawingRenderer = RayDrawingRenderer;
    exports.RayTool = RayTool;
    exports.ThreeDrivesPatternDrawingRenderer = ThreeDrivesPatternDrawingRenderer;
    exports.ThreeDrivesPatternTool = ThreeDrivesPatternTool;
    exports.ToolGroup = ToolGroup;
    exports.TrendAngleDrawingRenderer = TrendAngleDrawingRenderer;
    exports.TrendAngleTool = TrendAngleTool;
    exports.TrianglePatternDrawingRenderer = TrianglePatternDrawingRenderer;
    exports.TrianglePatternTool = TrianglePatternTool;
    exports.VerticalLineDrawingRenderer = VerticalLineDrawingRenderer;
    exports.VerticalLineTool = VerticalLineTool;
    exports.XABCDPatternDrawingRenderer = XABCDPatternDrawingRenderer;
    exports.XABCDPatternTool = XABCDPatternTool;

}));
//# sourceMappingURL=qfchart.dev.browser.js.map
