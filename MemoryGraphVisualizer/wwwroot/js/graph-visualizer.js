/**
 * Memory Graph Visualizer
 * 3D Force Graph integration for visualizing knowledge graphs
 */

(function () {
    'use strict';

    // 3D Force Graph instance
    let graph = null;

    // Current graph data
    let currentGraph = null;
    let graphData = { nodes: [], links: [] };

    // Selected node
    let selectedNode = null;
    let highlightedNodes = new Set();
    let highlightedLinks = new Set();

    // Tooltip state
    let tooltip = null;
    let tooltipTimeout = null;

    // DOM elements
    const elements = {
        databaseSelect: document.getElementById('databaseSelect'),
        layoutSelect: document.getElementById('layoutSelect'),
        searchInput: document.getElementById('searchInput'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        fitBtn: document.getElementById('fitBtn'),
        resetBtn: document.getElementById('resetBtn'),
        refreshBtn: document.getElementById('refreshBtn'),
        exportBtn: document.getElementById('exportBtn'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        emptyState: document.getElementById('emptyState'),
        graphStats: document.getElementById('graphStats'),
        nodeCount: document.getElementById('nodeCount'),
        edgeCount: document.getElementById('edgeCount'),
        detailsPanel: document.getElementById('detailsPanel'),
        legendPanel: document.getElementById('legendPanel')
    };

    // Entity type colors (default colors)
    const defaultColors = [
        '#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC',
        '#00ACC1', '#FF7043', '#9E9D24', '#5C6BC0', '#F06292'
    ];

    /**
     * Initialize the 3D Force Graph instance
     */
    function init3DGraph() {
        const container = document.getElementById('cy');

        // Create custom tooltip element
        tooltip = createTooltip();

        console.log('Initializing graph with data:', graphData);
        console.log('Container:', container);
        console.log('Container dimensions:', container.offsetWidth, 'x', container.offsetHeight);
        console.log('Container computed style:', window.getComputedStyle(container).width, 'x', window.getComputedStyle(container).height);

        // Get actual dimensions
        const width = container.offsetWidth || 800;
        const height = container.offsetHeight || 600;

        console.log('Using dimensions:', width, 'x', height);

        graph = new ForceGraph3D(container)
            .width(width)
            .height(height)
            .graphData(graphData)
            .nodeLabel(node => `${node.label} (${node.entityType})`)
            .nodeAutoColorBy('entityType')
            .nodeRelSize(4)
            .nodeVal(node => node.size || 10)
            .linkLabel(() => '') // Disable built-in link tooltip, use custom
            .linkColor(link => {
                if (highlightedLinks.has(link)) return '#FF6B6B';
                return '#999999';
            })
            .linkOpacity(link => {
                if (highlightedLinks.size === 0) return 0.6;
                return highlightedLinks.has(link) ? 0.8 : 0.1;
            })
            .linkWidth(link => highlightedLinks.has(link) ? 4 : 2)
            .linkDirectionalArrowLength(3.5)
            .linkDirectionalArrowRelPos(1)
            .linkCurvature(0.25)
            .linkDirectionalArrowColor(link => {
                if (highlightedLinks.has(link)) return '#FF6B6B';
                return '#999999';
            })
            .linkDirectionalParticles(link => highlightedLinks.has(link) ? 4 : 0)
            .linkDirectionalParticleWidth(4)
            .onNodeClick(handleNodeClick)
            .onNodeHover(handleNodeHover)
            .onLinkHover(handleLinkHover)
            .onBackgroundClick(handleBackgroundClick)
            .d3AlphaDecay(0.02)
            .d3VelocityDecay(0.3)
            .warmupTicks(100)
            .cooldownTicks(0)
            .backgroundColor('#f8f9fa');
    }

    /**
     * Handle node click event
     */
    function handleNodeClick(node) {
        if (!node) return;

        // Hide tooltip on click
        clearTimeout(tooltipTimeout);
        hideTooltip();

        selectedNode = node;
        showNodeDetails(node);
        highlightConnections(node);
        updateGraph();
    }

    /**
     * Handle background click event
     */
    function handleBackgroundClick() {
        // Hide tooltip on click
        clearTimeout(tooltipTimeout);
        hideTooltip();

        selectedNode = null;
        clearNodeDetails();
        clearHighlights();
        updateGraph();
    }

    /**
     * Handle node hover event
     */
    function handleNodeHover(node, prevNode) {
        // Clear existing timeout
        clearTimeout(tooltipTimeout);

        if (node) {
            document.body.style.cursor = 'pointer';
            // Show tooltip after delay
            tooltipTimeout = setTimeout(() => {
                showNodeTooltip(node);
            }, 300);
        } else {
            document.body.style.cursor = 'default';
            hideTooltip();
        }
    }

    /**
     * Handle link hover event
     */
    function handleLinkHover(link, prevLink) {
        // Clear existing timeout
        clearTimeout(tooltipTimeout);

        if (link) {
            // Show tooltip after delay
            tooltipTimeout = setTimeout(() => {
                showLinkTooltip(link);
            }, 300);
        } else {
            hideTooltip();
        }
    }

    /**
     * Create tooltip element
     */
    function createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'graph-tooltip';
        document.body.appendChild(tooltip);

        // Update tooltip position on mouse move
        document.addEventListener('mousemove', (e) => {
            if (tooltip.style.display === 'block') {
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';
            }
        });

        return tooltip;
    }

    /**
     * Show tooltip for node with observations
     */
    function showNodeTooltip(node) {
        const data = node;
        let html = `<strong>${escapeHtml(data.label)}</strong><br><em>${escapeHtml(data.entityType)}</em>`;

        // Add observations to tooltip
        if (data.observations && data.observations.length > 0) {
            html += `<div class="tooltip-observations">`;
            const maxObservations = 3; // Limit displayed observations
            const observations = data.observations.slice(0, maxObservations);

            observations.forEach(obs => {
                const text = typeof obs === 'string' ? obs : obs.text;
                const truncatedText = text.length > 100 ? text.substring(0, 100) + '...' : text;
                html += `<div class="tooltip-obs-item">${escapeHtml(truncatedText)}</div>`;
            });

            if (data.observations.length > maxObservations) {
                html += `<div class="tooltip-obs-more">+${data.observations.length - maxObservations} more...</div>`;
            }
            html += `</div>`;
        }

        tooltip.innerHTML = html;
        tooltip.style.display = 'block';
    }

    /**
     * Show tooltip for link with connection info
     */
    function showLinkTooltip(link) {
        const sourceNode = typeof link.source === 'object' ? link.source :
            graphData.nodes.find(n => n.id === link.source);
        const targetNode = typeof link.target === 'object' ? link.target :
            graphData.nodes.find(n => n.id === link.target);

        if (!sourceNode || !targetNode) return;

        let html = `<div class="edge-tooltip">`;

        // Source info
        const fromType = link.fromType || sourceNode.entityType || '';
        const toType = link.toType || targetNode.entityType || '';

        html += `<div class="edge-endpoint"><strong>${escapeHtml(sourceNode.label)}</strong>`;
        if (fromType) {
            html += ` <em>(${escapeHtml(fromType)})</em>`;
        }
        html += `</div>`;

        // Relation
        html += `<div class="edge-relation">${escapeHtml(link.relationType)}</div>`;

        // Target info
        html += `<div class="edge-endpoint"><strong>${escapeHtml(targetNode.label)}</strong>`;
        if (toType) {
            html += ` <em>(${escapeHtml(toType)})</em>`;
        }
        html += `</div>`;

        html += `</div>`;

        tooltip.innerHTML = html;
        tooltip.style.display = 'block';
    }

    /**
     * Hide tooltip
     */
    function hideTooltip() {
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    /**
     * Convert Cytoscape format to 3D Force Graph format
     */
    function convertGraphData(cytoscapeData) {
        const nodes = [];
        const links = [];
        const nodeMap = new Map();

        // Process nodes
        if (cytoscapeData.elements && cytoscapeData.elements.nodes) {
            cytoscapeData.elements.nodes.forEach((nodeElement, index) => {
                const data = nodeElement.data;
                const node = {
                    id: data.id,
                    label: data.label || data.id,
                    entityType: data.entityType || 'Unknown',
                    color: data.color || defaultColors[index % defaultColors.length],
                    size: data.size || 10,
                    observations: data.observations || []
                };
                nodes.push(node);
                nodeMap.set(node.id, node);
            });
        }

        // Process edges/links
        if (cytoscapeData.elements && cytoscapeData.elements.edges) {
            cytoscapeData.elements.edges.forEach(edgeElement => {
                const data = edgeElement.data;
                const link = {
                    source: data.source,
                    target: data.target,
                    relationType: data.relationType || '',
                    fromType: data.fromType || '',
                    toType: data.toType || ''
                };
                links.push(link);
            });
        }

        return { nodes, links, nodeMap };
    }

    /**
     * Load graph data from API
     */
    async function loadGraph(databaseName) {
        showLoading(true);

        try {
            const response = await fetch(`/api/graph?database=${encodeURIComponent(databaseName)}`);

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            currentGraph = data;

            // Convert data format
            const converted = convertGraphData(data);
            graphData = { nodes: converted.nodes, links: converted.links };

            console.log('Converted graph data:', graphData);
            console.log('Sample node:', graphData.nodes[0]);
            console.log('Sample link:', graphData.links[0]);

            // Update graph
            if (graph) {
                graph.graphData(graphData);
            }

            // Update UI
            updateStats(data.metadata);
            updateLegend();
            enableControls(true);

            // Hide empty state
            elements.emptyState.style.display = 'none';
            elements.graphStats.classList.remove('d-none');

            showToast('Graph loaded successfully', 'success');

        } catch (error) {
            console.error('Failed to load graph:', error);
            showToast(`Failed to load graph: ${error.message}`, 'danger');
        } finally {
            showLoading(false);
        }
    }

    /**
     * Apply layout algorithm
     */
    function applyLayout(layoutName) {
        if (!graph) return;

        // Configure force simulation based on layout type
        switch (layoutName) {
            case 'cose':
                graph
                    .d3AlphaDecay(0.02)
                    .d3VelocityDecay(0.3)
                    .d3Force('charge').strength(-120);
                break;
            case 'circle':
                arrangeInCircle();
                break;
            case 'grid':
                arrangeInGrid();
                break;
            case 'breadthfirst':
                arrangeHierarchical();
                break;
            case 'concentric':
                arrangeInConcentric();
                break;
        }

        // Re-heat simulation
        graph.numDimensions(3).d3ReheatSimulation();
    }

    /**
     * Arrange nodes in a circle
     */
    function arrangeInCircle() {
        const nodes = graphData.nodes;
        const radius = nodes.length * 10;

        nodes.forEach((node, i) => {
            const angle = (i / nodes.length) * Math.PI * 2;
            node.fx = Math.cos(angle) * radius;
            node.fy = Math.sin(angle) * radius;
            node.fz = 0;
        });

        graph.graphData(graphData);

        setTimeout(() => {
            nodes.forEach(node => {
                node.fx = undefined;
                node.fy = undefined;
                node.fz = undefined;
            });
        }, 3000);
    }

    /**
     * Arrange nodes in a grid
     */
    function arrangeInGrid() {
        const nodes = graphData.nodes;
        const cols = Math.ceil(Math.sqrt(nodes.length));
        const spacing = 30;

        nodes.forEach((node, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            node.fx = (col - cols / 2) * spacing;
            node.fy = (row - cols / 2) * spacing;
            node.fz = 0;
        });

        graph.graphData(graphData);

        setTimeout(() => {
            nodes.forEach(node => {
                node.fx = undefined;
                node.fy = undefined;
                node.fz = undefined;
            });
        }, 3000);
    }

    /**
     * Arrange nodes hierarchically
     */
    function arrangeHierarchical() {
        const nodes = graphData.nodes;
        const links = graphData.links;

        // Calculate node levels using BFS
        const levels = new Map();
        const visited = new Set();
        const queue = [];

        // Find root nodes (nodes with no incoming edges)
        const hasIncoming = new Set(links.map(l => l.target));
        const roots = nodes.filter(n => !hasIncoming.has(n.id));

        if (roots.length === 0 && nodes.length > 0) {
            roots.push(nodes[0]);
        }

        roots.forEach(root => {
            queue.push({ node: root, level: 0 });
            levels.set(root.id, 0);
        });

        while (queue.length > 0) {
            const { node, level } = queue.shift();
            if (visited.has(node.id)) continue;
            visited.add(node.id);

            const outgoing = links.filter(l => l.source.id === node.id || l.source === node.id);
            outgoing.forEach(link => {
                const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                const targetNode = nodes.find(n => n.id === targetId);
                if (targetNode && !visited.has(targetId)) {
                    const targetLevel = level + 1;
                    if (!levels.has(targetId) || levels.get(targetId) > targetLevel) {
                        levels.set(targetId, targetLevel);
                        queue.push({ node: targetNode, level: targetLevel });
                    }
                }
            });
        }

        // Position nodes by level
        const levelGroups = new Map();
        nodes.forEach(node => {
            const level = levels.get(node.id) || 0;
            if (!levelGroups.has(level)) {
                levelGroups.set(level, []);
            }
            levelGroups.get(level).push(node);
        });

        const spacing = 40;
        levelGroups.forEach((levelNodes, level) => {
            levelNodes.forEach((node, i) => {
                node.fx = (i - levelNodes.length / 2) * spacing;
                node.fy = level * spacing;
                node.fz = 0;
            });
        });

        graph.graphData(graphData);

        setTimeout(() => {
            nodes.forEach(node => {
                node.fx = undefined;
                node.fy = undefined;
                node.fz = undefined;
            });
        }, 3000);
    }

    /**
     * Arrange nodes in concentric circles
     */
    function arrangeInConcentric() {
        const nodes = graphData.nodes;
        const links = graphData.links;

        // Calculate degree for each node
        const degrees = new Map();
        nodes.forEach(node => degrees.set(node.id, 0));

        links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            degrees.set(sourceId, (degrees.get(sourceId) || 0) + 1);
            degrees.set(targetId, (degrees.get(targetId) || 0) + 1);
        });

        // Sort nodes by degree
        const sortedNodes = [...nodes].sort((a, b) =>
            (degrees.get(b.id) || 0) - (degrees.get(a.id) || 0)
        );

        // Arrange in concentric circles
        const maxDegree = Math.max(...degrees.values(), 1);
        const baseRadius = 30;

        sortedNodes.forEach((node, i) => {
            const degree = degrees.get(node.id) || 0;
            const radius = baseRadius + ((maxDegree - degree) / maxDegree) * 100;
            const angle = (i / sortedNodes.length) * Math.PI * 2;

            node.fx = Math.cos(angle) * radius;
            node.fy = Math.sin(angle) * radius;
            node.fz = 0;
        });

        graph.graphData(graphData);

        setTimeout(() => {
            nodes.forEach(node => {
                node.fx = undefined;
                node.fy = undefined;
                node.fz = undefined;
            });
        }, 3000);
    }

    /**
     * Show node details in the panel
     */
    function showNodeDetails(node) {
        const data = node;

        // Get connected nodes
        const incomingLinks = graphData.links.filter(link => {
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return targetId === node.id;
        });

        const outgoingLinks = graphData.links.filter(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            return sourceId === node.id;
        });

        let html = `
            <div class="node-title">${escapeHtml(data.label)}</div>
            <span class="node-type-badge" style="background-color: ${data.color}">
                ${escapeHtml(data.entityType)}
            </span>
        `;

        // Observations
        if (data.observations && data.observations.length > 0) {
            html += `
                <div class="mt-3">
                    <strong class="small">Observations (${data.observations.length})</strong>
                    <div class="observations-list mt-2">
            `;

            data.observations.forEach(obs => {
                const text = typeof obs === 'string' ? obs : obs.text;
                const timestamp = typeof obs === 'object' ? obs.timestamp : null;
                const source = typeof obs === 'object' ? obs.source : null;

                html += `
                    <div class="observation-item">
                        <div class="observation-text">${escapeHtml(text)}</div>
                        ${(timestamp || source) ? `
                            <div class="observation-meta">
                                ${timestamp ? `<i class="bi bi-clock"></i> ${formatTimestamp(timestamp)}` : ''}
                                ${source ? `<span class="ms-2"><i class="bi bi-tag"></i> ${escapeHtml(source)}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                `;
            });

            html += '</div></div>';
        }

        // Connections
        const connections = [];

        incomingLinks.forEach(link => {
            const sourceNode = typeof link.source === 'object' ? link.source :
                graphData.nodes.find(n => n.id === link.source);
            if (sourceNode) {
                connections.push({
                    nodeId: sourceNode.id,
                    nodeLabel: sourceNode.label,
                    nodeType: link.fromType || sourceNode.entityType,
                    relation: link.relationType,
                    direction: 'incoming'
                });
            }
        });

        outgoingLinks.forEach(link => {
            const targetNode = typeof link.target === 'object' ? link.target :
                graphData.nodes.find(n => n.id === link.target);
            if (targetNode) {
                connections.push({
                    nodeId: targetNode.id,
                    nodeLabel: targetNode.label,
                    nodeType: link.toType || targetNode.entityType,
                    relation: link.relationType,
                    direction: 'outgoing'
                });
            }
        });

        if (connections.length > 0) {
            html += `
                <div class="mt-3">
                    <strong class="small">Connections (${connections.length})</strong>
                    <div class="connections-list mt-2">
            `;

            connections.forEach(conn => {
                const icon = conn.direction === 'incoming' ? 'bi-arrow-left' : 'bi-arrow-right';
                const typeInfo = conn.nodeType ? ` <span class="connection-node-type">[${escapeHtml(conn.nodeType)}]</span>` : '';
                html += `
                    <div class="connection-item" onclick="window.graphVisualizer.navigateToNode('${escapeHtml(conn.nodeId)}')">
                        <i class="bi ${icon} me-1"></i>
                        ${escapeHtml(conn.nodeLabel)}${typeInfo}
                        <span class="relation-type ms-1">(${escapeHtml(conn.relation)})</span>
                    </div>
                `;
            });

            html += '</div></div>';
        }

        elements.detailsPanel.innerHTML = html;
    }

    /**
     * Clear node details panel
     */
    function clearNodeDetails() {
        elements.detailsPanel.innerHTML = `
            <div class="text-muted text-center py-4">
                <i class="bi bi-cursor"></i>
                <p class="small mt-2">Click a node to view details</p>
            </div>
        `;
    }

    /**
     * Highlight connections for selected node
     */
    function highlightConnections(node) {
        clearHighlights();

        highlightedNodes.add(node);

        // Highlight connected nodes and links
        graphData.links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;

            if (sourceId === node.id || targetId === node.id) {
                highlightedLinks.add(link);

                const connectedNode = sourceId === node.id ?
                    (typeof link.target === 'object' ? link.target : graphData.nodes.find(n => n.id === targetId)) :
                    (typeof link.source === 'object' ? link.source : graphData.nodes.find(n => n.id === sourceId));

                if (connectedNode) {
                    highlightedNodes.add(connectedNode);
                }
            }
        });
    }

    /**
     * Clear all highlights
     */
    function clearHighlights() {
        highlightedNodes.clear();
        highlightedLinks.clear();
    }

    /**
     * Update graph visualization
     */
    function updateGraph() {
        if (graph) {
            graph.nodeColor(graph.nodeColor())
                .nodeOpacity(graph.nodeOpacity())
                .linkColor(graph.linkColor())
                .linkOpacity(graph.linkOpacity())
                .linkWidth(graph.linkWidth())
                .linkDirectionalParticles(graph.linkDirectionalParticles());
        }
    }

    /**
     * Navigate to and select a specific node
     */
    function navigateToNode(nodeId) {
        const node = graphData.nodes.find(n => n.id === nodeId);
        if (node) {
            // Move camera to node
            const distance = 200;
            const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

            graph.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                node,
                1000
            );

            // Select the node
            setTimeout(() => {
                handleNodeClick(node);
            }, 1000);
        }
    }

    /**
     * Update graph statistics display
     */
    function updateStats(metadata) {
        if (metadata) {
            elements.nodeCount.textContent = metadata.nodeCount || 0;
            elements.edgeCount.textContent = metadata.edgeCount || 0;
        }
    }

    /**
     * Update entity type legend
     */
    function updateLegend() {
        const entityTypes = new Map();

        graphData.nodes.forEach(node => {
            if (!entityTypes.has(node.entityType)) {
                entityTypes.set(node.entityType, node.color);
            }
        });

        if (entityTypes.size === 0) {
            elements.legendPanel.innerHTML = '<div class="text-muted small text-center">No entity types</div>';
            return;
        }

        let html = '';
        entityTypes.forEach((color, type) => {
            html += `
                <span class="legend-item">
                    <span class="legend-color" style="background-color: ${color}"></span>
                    ${escapeHtml(type)}
                </span>
            `;
        });

        elements.legendPanel.innerHTML = html;
    }

    /**
     * Filter nodes by search term
     */
    function filterNodes(searchTerm) {
        const term = searchTerm.toLowerCase().trim();

        if (!term) {
            clearHighlights();
            updateGraph();
            return;
        }

        clearHighlights();

        graphData.nodes.forEach(node => {
            const matches = node.label.toLowerCase().includes(term) ||
                node.entityType.toLowerCase().includes(term);

            if (matches) {
                highlightedNodes.add(node);
            }
        });

        // Also highlight links connected to highlighted nodes
        graphData.links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const sourceNode = typeof link.source === 'object' ? link.source : graphData.nodes.find(n => n.id === sourceId);
            const targetNode = typeof link.target === 'object' ? link.target : graphData.nodes.find(n => n.id === targetId);

            if ((sourceNode && highlightedNodes.has(sourceNode)) ||
                (targetNode && highlightedNodes.has(targetNode))) {
                highlightedLinks.add(link);
            }
        });

        updateGraph();
    }

    /**
     * Export graph as PNG
     */
    function exportGraph() {
        // Capture canvas
        const canvas = graph.renderer().domElement;

        canvas.toBlob(blob => {
            const databaseName = elements.databaseSelect.value.replace('.db', '');
            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `memory-graph-3d-${databaseName}-${timestamp}.png`;

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();

            URL.revokeObjectURL(link.href);
            showToast('Graph exported successfully', 'success');
        });
    }

    /**
     * Fit graph to view
     */
    function fitToView() {
        if (graph) {
            graph.zoomToFit(1000, 100);
        }
    }

    /**
     * Reset view
     */
    function resetView() {
        if (graph) {
            clearHighlights();
            selectedNode = null;
            clearNodeDetails();
            updateGraph();
            graph.cameraPosition(
                { x: 0, y: 0, z: 300 },
                { x: 0, y: 0, z: 0 },
                1000
            );
        }
    }

    /**
     * Show/hide loading overlay
     */
    function showLoading(show) {
        if (show) {
            elements.loadingOverlay.classList.remove('d-none');
        } else {
            elements.loadingOverlay.classList.add('d-none');
        }
    }

    /**
     * Enable/disable control buttons
     */
    function enableControls(enabled) {
        elements.layoutSelect.disabled = !enabled;
        elements.searchInput.disabled = !enabled;
        elements.clearSearchBtn.disabled = !enabled;
        elements.fitBtn.disabled = !enabled;
        elements.resetBtn.disabled = !enabled;
        elements.refreshBtn.disabled = !enabled;
        elements.exportBtn.disabled = !enabled;
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-bg-${type} border-0 show`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${escapeHtml(message)}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        container.appendChild(toast);

        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);

        // Close button handler
        toast.querySelector('.btn-close').addEventListener('click', () => {
            toast.remove();
        });
    }

    /**
     * Format ISO timestamp for display
     */
    function formatTimestamp(isoString) {
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return isoString;
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Initialize event listeners
     */
    function initEventListeners() {
        // Database selection
        if (elements.databaseSelect) {
            elements.databaseSelect.addEventListener('change', function () {
                const database = this.value;
                if (database) {
                    loadGraph(database);
                }
            });
        }

        // Layout selection
        elements.layoutSelect.addEventListener('change', function () {
            if (graph && graphData.nodes.length > 0) {
                applyLayout(this.value);
            }
        });

        // Search input
        let searchTimeout;
        elements.searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterNodes(this.value);
            }, 300);
        });

        // Clear search
        elements.clearSearchBtn.addEventListener('click', function () {
            elements.searchInput.value = '';
            filterNodes('');
        });

        // Fit button
        elements.fitBtn.addEventListener('click', function () {
            fitToView();
        });

        // Reset button
        elements.resetBtn.addEventListener('click', function () {
            resetView();
        });

        // Refresh button
        elements.refreshBtn.addEventListener('click', function () {
            const database = elements.databaseSelect.value;
            if (database) {
                loadGraph(database);
            }
        });

        // Export button
        elements.exportBtn.addEventListener('click', function () {
            exportGraph();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', function (evt) {
            // Only handle if not in an input field
            if (evt.target.tagName === 'INPUT' || evt.target.tagName === 'SELECT') {
                return;
            }

            switch (evt.key) {
                case 'f':
                    fitToView();
                    break;
                case 'r':
                    resetView();
                    break;
                case '/':
                    evt.preventDefault();
                    elements.searchInput.focus();
                    break;
                case 'Escape':
                    elements.searchInput.value = '';
                    filterNodes('');
                    elements.searchInput.blur();
                    break;
            }
        });

        // Handle window resize
        window.addEventListener('resize', function () {
            if (graph) {
                const container = document.getElementById('cy');
                graph.width(container.offsetWidth).height(container.offsetHeight);
            }
        });
    }

    /**
     * Initialize the application
     */
    function init() {
        init3DGraph();
        initEventListeners();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose public API
    window.graphVisualizer = {
        navigateToNode: navigateToNode,
        loadGraph: loadGraph,
        applyLayout: applyLayout
    };

})();
