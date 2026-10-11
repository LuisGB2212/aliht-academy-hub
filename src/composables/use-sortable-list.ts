import { watch, type Ref } from 'vue'
import Sortable from 'sortablejs'

/**
 * Binds SortableJS to a template ref.
 *
 * - Re-creates the instance every time the element is (re)rendered, e.g. when a
 *   `v-if` / `v-else` swaps it, and destroys the previous one.
 * - Only children with the `.sortable-item` class are draggable, so siblings like
 *   a search box or an empty state don't shift the indexes.
 * - Reverts the DOM move made by Sortable so Vue stays the only owner of the list
 *   order; `onMove` must update the reactive array instead.
 */
export function useSortableList(
    elRef: Ref<HTMLElement | null>,
    onMove: (oldIndex: number, newIndex: number) => void | Promise<void>,
    options: Omit<Sortable.Options, 'onStart' | 'onEnd' | 'draggable'> = {},
) {
    watch(elRef, (el, _prev, onCleanup) => {
        if (!el) return

        // Node that followed the dragged item (may be a Vue text/comment anchor)
        let originalNext: Node | null = null

        const sortable = Sortable.create(el, {
            handle: '.drag-handle',
            draggable: '.sortable-item',
            animation: 150,
            ghostClass: 'opacity-50',
            ...options,
            onStart: (evt) => {
                originalNext = evt.item.nextSibling
            },
            onEnd: (evt) => {
                const { item, from, oldDraggableIndex, newDraggableIndex } = evt

                // Always restore, even when dropped in place: Sortable may have
                // appended the item after Vue's v-for anchors
                from.insertBefore(item, originalNext)
                originalNext = null

                if (
                    oldDraggableIndex === undefined ||
                    newDraggableIndex === undefined ||
                    oldDraggableIndex === newDraggableIndex
                ) return

                onMove(oldDraggableIndex, newDraggableIndex)
            },
        })

        onCleanup(() => sortable.destroy())
    }, { flush: 'post' })
}

/** Returns a copy of `list` with the item at `from` moved to `to`. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
    const copy = [...list]
    const [moved] = copy.splice(from, 1)
    copy.splice(to, 0, moved)
    return copy
}
