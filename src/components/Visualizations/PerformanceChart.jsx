import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import './Visualizations.css';

// Strategy colors
const STRATEGY_COLORS = {
    'HRP': 'var(--accent-green)',
    'Equal Weight': 'var(--accent-cyan)',
    'Inverse Volatility': 'var(--accent-yellow)',
    'NIFTY 50': '#ff7f0e',  // Orange for benchmark
};

/**
 * Performance Chart visualization using D3
 * Shows cumulative returns comparison
 */
export function PerformanceChart({
    series,
    dates,
    width = 800,
    height = 400
}) {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!series || series.length === 0 || !svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 20, right: 100, bottom: 40, left: 60 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const g = svg
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Flatten all data for scales
        const allData = series.flatMap(s => s.data);

        // Parse dates
        const parseDate = d3.timeParse('%Y-%m-%d');

        // X scale (time)
        const xExtent = d3.extent(allData, d => parseDate(d.date));
        const xScale = d3.scaleTime()
            .domain(xExtent)
            .range([0, innerWidth]);

        // Y scale (percentage)
        const yExtent = d3.extent(allData, d => d.value);
        const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
        const yScale = d3.scaleLinear()
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .range([innerHeight, 0]);

        // Grid lines
        g.append('g')
            .attr('class', 'grid-lines')
            .selectAll('line')
            .data(yScale.ticks(5))
            .join('line')
            .attr('x1', 0)
            .attr('x2', innerWidth)
            .attr('y1', d => yScale(d))
            .attr('y2', d => yScale(d))
            .attr('stroke', 'var(--border-primary)')
            .attr('stroke-dasharray', '2,2');

        // Zero line
        g.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', innerWidth)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0))
            .attr('stroke', 'var(--text-tertiary)')
            .attr('stroke-width', 1);

        // Line generator
        const line = d3.line()
            .x(d => xScale(parseDate(d.date)))
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX);

        // Draw lines for each series
        series.forEach(s => {
            g.append('path')
                .datum(s.data)
                .attr('class', 'chart-line')
                .attr('fill', 'none')
                .attr('stroke', STRATEGY_COLORS[s.name] || 'var(--text-secondary)')
                .attr('stroke-width', 2)
                .attr('d', line);
        });

        // X Axis
        g.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat('%b %Y')));

        // Y Axis
        g.append('g')
            .attr('class', 'axis y-axis')
            .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d.toFixed(1)}%`));

        // Legend
        const legend = svg.append('g')
            .attr('class', 'chart-legend')
            .attr('transform', `translate(${width - margin.right + 10}, ${margin.top})`);

        series.forEach((s, i) => {
            const legendItem = legend.append('g')
                .attr('transform', `translate(0, ${i * 25})`);

            legendItem.append('line')
                .attr('x1', 0)
                .attr('x2', 20)
                .attr('y1', 0)
                .attr('y2', 0)
                .attr('stroke', STRATEGY_COLORS[s.name] || 'var(--text-secondary)')
                .attr('stroke-width', 2);

            legendItem.append('text')
                .attr('x', 25)
                .attr('y', 0)
                .attr('dy', '0.35em')
                .attr('class', 'legend-text')
                .text(s.name);
        });

        // Crosshair and tooltip
        const crosshair = g.append('g')
            .attr('class', 'crosshair')
            .style('display', 'none');

        crosshair.append('line')
            .attr('class', 'crosshair-x')
            .attr('y1', 0)
            .attr('y2', innerHeight);

        crosshair.append('line')
            .attr('class', 'crosshair-y')
            .attr('x1', 0)
            .attr('x2', innerWidth);

        // Overlay for mouse events
        svg.append('rect')
            .attr('class', 'overlay')
            .attr('transform', `translate(${margin.left},${margin.top})`)
            .attr('width', innerWidth)
            .attr('height', innerHeight)
            .attr('fill', 'none')
            .attr('pointer-events', 'all')
            .on('mouseenter', () => crosshair.style('display', 'block'))
            .on('mouseleave', () => {
                crosshair.style('display', 'none');
                d3.select('.chart-tooltip').style('opacity', 0);
            })
            .on('mousemove', function (event) {
                const [mx, my] = d3.pointer(event);
                const date = xScale.invert(mx);
                const dateStr = d3.timeFormat('%Y-%m-%d')(date);

                crosshair.select('.crosshair-x')
                    .attr('x1', mx)
                    .attr('x2', mx);

                crosshair.select('.crosshair-y')
                    .attr('y1', my)
                    .attr('y2', my);

                // Find closest data points
                const tooltip = d3.select('.chart-tooltip');
                const values = series.map(s => {
                    const closest = s.data.reduce((prev, curr) =>
                        Math.abs(parseDate(curr.date) - date) < Math.abs(parseDate(prev.date) - date)
                            ? curr : prev
                    );
                    return { name: s.name, value: closest.value };
                });

                tooltip
                    .style('opacity', 1)
                    .style('left', `${event.pageX + 15}px`)
                    .style('top', `${event.pageY - 10}px`)
                    .html(`
            <strong>${d3.timeFormat('%b %d, %Y')(date)}</strong>
            ${values.map(v => `
              <div style="color: ${STRATEGY_COLORS[v.name]}">
                ${v.name}: ${v.value >= 0 ? '+' : ''}${v.value.toFixed(2)}%
              </div>
            `).join('')}
          `);
            });

    }, [series, dates, width, height]);

    if (!series || series.length === 0) {
        return (
            <div className="viz-placeholder">
                <span className="terminal-loader">Waiting for data</span>
            </div>
        );
    }

    return (
        <div className="chart-container">
            <svg
                ref={svgRef}
                width={width}
                height={height}
                className="performance-chart-svg"
            />
            <div className="chart-tooltip" />
        </div>
    );
}

export default PerformanceChart;
