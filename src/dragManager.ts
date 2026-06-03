import interact from 'interactjs';
import { WidgetPosition } from './contracts/ipc';

interface DragEventLike {
    target: HTMLElement;
    dx: number;
    dy: number;
}

/**
 * Initializes drag functionality for all elements with [data-widget-id].
 * - Uses interact.js for smooth dragging via the .drag-handle child
 * - Enables dragging only when overlay edit mode is active
 * - Persists positions to main process via IPC on drag end
 * - Restores saved positions on initialization
 */
export async function initDragManager(): Promise<void> {
    const api = window.electronAPI;
    let editModeEnabled = false;

    // Load saved positions
    let savedPositions: Record<string, WidgetPosition> = {};
    try {
        savedPositions = (await api.loadWidgetPositions()) || {};
    } catch (err) {
        console.warn('[DragManager] Could not load saved positions:', err);
    }

    const widgets = document.querySelectorAll<HTMLElement>('[data-widget-id]');

    widgets.forEach((widget) => {
        const widgetId = widget.getAttribute('data-widget-id');
        if (!widgetId) return;

        // Restore saved position
        const saved = savedPositions[widgetId];
        if (saved) {
            widget.style.transform = `translate(${saved.x}px, ${saved.y}px)`;
            widget.setAttribute('data-x', String(saved.x));
            widget.setAttribute('data-y', String(saved.y));
        }

        // Setup interact.js draggable
        const interactable = interact(widget).draggable({
            // Only allow dragging from the handle
            allowFrom: '.drag-handle',
            enabled: editModeEnabled,

            inertia: true,

            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true,
                }),
            ],

            listeners: {
                start(event: DragEventLike) {
                    event.target.classList.add('dragging');
                },

                move(event: DragEventLike) {
                    const target = event.target as HTMLElement;
                    const x = (parseFloat(target.getAttribute('data-x') || '0')) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y') || '0')) + event.dy;

                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', String(x));
                    target.setAttribute('data-y', String(y));
                },

                end(event: DragEventLike) {
                    event.target.classList.remove('dragging');

                    const target = event.target as HTMLElement;
                    const x = parseFloat(target.getAttribute('data-x') || '0');
                    const y = parseFloat(target.getAttribute('data-y') || '0');

                    // Persist position
                    api.saveWidgetPosition(widgetId, { x, y }).catch((err: unknown) => {
                        console.warn(`[DragManager] Failed to save position for ${widgetId}:`, err);
                    });
                },
            },
        });

        const applyWidgetEditMode = (enabled: boolean) => {
            widget.setAttribute('data-edit-mode', String(enabled));
            interactable.draggable({ enabled });
        };

        applyWidgetEditMode(editModeEnabled);
    });

    const applyEditMode = (enabled: boolean) => {
        editModeEnabled = enabled;
        document.body.classList.toggle('is-editing', enabled);
        widgets.forEach((widget) => {
            widget.setAttribute('data-edit-mode', String(enabled));
            interact(widget).draggable({ enabled });
        });
    };

    try {
        applyEditMode(await api.getEditMode());
    } catch (err) {
        console.warn('[DragManager] Could not load edit mode state:', err);
    }

    api.onEditModeChanged(applyEditMode);

    console.log(`[DragManager] Initialized ${widgets.length} draggable widget(s)`);
}
