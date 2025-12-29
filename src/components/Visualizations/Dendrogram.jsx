import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import './Visualizations.css';

/**
 * Interactive Dendrogram visualization using D3
 * Shows hierarchical clustering of assets
 */
export function Dendrogram({ hierarchy, symbols, width = 800, height = 500 }) {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!hierarchy || !svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 20, right: 120, bottom: 20, left: 120 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const g = svg
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create cluster layout
        const cluster = d3.cluster().size([innerHeight, innerWidth]);

        // Create hierarchy from data
        const root = d3.hierarchy(hierarchy);
        cluster(root);

        // Color scale for depth
        const colorScale = d3.scaleSequential(d3.interpolateCool)
            .domain([0, root.height]);

        // Draw links
        const link = g.selectAll('.link')
            .data(root.links())
            .join('path')
            .attr('class', 'dendrogram-link')
            .attr('d', d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x));

        // Draw nodes
        const node = g.selectAll('.node')
            .data(root.descendants())
            .join('g')
            .attr('class', d => `dendrogram-node ${d.children ? 'node--internal' : 'node--leaf'}`)
            .attr('transform', d => `translate(${d.y},${d.x})`);

        node.append('circle')
            .attr('r', d => d.children ? 4 : 6)
            .attr('fill', d => d.children ? colorScale(d.depth) : 'var(--accent-cyan)')
            .attr('stroke', 'var(--bg-primary)')
            .attr('stroke-width', 2);

        // Add labels for leaf nodes
        node.filter(d => !d.children)
            .append('text')
            .attr('dy', '0.35em')
            .attr('x', 10)
            .attr('text-anchor', 'start')
            .attr('class', 'dendrogram-label')
            .text(d => d.data.name);

        // Add hover interactions
        node
            .on('mouseenter', function (event, d) {
                // Highlight path to root
                d3.select(this).select('circle')
                    .transition()
                    .duration(200)
                    .attr('r', d.children ? 6 : 8)
                    .attr('fill', 'var(--accent-yellow)');

                // Show tooltip
                const tooltip = d3.select('.dendrogram-tooltip');
                if (!tooltip.empty()) {
                    tooltip
                        .style('opacity', 1)
                        .style('left', `${event.pageX + 10}px`)
                        .style('top', `${event.pageY - 10}px`)
                        .html(`
              <strong>${d.data.name}</strong>
              ${d.children ? `<br/>Cluster size: ${d.leaves().length}` : ''}
              ${d.data.dist !== undefined ? `<br/>Distance: ${d.data.dist.toFixed(4)}` : ''}
            `);
                }
            })
            .on('mouseleave', function (event, d) {
                d3.select(this).select('circle')
                    .transition()
                    .duration(200)
                    .attr('r', d.children ? 4 : 6)
                    .attr('fill', d.children ? colorScale(d.depth) : 'var(--accent-cyan)');

                d3.select('.dendrogram-tooltip').style('opacity', 0);
            });

    }, [hierarchy, width, height, symbols]);

    if (!hierarchy) {
        return (
            <div className="viz-placeholder">
                <span className="terminal-loader">Waiting for data</span>
            </div>
        );
    }

    return (
        <div className="dendrogram-container">
            <svg
                ref={svgRef}
                width={width}
                height={height}
                className="dendrogram-svg"
            />
            <div className="dendrogram-tooltip" />
        </div>
    );
}

export default Dendrogram;
