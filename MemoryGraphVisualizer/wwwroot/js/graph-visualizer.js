/**
 * Memory Graph Visualizer
 * 3D Force Graph integration for visualizing knowledge graphs
 */

import ForceGraph3D from 'https://esm.sh/3d-force-graph';
import SpriteText from 'https://esm.sh/three-spritetext';
import * as d3 from 'https://esm.sh/d3-force-3d';

(function () {
    'use strict';

    // 3D Force Graph instance
    let graph = null;

    // Current graph data
    let currentGraph = null;
    let graphData = { nodes: [], links: [] };

    // Entity type color cache
    let entityTypeColors = new Map();
    let colorsCaptured = false;

    // Selected node
    let selectedNode = null;
    let highlightedNodes = new Set();
    let highlightedLinks = new Set();

    // Tooltip state
    let tooltip = null;
    let tooltipTimeout = null;
    let currentMousePos = { x: 0, y: 0 };

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

    /**
     * Initialize the 3D Force Graph instance
     */
    function init3DGraph() {
        const container = document.getElementById('cy');

        // Create custom tooltip element
        tooltip = createTooltip();

        console.log('Initializing graph with data:', graphData);

        // Get actual dimensions
        const width = container.offsetWidth || 800;
        const height = container.offsetHeight || 600;

        graph = new ForceGraph3D(container)
            .width(width)
            .height(height)
            .graphData(graphData)
            .nodeAutoColorBy('entityType')
            .nodeOpacity(1.0)
            .nodeRelSize(2.5)
            .nodeVal(5)
            .nodeResolution(16) // Higher polygon count for smoother spheres (default is 8)
            // Add text sprites for node labels (billboard, always faces camera)
            .nodeThreeObject(node => {
                const sprite = new SpriteText(node.label);
                sprite.color = '#111111';
                sprite.textHeight = 2;
                sprite.fontSize = 180; // Higher resolution for sharper rendering (default: 90)
                sprite.fontWeight = 'bold';
                sprite.backgroundColor = '#ffffff';
                sprite.padding = 0.5;
                sprite.borderRadius = 1;
                sprite.borderWidth = 0.2;
                sprite.borderColor = '#cccccc';
                sprite.center.y = 2.5; // shift below node (positive moves down)
                return sprite;
            })
            .nodeThreeObjectExtend(true)
            .linkThreeObjectExtend(true)
            .linkThreeObject(link => {
                if (link.relationType) {
                    const sprite = new SpriteText(link.relationType);
                    sprite.color = '#000000';
                    sprite.textHeight = 2;
                    sprite.fontSize = 180; // Higher resolution for sharper rendering (default: 90)
                    sprite.fontWeight = 'bold';
                    sprite.backgroundColor = '#ffffff';
                    sprite.padding = 0.5;
                    sprite.borderRadius = 1;
                    sprite.borderWidth = 0.2;
                    sprite.borderColor = '#cccccc';
                    return sprite;
                }
            })
            .linkPositionUpdate((sprite, { start, end }) => {
                if (sprite) {
                    const middlePos = Object.assign(...['x', 'y', 'z'].map(c => ({
                        [c]: start[c] + (end[c] - start[c]) / 2
                    })));
                    Object.assign(sprite.position, middlePos);
                }
            })
            .linkColor(() => '#666666')
            .linkOpacity(1.0)
            .linkWidth(0) // 0 width = simple lines instead of tubes
            .linkDirectionalArrowLength(2)
            .linkDirectionalArrowRelPos(1)
            .linkDirectionalArrowColor(() => '#666666')
            .linkCurvature(0) // Straight lines
            .onNodeClick(handleNodeClick)
            .onNodeHover(handleNodeHover)
            .onLinkHover(handleLinkHover)
            .onBackgroundClick(handleBackgroundClick)
            .onEngineStop(() => {
                // Capture colors from auto-coloring after layout stabilizes (once per data load)
                if (!colorsCaptured) {
                    const colorAccessor = graph.nodeColor();

                    entityTypeColors.clear();
                    graphData.nodes.forEach(node => {
                        if (!entityTypeColors.has(node.entityType)) {
                            const color = typeof colorAccessor === 'function' ? colorAccessor(node) : node[colorAccessor];
                            entityTypeColors.set(node.entityType, color);
                        }
                    });
                    colorsCaptured = true;
                    updateLegend();
                }
            })
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

        // Track mouse position and update tooltip position
        document.addEventListener('mousemove', (e) => {
            currentMousePos.x = e.clientX;
            currentMousePos.y = e.clientY;

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

        // Set initial position before showing
        tooltip.style.left = (currentMousePos.x + 15) + 'px';
        tooltip.style.top = (currentMousePos.y + 15) + 'px';

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
        // Set initial position before showing
        tooltip.style.left = (currentMousePos.x + 15) + 'px';
        tooltip.style.top = (currentMousePos.y + 15) + 'px';

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
    function convertGraphData(nodeData) {
        const nodes = [];
        const links = [];
        const nodeMap = new Map();

        if (nodeData && nodeData.nodes) {
            // Process nodes
            nodeData.nodes.forEach((nodeElement, index) => {
                const data = nodeElement.data;
                const node = {
                    id: data.id,
                    label: data.label || data.id,
                    entityType: data.entityType || 'Unknown',
                    observations: data.observations || []
                };
                nodes.push(node);
                nodeMap.set(node.id, node);
            });
        

            // Process edges/links
            if (nodeData && nodeData.edges) {
                nodeData.edges.forEach(edgeElement => {
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
            const converted = convertGraphData(data.elements);
            graphData = { nodes: converted.nodes, links: converted.links };

            console.log('Converted graph data:', graphData);
            console.log('Sample node:', graphData.nodes[0]);
            console.log('Sample link:', graphData.links[0]);

            // Reset color capture flag for new data
            colorsCaptured = false;

            // Update graph
            if (graph) {
                graph.graphData(graphData);
            }

            // Update UI
            updateStats(data.metadata);
            enableControls(true);

            // Apply default layout (legend will update in onEngineStop)
            const defaultLayout = elements.layoutSelect.value || 'cose';
            applyLayout(defaultLayout);

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
                arrangeCose();
                break;
            case 'sphere':
                arrangeInSphere();
                break;
            case 'cube':
                arrangeInCube();
                break;
            case 'hierarchical':
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
     * Apply COSE (force-directed) layout with positioning forces
     */
    function arrangeCose() {
        // Reset node positions and velocities
        graphData.nodes.forEach(node => {
            node.fx = undefined;
            node.fy = undefined;
            node.fz = undefined;
            node.vx = 0;
            node.vy = 0;
            node.vz = 0;
        });

        graph.graphData(graphData);

        graph
            .d3AlphaDecay(0.02)
            .d3VelocityDecay(0.3);

        // Standard charge force for all nodes
        graph.d3Force('charge').strength(-120);
        graph.d3Force('link').distance(30);

        // Add positioning forces to pull isolated nodes toward center (0,0,0)
        // These apply to each node individually, unlike center force which moves the centroid
        graph.d3Force('x', d3.forceX(0).strength(0.03));
        graph.d3Force('y', d3.forceY(0).strength(0.03));
        graph.d3Force('z', d3.forceZ(0).strength(0.03));

        console.log('COSE layout applied with positioning forces - simulation restarting');
    }

    /**
     * Arrange nodes on a sphere surface
     */
    function arrangeInSphere() {
        const nodes = graphData.nodes;
        const radius = Math.max(nodes.length * 5, 50);

        nodes.forEach((node, i) => {
            // Use golden ratio spiral for even distribution on sphere
            const phi = Math.acos(1 - 2 * (i + 0.5) / nodes.length);
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;

            node.fx = radius * Math.sin(phi) * Math.cos(theta);
            node.fy = radius * Math.sin(phi) * Math.sin(theta);
            node.fz = radius * Math.cos(phi);
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
     * Arrange nodes in a 3D grid
     */
    function arrangeInCube() {
        const nodes = graphData.nodes;
        const cols = Math.ceil(Math.cbrt(nodes.length)); // Cube root for 3D grid
        const spacing = 30;

        nodes.forEach((node, i) => {
            const x = i % cols;
            const y = Math.floor(i / cols) % cols;
            const z = Math.floor(i / (cols * cols));

            node.fx = (x - cols / 2) * spacing;
            node.fy = (y - cols / 2) * spacing;
            node.fz = (z - cols / 2) * spacing;
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
        const hasIncoming = new Set(links.map(l =>
            typeof l.target === 'object' ? l.target.id : l.target
        ));
        const roots = nodes.filter(n => !hasIncoming.has(n.id));

        console.log('Total nodes:', nodes.length, 'Total links:', links.length);
        console.log('Nodes with incoming edges:', hasIncoming.size);
        console.log('Root nodes found:', roots.length);

        if (roots.length === 0 && nodes.length > 0) {
            console.log('No roots found - using first node as root');
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

        // Position nodes by level with 3D depth
        const levelGroups = new Map();
        nodes.forEach(node => {
            const level = levels.get(node.id) || 0;
            if (!levelGroups.has(level)) {
                levelGroups.set(level, []);
            }
            levelGroups.get(level).push(node);
        });

        const spacing = 80; // Increased for more visible depth
        levelGroups.forEach((levelNodes, level) => {
            levelNodes.forEach((node, i) => {
                // Arrange each level in a circle, with depth (Z) based on level
                const angle = (i / levelNodes.length) * Math.PI * 2;
                const radius = Math.max(levelNodes.length * 8, 40);

                node.fx = Math.cos(angle) * radius;
                node.fy = Math.sin(angle) * radius;
                node.fz = level * spacing; // Depth based on hierarchy level
            });
        });

        const maxLevel = levels.size > 0 ? Math.max(...levels.values()) : 0;
        console.log('Hierarchical layout levels:', levelGroups.size, 'Max level:', maxLevel);
        console.log('Level distribution:');
        levelGroups.forEach((nodes, level) => {
            console.log(`  Level ${level}: ${nodes.length} nodes`);
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
     * Arrange nodes in concentric spheres based on degree
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

        // Arrange in concentric spheres
        const maxDegree = Math.max(...degrees.values(), 1);
        const baseRadius = 30;

        sortedNodes.forEach((node, i) => {
            const degree = degrees.get(node.id) || 0;
            const radius = baseRadius + ((maxDegree - degree) / maxDegree) * 100;

            // Distribute on sphere surface using golden ratio spiral
            const phi = Math.acos(1 - 2 * (i + 0.5) / sortedNodes.length);
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;

            node.fx = radius * Math.sin(phi) * Math.cos(theta);
            node.fy = radius * Math.sin(phi) * Math.sin(theta);
            node.fz = radius * Math.cos(phi);
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
        if (entityTypeColors.size === 0) {
            elements.legendPanel.innerHTML = '<div class="text-muted small text-center">No entity types</div>';
            return;
        }

        let html = '';
        entityTypeColors.forEach((color, type) => {
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
