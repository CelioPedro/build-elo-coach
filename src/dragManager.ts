import interact from 'interactjs';

interface WidgetPosition {
    x: number;
    y: number;
}

/**
 * Initializes drag functionality for all elements with [data-widget-id].
 * - Uses interact.js for smooth dragging via the .drag-handle child
 * - Toggles setIgnoreMouseEvents on mouseenter/mouseleave
 * - Persists positions to main process via IPC on drag end
 * - Restores saved positions on initialization
 */
export async function initDragManager(): Promise<void> {
    const api = (window as any).electronAPI;

    // Load saved positions
    let savedPositions: Record<string, WidgetPosition> = {};
    try {
        savedPositions = (await api.loadWidgetPositions()) || {};
    } catch (err) {
        console.warn('[DragManager] Could not load saved positions:', err);
    }

    const widgets = document.querySelectorAll<HTMLElement>('[data-widget-id]');

    widgets.forEach((widget) => {
        const widgetId = widget.getAttribute('data-widget-id')!;

        // Restore saved position
        const saved = savedPositions[widgetId];
        if (saved) {
            widget.style.transform = `translate(${saved.x}px, ${saved.y}px)`;
            widget.setAttribute('data-x', String(saved.x));
            widget.setAttribute('data-y', String(saved.y));
        }

        // Mouse enter/leave for click-through toggle
        widget.addEventListener('mouseenter', () => {
            api.setIgnoreMouseEvents(false);
        });

        widget.addEventListener('mouseleave', () => {
            api.setIgnoreMouseEvents(true, { forward: true });
        });

        // Setup interact.js draggable
        interact(widget).draggable({
            // Only allow dragging from the handle
            allowFrom: '.drag-handle',

            inertia: true,

            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true,
                }),
            ],

            listeners: {
                start(event: any) {
                    event.target.classList.add('dragging');
                },

                move(event: any) {
                    const target = event.target as HTMLElement;
                    const x = (parseFloat(target.getAttribute('data-x') || '0')) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y') || '0')) + event.dy;

                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', String(x));
                    target.setAttribute('data-y', String(y));
                },

                end(event: any) {
                    event.target.classList.remove('dragging');

                    const target = event.target as HTMLElement;
                    const x = parseFloat(target.getAttribute('data-x') || '0');
                    const y = parseFloat(target.getAttribute('data-y') || '0');

                    // Persist position
                    api.saveWidgetPosition(widgetId, { x, y }).catch((err: any) => {
                        console.warn(`[DragManager] Failed to save position for ${widgetId}:`, err);
                    });
                },
            },
        });
    });

    console.log(`[DragManager] Initialized ${widgets.length} draggable widget(s)`);
}
