<script setup lang="ts">
/**
 * PdfViewer.vue - Optimizado para pdfjs-dist v5.7.284
 * 
 * Funcionalidades:
 *   - Renderizado HD por Canvas (Ajustado por Device Pixel Ratio).
 *   - Control de Zoom interactivo (+ / - / Reset).
 *   - Ir a página específica (Navegación).
 *   - Buscador de texto (Muestra en qué páginas aparece la palabra).
 *   - Enlaces hipervínculos (URLs nativas del PDF funcionales).
 */

import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import { SimpleLinkService, LinkTarget, EventBus } from "pdfjs-dist/web/pdf_viewer.mjs";
import "pdfjs-dist/web/pdf_viewer.css"; 

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

const props = defineProps<{ src: string }>()
const emit  = defineEmits<{ (e: 'read'): void }>()

// ─── State ────────────────────────────────────────────────────────────────────
const containerRef     = ref<HTMLDivElement | null>(null)
const loadingPdf       = ref(true)
const errorMsg         = ref('')
const totalPages       = ref(0)
const currentPage      = ref(1)
const lastPageRead     = ref(false)

// Controles de Interfaz
const zoomLevel        = ref(1.0) // Factor multiplicador base
const targetPage       = ref(1)   // Input de navegación
const searchQuery      = ref('')  // Palabra a buscar
const searchResults    = ref<number[]>([]) // Páginas que contienen la palabra

let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null
let observer: IntersectionObserver | null = null


// ─── Load & Render ────────────────────────────────────────────────────────────
async function loadPdf(src: string) {
    if (!src) return
    cleanup()
    loadingPdf.value = true
    errorMsg.value   = ''
    lastPageRead.value = false
    currentPage.value  = 1
    totalPages.value   = 0
    zoomLevel.value    = 1.0
    searchResults.value = []

    try {
        pdfDoc = await pdfjsLib.getDocument({ url: src, withCredentials: false }).promise
        totalPages.value = pdfDoc.numPages

        await nextTick()
        await renderAllPages()
        setupObserver()
    } catch (e: any) {
        console.error('[PdfViewer] load error:', e)
        errorMsg.value = 'No se pudo cargar el documento PDF.'
    } finally {
        loadingPdf.value = false
    }
}

async function renderAllPages() {
    if (!pdfDoc || !containerRef.value) return
    
    // ── Guardar scroll relativo (% del total) antes de destruir ──
    const container = containerRef.value
    const scrollRatio = container.scrollHeight > 0
        ? container.scrollTop / container.scrollHeight
        : 0

    // containerRef.value.innerHTML = ''
    let containerRefTemp = [];
    const outputScale = window.devicePixelRatio || 1
    // Ancho base del contenedor menos paddings internos
    // const containerWidth = (containerRef.value.clientWidth || 800) 

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        try {
            const page = await pdfDoc.getPage(i)
            const unscaledViewport = page.getViewport({ scale: 1.05 })
            // Escala calculada combinando el ancho disponible y el nivel de zoom elegido por el usuario
            const scale = (containerRef.value.clientWidth / unscaledViewport.width) * zoomLevel.value
            const viewport = page.getViewport({ scale: scale })

            // Wrapper de página
            const wrapper = document.createElement('div')
            wrapper.dataset.page = String(i)
            wrapper.id = `pdf-page-${i}`
            wrapper.className = 'pdf-page-wrapper'
            // wrapper.style.cssText = `position: relative; width: ${Math.floor(viewport.width)}px; height: ${Math.floor(viewport.height)}px; margin-bottom: 1rem;`
            wrapper.style.cssText = `
                position: relative;
                width: ${viewport.width}px;
                height: ${viewport.height}px;
                margin-bottom: 1rem;
                --total-scale-factor: ${scale};
                --scale-round-x: 1px;
                --scale-round-y: 1px;
            `;

            // Canvas HD
            const canvas = document.createElement('canvas')
            canvas.width = Math.floor(viewport.width * outputScale)
            canvas.height = Math.floor(viewport.height * outputScale)
            canvas.style.cssText = 'border-radius:4px; background-color: #ffffff; width: 100%; display: block; position: absolute; top: 0; left: 0; z-index: 1;'
            wrapper.appendChild(canvas)

            // Capa de Anotaciones simplificada (Solo para links clickeables)
            const annotationLayerDiv = document.createElement('div')
            annotationLayerDiv.className = 'annotationLayer'
            annotationLayerDiv.style.cssText = 'position: absolute; top: 0; left: 0;'
            wrapper.appendChild(annotationLayerDiv)

            // containerRef.value.appendChild(wrapper)
            containerRefTemp.push(wrapper);

            const context = canvas.getContext('2d')
            if (!context) continue

            const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null

            // 1. Renderizar gráficos
            await page.render({
                canvasContext: context,
                canvas: canvas,
                transform: transform ?? undefined,
                viewport: viewport,
            }).promise

            // 2. Renderizar enlaces (AnnotationLayer en v5.7.284)
            const clonedViewport = viewport.clone({ dontFlip: true });
            const annotations = await page.getAnnotations({ intent: "display" });

            // SimpleLinkService extiende PDFLinkService, no necesita EventBus
            const linkService = new SimpleLinkService({
                eventBus: new EventBus(),
                externalLinkTarget: LinkTarget.BLANK,                 // nueva pestaña
                externalLinkRel: "noopener noreferrer nofollow",
            });

            const annotationLayer = new pdfjsLib.AnnotationLayer({
                div: annotationLayerDiv,
                viewport: clonedViewport,
                page,
                linkService,
                annotationStorage: pdfDoc.annotationStorage,
                accessibilityManager: null,
                annotationCanvasMap: null,
                annotationEditorUIManager: null,
                structTreeLayer: null,
                commentManager: null,
            });

            annotationLayer.zIndex = 2;

            await annotationLayer.render({
                annotations,
                viewport: clonedViewport,
                div: annotationLayerDiv,
                page,
                linkService,
                annotationStorage: pdfDoc.annotationStorage,
                imageResourcesPath: "",
                renderForms: false,
            });

        } catch (e) {
            console.error(`[PdfViewer] Error en página ${i}:`, e)
            continue
        }
    }

    // ── Reemplazar DOM y restaurar scroll ──
    container.innerHTML = ''
    container.append(...containerRefTemp)

    await nextTick()

    // Restaurar posición proporcional al nuevo scrollHeight
    container.scrollTop = scrollRatio * container.scrollHeight
}

// ─── Funcionalidades de Control ────────────────────────────────────────────────

// Cambiar de escala (Zoom)
async function changeZoom(modifier: number) {
    // 1. Guardar página visible actual ANTES del zoom
    const pageToRestore = currentPage.value

    if (modifier === 0) {
        zoomLevel.value = 1.0
    } else {
        const nextZoom = parseFloat((zoomLevel.value + modifier).toFixed(1))
        if (nextZoom >= 0.5 && nextZoom <= 3.0) {
            zoomLevel.value = nextZoom
        }
    }

    // 2. Pausar observer durante el re-render
    observer?.disconnect()

    // 3. Re-renderizar con nuevo zoom
    await renderAllPages()

    // 4. Ir a la página donde estaba el usuario
    await nextTick()
    const el = document.getElementById(`pdf-page-${pageToRestore}`)
    if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' })
    }

    // 5. Reactivar observer
    setupObserver()
}

// Navegar a página específica
function goToPage() {
    if (targetPage.value < 1 || targetPage.value > totalPages.value) return
    const el = document.getElementById(`pdf-page-${targetPage.value}`)
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
}

// Buscador de palabras básico (Busca texto asíncronamente en el PDF original)
async function searchWord() {
    if (!pdfDoc || !searchQuery.value.trim()) {
        searchResults.value = []
        return
    }
    
    const query = searchQuery.value.toLowerCase().trim()
    const pagesFound: number[] = []

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i)
        const textContent = await page.getTextContent()
        const fullText = textContent.items.map((item: any) => item.str).join(' ').toLowerCase()
        
        if (fullText.includes(query)) {
            pagesFound.push(i)
        }
    }
    searchResults.value = pagesFound
}

// ─── Observers ────────────────────────────────────────────────────────────────
function setupObserver() {
    observer?.disconnect()
    if (!containerRef.value) return

    observer = new IntersectionObserver(
        (entries) => {
            let mostVisible = entries
                .filter(e => e.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

            if (!mostVisible) return

            const pageNum = parseInt((mostVisible.target as HTMLElement).dataset.page || '1')
            currentPage.value = pageNum
            targetPage.value = pageNum

            if (pageNum === totalPages.value && !lastPageRead.value) {
                lastPageRead.value = true
                emit('read')
            }
        },
        { root: containerRef.value, threshold: 0.3, rootMargin: '0px' }
    )

    containerRef.value.querySelectorAll('[data-page]').forEach(el => observer!.observe(el))
}

function cleanup() {
    observer?.disconnect()
    observer = null
    pdfDoc?.destroy()
    pdfDoc = null
}

onMounted(() => loadPdf(props.src))
onBeforeUnmount(cleanup)
watch(() => props.src, (src) => loadPdf(src))
</script>

<template>
    <div class="pdf-viewer-root flex flex-col h-full border border-border/60 rounded-xl overflow-hidden bg-muted/5">
        
        <!-- Barra de herramientas superior profesional -->
        <div class="pdf-toolbar flex flex-wrap items-center justify-between gap-3 p-3 bg-white border-b border-border/60 shadow-sm z-10">
            
            <!-- Buscador -->
            <div class="flex items-center gap-2">
                <input 
                    v-model="searchQuery" 
                    type="text" 
                    placeholder="Buscar palabra..." 
                    @keyup.enter="searchWord"
                    class="px-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 w-44"
                />
                <button @click="searchWord" class="px-3 py-1.5 text-xs bg-zinc-900 text-white font-medium rounded-lg hover:bg-zinc-800 transition">
                    Buscar
                </button>
                <span v-if="searchResults.length > 0" class="text-[11px] text-muted-foreground bg-zinc-100 px-2 py-0.5 rounded">
                    Encontrado en pág: {{ searchResults.join(', ') }}
                </span>
            </div>

            <!-- Controles de Navegación e indicador -->
            <div class="flex items-center gap-2">
                <span class="text-xs text-muted-foreground font-medium">Ir a:</span>
                <input 
                    v-model.number="targetPage" 
                    type="number" 
                    min="1" 
                    :max="totalPages"
                    @keyup.enter="goToPage"
                    class="w-12 px-2 py-1 text-center text-xs border border-border rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span class="text-xs text-muted-foreground">de {{ totalPages }}</span>
                <button @click="goToPage" class="p-1.5 hover:bg-zinc-100 rounded-lg transition" title="Ir a la página">
                    <svg class="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>
                </button>
            </div>

            <!-- Controles de Zoom -->
            <div class="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg">
                <button @click="changeZoom(-0.1)" class="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition text-zinc-700 text-xs font-bold" title="Alejar">
                    －
                </button>
                <button @click="changeZoom(0)" class="px-2 py-1 text-[11px] hover:bg-white hover:shadow-sm rounded-md transition font-medium text-zinc-600" title="Restaurar escala">
                    {{ Math.round(zoomLevel * 100) }}%
                </button>
                <button @click="changeZoom(0.1)" class="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition text-zinc-700 text-xs font-bold" title="Acercar">
                    ＋
                </button>
            </div>
        </div>

        <!-- Contenedor del PDF (Scrollable) -->
        <div ref="containerRef" class="pdf-canvas-container flex-1 bg-zinc-50 overflow-y-auto p-4 w-full items-center" style="justify-items: center;"/>

        
        <!-- Loading state -->
        <div v-if="loadingPdf" class="flex flex-col items-center justify-center py-20 gap-4 flex-1">
            <div class="w-10 h-10 rounded-full border-4 border-zinc-200 border-t-zinc-900 animate-spin" />
            <p class="text-sm text-zinc-500">Cargando documento en alta definición...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="errorMsg" class="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400 flex-1">
            <svg class="w-10 h-10 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p class="text-sm">{{ errorMsg }}</p>
        </div>

        <!-- Barra inferior de estado -->
        <div v-if="!loadingPdf && !errorMsg && totalPages > 0" class="flex items-center justify-between px-4 py-2 text-xs text-zinc-500 border-t border-border/40 bg-zinc-50/50">
            <span>Página visible: {{ currentPage }} de {{ totalPages }}</span>
            <span v-if="lastPageRead" class="flex items-center gap-1 text-emerald-600 font-medium">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Lectura completada
            </span>
        </div>
    </div>
</template>

<style scoped>
.pdf-viewer-root {
    width: 100%;
}

.pdf-canvas-container {
    width: 100%;
    max-height: 550px;
    scroll-behavior: smooth;
}

/* Sombreado elegante para simular hojas reales de papel */
:deep(.pdf-page-wrapper) {
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05), 0 0 0 1px rgb(0 0 0 / 0.05);
    transition: width 0.2s ease, height 0.2s ease;
}

/* Permitir clics exclusivamente en los enlaces generados por PDF.js */
:deep(.annotationLayer) {
    pointer-events: none;
}

:deep(.annotationLayer a) {
    pointer-events: auto;
    cursor: pointer;
}

/* Ocultar bordes predeterminados raros del CSS de Mozilla en las anotaciones */
:deep(.annotationLayer .linkAnnotation) {
    border: none !important;
    background: transparent !important;
}

.pdf-canvas-container::-webkit-scrollbar {
    width: 8px;
}
.pdf-canvas-container::-webkit-scrollbar-track {
    background: transparent;
}
.pdf-canvas-container::-webkit-scrollbar-thumb {
    background: #e4e4e7;
    border-radius: 4px;
}
.pdf-canvas-container::-webkit-scrollbar-thumb:hover {
    background: #d4d4d8;
}
</style>
