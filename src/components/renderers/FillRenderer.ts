import { SeriesRenderer, RenderContext } from './SeriesRenderer';
import { ColorUtils } from '../../utils/ColorUtils';

/**
 * Configuration for a single fill band within a batched render.
 */
export interface BatchedFillEntry {
    plot1Data: (number | null)[];
    plot2Data: (number | null)[];
    barColors: { color: string; opacity: number }[];
}

export class FillRenderer implements SeriesRenderer {
    render(context: RenderContext): any {
        const { seriesName, xAxisIndex, yAxisIndex, plotOptions, plotDataArrays, indicatorId, plotName, optionsArray } = context;
        const totalDataLength = context.dataArray.length; // Use length from dataArray placeholder

        // Fill plots reference other plots to fill the area between them
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

        // Detect gradient fill mode
        const isGradient = plotOptions.gradient === true;

        if (isGradient) {
            return this.renderGradientFill(
                seriesName, xAxisIndex, yAxisIndex,
                plot1Data, plot2Data, totalDataLength,
                optionsArray, plotOptions
            );
        }

        // --- Simple fill (supports per-bar color when color is a series) ---
        const { color: defaultFillColor, opacity: defaultFillOpacity } = ColorUtils.parseColor(plotOptions.color || 'rgba(128, 128, 128, 0.2)');

        // Check if we have per-bar color data in optionsArray
        const hasPerBarColor = optionsArray?.some((o: any) => o && o.color !== undefined);

        // Pre-parse per-bar colors for efficiency
        let barColors: { color: string; opacity: number }[] | null = null;
        if (hasPerBarColor) {
            barColors = [];
            for (let i = 0; i < totalDataLength; i++) {
                const opts = optionsArray?.[i];
                if (opts && opts.color !== undefined) {
                    barColors[i] = ColorUtils.parseColor(opts.color);
                } else {
                    barColors[i] = { color: defaultFillColor, opacity: defaultFillOpacity };
                }
            }
        }

        // Create fill data with previous values for smooth polygon rendering
        const fillDataWithPrev: any[] = [];
        for (let i = 0; i < totalDataLength; i++) {
            const y1 = plot1Data[i];
            const y2 = plot2Data[i];
            const prevY1 = i > 0 ? plot1Data[i - 1] : null;
            const prevY2 = i > 0 ? plot2Data[i - 1] : null;

            fillDataWithPrev.push([i, y1, y2, prevY1, prevY2]);
        }

        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            z: 1,
            clip: true,
            encode: { x: 0 },
            animation: false,
            renderItem: (params: any, api: any) => {
                const index = params.dataIndex;
                if (index === 0) return null;

                const y1 = api.value(1);
                const y2 = api.value(2);
                const prevY1 = api.value(3);
                const prevY2 = api.value(4);

                if (
                    y1 === null || y2 === null || prevY1 === null || prevY2 === null ||
                    isNaN(y1) || isNaN(y2) || isNaN(prevY1) || isNaN(prevY2)
                ) {
                    return null;
                }

                const fc = barColors ? barColors[index] : null;

                // Skip fully transparent fills
                const fillOpacity = fc ? fc.opacity : defaultFillOpacity;
                if (fillOpacity < 0.01) return null;

                const p1Prev = api.coord([index - 1, prevY1]);
                const p1Curr = api.coord([index, y1]);
                const p2Curr = api.coord([index, y2]);
                const p2Prev = api.coord([index - 1, prevY2]);

                return {
                    type: 'polygon',
                    shape: {
                        points: [p1Prev, p1Curr, p2Curr, p2Prev],
                    },
                    style: {
                        fill: fc ? fc.color : defaultFillColor,
                        opacity: fillOpacity,
                    },
                    silent: true,
                };
            },
            data: fillDataWithPrev,
            silent: true,
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
    renderBatched(
        seriesName: string,
        xAxisIndex: number,
        yAxisIndex: number,
        totalDataLength: number,
        fills: BatchedFillEntry[]
    ): any {
        // Simple index-only data for ECharts — encode: {x:0} enables dataZoom filtering
        const data = Array.from({ length: totalDataLength }, (_, i) => [i]);

        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex,
            yAxisIndex,
            z: 1,
            clip: true,
            encode: { x: 0 },
            animation: false,
            renderItem: (params: any, api: any) => {
                const index = params.dataIndex;
                if (index === 0) return null;

                const children: any[] = [];

                for (let f = 0; f < fills.length; f++) {
                    const fill = fills[f];
                    const y1 = fill.plot1Data[index];
                    const y2 = fill.plot2Data[index];
                    const prevY1 = fill.plot1Data[index - 1];
                    const prevY2 = fill.plot2Data[index - 1];

                    if (
                        y1 == null || y2 == null || prevY1 == null || prevY2 == null ||
                        isNaN(y1 as number) || isNaN(y2 as number) ||
                        isNaN(prevY1 as number) || isNaN(prevY2 as number)
                    ) {
                        continue;
                    }

                    // Skip fully transparent fills
                    const fc = fill.barColors[index];
                    if (!fc || fc.opacity < 0.01) continue;

                    const p1Prev = api.coord([index - 1, prevY1]);
                    const p1Curr = api.coord([index, y1]);
                    const p2Curr = api.coord([index, y2]);
                    const p2Prev = api.coord([index - 1, prevY2]);

                    children.push({
                        type: 'polygon',
                        shape: { points: [p1Prev, p1Curr, p2Curr, p2Prev] },
                        style: { fill: fc.color, opacity: fc.opacity },
                        silent: true,
                    });
                }

                return children.length > 0 ? { type: 'group', children, silent: true } : null;
            },
            data,
            silent: true,
        };
    }

    /**
     * Render a gradient fill between two plots.
     * Uses per-bar top_value/bottom_value as the actual Y boundaries (not the raw plot values).
     * A vertical linear gradient goes from top_color (at top_value) to bottom_color (at bottom_value).
     * When top_value or bottom_value is na/NaN, the fill is hidden for that bar.
     */
    private renderGradientFill(
        seriesName: string,
        xAxisIndex: number,
        yAxisIndex: number,
        plot1Data: (number | null)[],
        plot2Data: (number | null)[],
        totalDataLength: number,
        optionsArray: any[],
        plotOptions: any
    ): any {
        // Build per-bar gradient data from optionsArray
        // Each entry has: { top_value, bottom_value, top_color, bottom_color }
        interface GradientBar {
            topValue: number | null;
            bottomValue: number | null;
            topColor: string;
            topOpacity: number;
            bottomColor: string;
            bottomOpacity: number;
        }
        const gradientBars: (GradientBar | null)[] = [];

        for (let i = 0; i < totalDataLength; i++) {
            const opts = optionsArray?.[i];
            if (opts && opts.top_color !== undefined) {
                const tv = opts.top_value;
                const bv = opts.bottom_value;
                // na/NaN/null/undefined → null (hidden bar)
                const topVal = (tv == null || (typeof tv === 'number' && isNaN(tv))) ? null : tv;
                const btmVal = (bv == null || (typeof bv === 'number' && isNaN(bv))) ? null : bv;

                const top = ColorUtils.parseColor(opts.top_color);
                const bottom = ColorUtils.parseColor(opts.bottom_color);
                gradientBars[i] = {
                    topValue: topVal,
                    bottomValue: btmVal,
                    topColor: top.color,
                    topOpacity: top.opacity,
                    bottomColor: bottom.color,
                    bottomOpacity: bottom.opacity,
                };
            } else {
                gradientBars[i] = null;
            }
        }

        // Create fill data using top_value/bottom_value as Y boundaries
        const fillData: any[] = [];
        for (let i = 0; i < totalDataLength; i++) {
            const gb = gradientBars[i];
            const prevGb = i > 0 ? gradientBars[i - 1] : null;
            const topY = gb?.topValue ?? null;
            const btmY = gb?.bottomValue ?? null;
            const prevTopY = prevGb?.topValue ?? null;
            const prevBtmY = prevGb?.bottomValue ?? null;
            fillData.push([i, topY, btmY, prevTopY, prevBtmY]);
        }

        return {
            name: seriesName,
            type: 'custom',
            xAxisIndex: xAxisIndex,
            yAxisIndex: yAxisIndex,
            z: 1,
            clip: true,
            encode: { x: 0 },
            animation: false,
            renderItem: (params: any, api: any) => {
                const index = params.dataIndex;
                if (index === 0) return null;

                const topY = api.value(1);
                const btmY = api.value(2);
                const prevTopY = api.value(3);
                const prevBtmY = api.value(4);

                // Skip when any boundary is na (hidden bar)
                if (
                    topY == null || btmY == null || prevTopY == null || prevBtmY == null ||
                    isNaN(topY) || isNaN(btmY) || isNaN(prevTopY) || isNaN(prevBtmY)
                ) {
                    return null;
                }

                // Get gradient colors for this bar
                const gb = gradientBars[index];
                if (!gb) return null;

                // Skip fully transparent gradient fills
                if (gb.topOpacity < 0.01 && gb.bottomOpacity < 0.01) return null;

                const topRgba = ColorUtils.toRgba(gb.topColor, gb.topOpacity);
                const bottomRgba = ColorUtils.toRgba(gb.bottomColor, gb.bottomOpacity);

                const pTopPrev = api.coord([index - 1, prevTopY]);
                const pTopCurr = api.coord([index, topY]);
                const pBtmCurr = api.coord([index, btmY]);
                const pBtmPrev = api.coord([index - 1, prevBtmY]);

                return {
                    type: 'polygon',
                    shape: {
                        points: [pTopPrev, pTopCurr, pBtmCurr, pBtmPrev],
                    },
                    style: {
                        fill: {
                            type: 'linear',
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: topRgba },
                                { offset: 1, color: bottomRgba },
                            ],
                        },
                    },
                    silent: true,
                };
            },
            data: fillData,
            silent: true,
        };
    }

}
