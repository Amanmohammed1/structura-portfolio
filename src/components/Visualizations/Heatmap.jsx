import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import './Visualizations.css';

/**
 * Correlation Heatmap visualization using D3
 * Shows correlation matrix sorted by cluster order
 */
export function Heatmap({
    correlationMatrix,
    symbols,
    sortOrder = null,
    width = 600,
    height = 600
}) {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!correlationMatrix || !symbols || !svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Apply sort order if provided
        const orderedSymbols = sortOrder
            ? sortOrder.map(i => symbols[i])
            : symbols;

        const orderedMatrix = sortOrder
            ? sortOrder.map(i => sortOrder.map(j => correlationMatrix[i][j]))
            : correlationMatrix;

        const n = orderedSymbols.length;
        const margin = { top: 80, right: 20, bottom: 20, left: 80 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const cellSize = Math.min(innerWidth, innerHeight) / n;

        const g = svg
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Color scale: red (negative) -> white (0) -> green (positive)
        const colorScale = d3.scaleDiverging(d3.interpolateRdYlGn)
            .domain([-1, 0, 1]);

        // Create cells
        const cells = g.selectAll('.cell')
            .data(orderedMatrix.flatMap((row, i) =>
                row.map((value, j) => ({ i, j, value }))
            ))
            .join('rect')
            .attr('class', 'heatmap-cell')
            .attr('x', d => d.j * cellSize)
            .attr('y', d => d.i * cellSize)
            .attr('width', cellSize - 1)
            .attr('height', cellSize - 1)
            .attr('fill', d => colorScale(d.value))
            .attr('rx', 2);

        // Add hover interactions
        cells
            .attr('title', d => `${orderedSymbols[d.i]} × ${orderedSymbols[d.j]}: ${d.value.toFixed(3)}`)
            .on('mouseenter', function (event, d) {
                d3.select(this)
                    .attr('stroke', 'var(--accent-yellow)')
                    .attr('stroke-width', 2);

                // Use container-scoped tooltip
                const container = d3.select(svgRef.current.parentNode);
                const tooltip = container.select('.heatmap-tooltip');
                if (!tooltip.empty()) {
                    tooltip
                        .style('opacity', 1)
                        .style('left', `${event.clientX + 15}px`)
                        .style('top', `${event.clientY - 10}px`)
                        .html(`
              <strong>${orderedSymbols[d.i]} × ${orderedSymbols[d.j]}</strong>
              <br/>Correlation: <span class="${d.value > 0 ? 'positive' : 'negative'}">${d.value.toFixed(3)}</span>
            `);
                }
            })
            .on('mouseleave', function () {
                d3.select(this)
                    .attr('stroke', 'none');

                const container = d3.select(svgRef.current.parentNode);
                container.select('.heatmap-tooltip').style('opacity', 0);
            });

        // Add row labels (left)
        g.selectAll('.row-label')
            .data(orderedSymbols)
            .join('text')
            .attr('class', 'heatmap-label')
            .attr('x', -6)
            .attr('y', (d, i) => i * cellSize + cellSize / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .text(d => d.replace('.BSE', ''));

        // Add column labels (top, rotated)
        g.selectAll('.col-label')
            .data(orderedSymbols)
            .join('text')
            .attr('class', 'heatmap-label')
            .attr('x', (d, i) => i * cellSize + cellSize / 2)
            .attr('y', -6)
            .attr('text-anchor', 'start')
            .attr('transform', (d, i) => `rotate(-45, ${i * cellSize + cellSize / 2}, -6)`)
            .text(d => d.replace('.BSE', ''));

        // Add color legend
        const legendWidth = 200;
        const legendHeight = 10;

        const legend = svg.append('g')
            .attr('transform', `translate(${width - legendWidth - 20}, 20)`);

        const legendScale = d3.scaleLinear()
            .domain([-1, 1])
            .range([0, legendWidth]);

        const legendAxis = d3.axisBottom(legendScale)
            .ticks(5)
            .tickSize(legendHeight + 3);

        // Gradient for legend
        const defs = svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'heatmap-gradient');

        gradient.selectAll('stop')
            .data([
                { offset: '0%', color: colorScale(-1) },
                { offset: '50%', color: colorScale(0) },
                { offset: '100%', color: colorScale(1) },
            ])
            .join('stop')
            .attr('offset', d => d.offset)
            .attr('stop-color', d => d.color);

        legend.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .attr('fill', 'url(#heatmap-gradient)')
            .attr('rx', 2);

        legend.append('g')
            .attr('class', 'legend-axis')
            .call(legendAxis);

    }, [correlationMatrix, symbols, sortOrder, width, height]);

    if (!correlationMatrix || !symbols) {
        return (
            <div className="viz-placeholder">
                <span className="terminal-loader">Waiting for data</span>
            </div>
        );
    }

    return (
        <div className="heatmap-container">
            <svg
                ref={svgRef}
                width={width}
                height={height}
                className="heatmap-svg"
            />
            <div className="heatmap-tooltip" />
        </div>
    );
}

export default Heatmap;
