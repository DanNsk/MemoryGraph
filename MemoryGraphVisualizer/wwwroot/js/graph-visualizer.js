/**
 * Memory Graph Visualizer
 * Cytoscape.js integration for visualizing knowledge graphs
 */

(function () {
    'use strict';

    // Cytoscape instance
    let cy = null;

    // Current graph data
    let currentGraph = null;

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

    // Cytoscape style definitions
    const cytoscapeStyle = [
        {
            selector: 'node',
            style: {
                'label': 'data(label)',
                'background-color': 'data(color)',
                'width': 'data(size)',
                'height': 'data(size)',
                'text-valign': 'bottom',
                'text-halign': 'center',
                'font-size': '10px',
                'color': '#333',
                'text-margin-y': 5,
                'text-wrap': 'ellipsis',
                'text-max-width': '80px',
                'border-width': 2,
                'border-color': '#fff'
            }
        },
        {
            selector: 'node:selected',
            style: {
                'border-width': 3,
                'border-color': '#FFD700',
                'background-blacken': -0.1
            }
        },
        {
            selector: 'node.highlighted',
            style: {
                'border-width': 3,
                'border-color': '#FF6B6B',
                'background-blacken': -0.2
            }
        },
        {
            selector: 'node.faded',
            style: {
                'opacity': 0.3
            }
        },
        {
            selector: 'edge',
            style: {
                'width': 2,
                'line-color': '#999',
                'target-arrow-color': '#999',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
                'arrow-scale': 1.2
            }
        },
        {
            selector: 'edge:selected',
            style: {
                'line-color': '#FFD700',
                'target-arrow-color': '#FFD700',
                'width': 3
            }
        },
        {
            selector: 'edge.highlighted',
            style: {
                'line-color': '#FF6B6B',
                'target-arrow-color': '#FF6B6B',
                'width': 3
            }
        },
        {
            selector: 'edge.faded',
            style: {
                'opacity': 0.2
            }
        }
    ];

    // Layout configurations
    const layoutConfigs = {
        cose: {
            name: 'cose',
            animate: true,
            animationDuration: 500,
            nodeDimensionsIncludeLabels: true,
            nodeRepulsion: function () { return 8000; },
            idealEdgeLength: function () { return 100; },
            edgeElasticity: function () { return 100; },
            gravity: 0.25,
            numIter: 1000
        },
        circle: {
            name: 'circle',
            animate: true,
            animationDuration: 500,
            padding: 30
        },
        grid: {
            name: 'grid',
            animate: true,
            animationDuration: 500,
            padding: 30,
            rows: undefined,
            cols: undefined
        },
        breadthfirst: {
            name: 'breadthfirst',
            animate: true,
            animationDuration: 500,
            directed: true,
            padding: 30,
            spacingFactor: 1.5
        },
        concentric: {
            name: 'concentric',
            animate: true,
            animationDuration: 500,
            padding: 30,
            concentric: function (node) {
                return node.degree();
            },
            levelWidth: function () { return 2; }
        }
    };

    /**
     * Initialize the Cytoscape instance
     */
    function initCytoscape() {
        cy = cytoscape({
            container: document.getElementById('cy'),
            style: cytoscapeStyle,
            elements: [],
            layout: { name: 'preset' },
            wheelSensitivity: 0.3,
            minZoom: 0.1,
            maxZoom: 5
        });

        // Event handlers
        cy.on('tap', 'node', function (evt) {
            const node = evt.target;
            showNodeDetails(node);
            highlightConnections(node);
        });

        cy.on('tap', function (evt) {
            if (evt.target === cy) {
                clearNodeDetails();
                clearHighlights();
            }
        });

        // Tooltip on hover
        let tooltipTimeout;
        const tooltip = createTooltip();

        cy.on('mouseover', 'node', function (evt) {
            const node = evt.target;
            clearTimeout(tooltipTimeout);
            tooltipTimeout = setTimeout(() => {
                showTooltip(tooltip, node, evt.renderedPosition);
            }, 300);
        });

        cy.on('mouseout', 'node', function () {
            clearTimeout(tooltipTimeout);
            hideTooltip(tooltip);
        });

        cy.on('drag', 'node', function () {
            clearTimeout(tooltipTimeout);
            hideTooltip(tooltip);
        });

        // Edge hover for connection types
        cy.on('mouseover', 'edge', function (evt) {
            const edge = evt.target;
            clearTimeout(tooltipTimeout);
            tooltipTimeout = setTimeout(() => {
                showEdgeTooltip(tooltip, edge, evt.renderedPosition);
            }, 300);
        });

        cy.on('mouseout', 'edge', function () {
            clearTimeout(tooltipTimeout);
            hideTooltip(tooltip);
        });
    }

    /**
     * Create tooltip element
     */
    function createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'cy-tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    /**
     * Show tooltip for node with observations
     */
    function showTooltip(tooltip, node, position) {
        const data = node.data();
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
        tooltip.style.left = (position.x + 15) + 'px';
        tooltip.style.top = (position.y + 15) + 'px';
        tooltip.style.display = 'block';
    }

    /**
     * Show tooltip for edge with connection types
     */
    function showEdgeTooltip(tooltip, edge, position) {
        const data = edge.data();
        const sourceNode = edge.source();
        const targetNode = edge.target();

        let html = `<div class="edge-tooltip">`;

        // Source info
        const fromType = data.fromType || sourceNode.data('entityType') || '';
        const toType = data.toType || targetNode.data('entityType') || '';

        html += `<div class="edge-endpoint"><strong>${escapeHtml(sourceNode.data('label'))}</strong>`;
        if (fromType) {
            html += ` <em>(${escapeHtml(fromType)})</em>`;
        }
        html += `</div>`;

        // Relation
        html += `<div class="edge-relation">${escapeHtml(data.relationType)}</div>`;

        // Target info
        html += `<div class="edge-endpoint"><strong>${escapeHtml(targetNode.data('label'))}</strong>`;
        if (toType) {
            html += ` <em>(${escapeHtml(toType)})</em>`;
        }
        html += `</div>`;

        html += `</div>`;

        tooltip.innerHTML = html;
        tooltip.style.left = (position.x + 15) + 'px';
        tooltip.style.top = (position.y + 15) + 'px';
        tooltip.style.display = 'block';
    }

    /**
     * Hide tooltip
     */
    function hideTooltip(tooltip) {
        tooltip.style.display = 'none';
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

            // Clear existing elements
            cy.elements().remove();

            // Add new elements
            if (data.elements) {
                cy.add(data.elements.nodes || []);
                cy.add(data.elements.edges || []);
            }

            // Apply layout
            applyLayout(elements.layoutSelect.value);

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
        const config = layoutConfigs[layoutName] || layoutConfigs.cose;
        const layout = cy.layout(config);
        layout.run();
    }

    /**
     * Show node details in the panel
     */
    function showNodeDetails(node) {
        const data = node.data();

        // Get connected nodes
        const incomers = node.incomers('edge');
        const outgoers = node.outgoers('edge');

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

        incomers.forEach(edge => {
            connections.push({
                nodeId: edge.source().id(),
                nodeLabel: edge.source().data('label'),
                nodeType: edge.data('fromType') || edge.source().data('entityType'),
                relation: edge.data('relationType'),
                direction: 'incoming'
            });
        });

        outgoers.forEach(edge => {
            connections.push({
                nodeId: edge.target().id(),
                nodeLabel: edge.target().data('label'),
                nodeType: edge.data('toType') || edge.target().data('entityType'),
                relation: edge.data('relationType'),
                direction: 'outgoing'
            });
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

        const connectedEdges = node.connectedEdges();
        const connectedNodes = connectedEdges.connectedNodes();

        // Fade all elements
        cy.elements().addClass('faded');

        // Highlight selected node and its connections
        node.removeClass('faded');
        connectedNodes.removeClass('faded');
        connectedEdges.removeClass('faded').addClass('highlighted');
    }

    /**
     * Clear all highlights
     */
    function clearHighlights() {
        cy.elements().removeClass('faded highlighted');
    }

    /**
     * Navigate to and select a specific node
     */
    function navigateToNode(nodeId) {
        const node = cy.getElementById(nodeId);
        if (node.length > 0) {
            cy.animate({
                center: { eles: node },
                zoom: 2
            }, {
                duration: 300
            });
            node.select();
            showNodeDetails(node);
            highlightConnections(node);
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

        cy.nodes().forEach(node => {
            const data = node.data();
            if (!entityTypes.has(data.entityType)) {
                entityTypes.set(data.entityType, data.color);
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
            cy.nodes().removeClass('faded highlighted');
            return;
        }

        cy.nodes().forEach(node => {
            const data = node.data();
            const matches = data.label.toLowerCase().includes(term) ||
                data.entityType.toLowerCase().includes(term);

            if (matches) {
                node.removeClass('faded').addClass('highlighted');
            } else {
                node.addClass('faded').removeClass('highlighted');
            }
        });

        // Also fade edges not connected to highlighted nodes
        cy.edges().forEach(edge => {
            const source = edge.source();
            const target = edge.target();
            if (source.hasClass('highlighted') || target.hasClass('highlighted')) {
                edge.removeClass('faded');
            } else {
                edge.addClass('faded');
            }
        });
    }

    /**
     * Export graph as PNG
     */
    function exportGraph() {
        const png = cy.png({
            output: 'blob',
            bg: '#ffffff',
            full: true,
            scale: 2
        });

        const databaseName = elements.databaseSelect.value.replace('.db', '');
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `memory-graph-${databaseName}-${timestamp}.png`;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(png);
        link.download = filename;
        link.click();

        URL.revokeObjectURL(link.href);
        showToast('Graph exported successfully', 'success');
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
            if (cy && cy.nodes().length > 0) {
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
            cy.fit(undefined, 50);
        });

        // Reset button
        elements.resetBtn.addEventListener('click', function () {
            cy.reset();
            clearHighlights();
            clearNodeDetails();
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
                    if (cy) cy.fit(undefined, 50);
                    break;
                case 'r':
                    if (cy) {
                        cy.reset();
                        clearHighlights();
                        clearNodeDetails();
                    }
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
    }

    /**
     * Initialize the application
     */
    function init() {
        initCytoscape();
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
