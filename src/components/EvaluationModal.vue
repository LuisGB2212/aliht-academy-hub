<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLmsStore } from '@/stores/aliht-context-store'
import type { ModuleEvaluation, EvaluationResult } from '@/types/academy-type'
import {
    CheckCircle2, XCircle, Loader2, Trophy, RotateCcw, ChevronDown,
    Upload, FileText, CheckCheck, AlertCircle
} from 'lucide-vue-next'

const props = defineProps<{
    evaluation: ModuleEvaluation
    moduleName: string
}>()

const emit = defineEmits<{
    (e: 'passed', result: EvaluationResult): void
    (e: 'skip'): void
    (e: 'close'): void
    (e: 'practice-submitted'): void
}>()

const store = useLmsStore()

// answers: { [questionId]: string[] }
const answers = ref<Record<string, string[]>>({})
const submitting = ref(false)
const result = ref<EvaluationResult | null>(null)
const step = ref<'quiz' | 'result'>('quiz')

// Header accordion — collapsed by default when description/exercise exist
const headerExpanded = ref(false)
const hasDetails = computed(() =>
    !!(props.evaluation.description || props.evaluation.practice_exercise)
)

// ─── Answer helpers ────────────────────────────────────────────────────────

function selectSingle(qId: string, optId: string) {
    answers.value[qId] = [optId]
}

function toggleMultiple(qId: string, optId: string) {
    const current = answers.value[qId] ?? []
    const idx = current.indexOf(optId)
    if (idx === -1) {
        answers.value[qId] = [...current, optId]
    } else {
        answers.value[qId] = current.filter(id => id !== optId)
    }
}

function isSelected(qId: string, optId: string): boolean {
    return (answers.value[qId] ?? []).includes(optId)
}

// Open answer: store the typed text as a single-element array
function setOpenAnswer(qId: string, text: string) {
    answers.value[qId] = text ? [text] : []
}

function getOpenAnswer(qId: string): string {
    return answers.value[qId]?.[0] ?? ''
}

// ─── Validation ────────────────────────────────────────────────────────────

const allAnswered = computed(() =>
    props.evaluation.questions.every(q => (answers.value[q.id] ?? []).length > 0)
)

// ─── Submit ────────────────────────────────────────────────────────────────

async function handleSubmit() {
    if (!allAnswered.value) return
    submitting.value = true
    try {
        const res = await store.submitEvaluation(props.evaluation.id, answers.value)
        if (res) {
            result.value = res
            step.value = 'result'
            // Cache the result by moduleId for trophy logic
            if (props.evaluation.module_id) {
                store.saveEvalResult(props.evaluation.module_id, res)
            }
        }
    } finally {
        submitting.value = false
    }
}

function retry() {
    answers.value = {}
    result.value = null
    step.value = 'quiz'
    practiceFile.value = null
    practiceUploading.value = false
    practiceSubmitted.value = false
    practiceError.value = ''
}

function handleFinish() {
    if (result.value?.passed) {
        emit('passed', result.value)
    } else {
        emit('close')
    }
}

const scoreColor = computed(() => {
    if (!result.value) return ''
    if (result.value.passed) return 'text-success'
    return 'text-destructive'
})

// ─── Practice Exercise Upload ───────────────────────────────────────────────

const hasPractice = computed(() =>
    !!props.evaluation.practice_exercise && result.value?.passed === true
)

const practiceFile      = ref<File | null>(null)
const practiceUploading = ref(false)
const practiceSubmitted = ref(false)
const practiceError     = ref('')

// Check if already submitted (from cache)
const alreadySubmitted = computed(() =>
    !!store.getPracticeSubmission(props.evaluation.id)
)

// User can finish when: no practice needed OR practice already submitted
const canFinish = computed(() => {
    if (!result.value?.passed) return true          // failed: just close
    if (!hasPractice.value) return true             // no practice needed
    return practiceSubmitted.value || alreadySubmitted.value
})

function onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    practiceFile.value = input.files?.[0] ?? null
    practiceError.value = ''
}

const ACCEPTED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4', 'video/quicktime', 'video/webm',
]
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.mp4,.mov,.webm'

async function handlePracticeUpload() {
    if (!practiceFile.value) return
    const file = practiceFile.value

    if (!ACCEPTED_TYPES.includes(file.type)) {
        practiceError.value = 'Tipo de archivo no permitido.'
        return
    }
    if (file.size > 300 * 1024 * 1024) { // 300 MB max
        practiceError.value = 'El archivo no debe superar 300 MB.'
        return
    }

    practiceUploading.value = true
    practiceError.value = ''

    try {
        // 1. Get presigned URL
        const authStore = (await import('@/stores/auth')).useAuthStore()
        const { apiRepository } = await import('@/utils/apiRepository')

        const presignRes = await apiRepository.post<{
            upload_url: string; public_url: string; key: string
        }>({
            endpoint: '/academy/upload/presigned-url',
            body: {
                file_name:   file.name,
                file_type:   file.type,
                upload_type: 'practice',
            },
        })

        if (!presignRes?.data?.upload_url) {
            practiceError.value = 'No se pudo obtener la URL de subida.'
            return
        }

        const { upload_url, public_url, key } = presignRes.data

        // 2. Upload directly to S3
        const s3Res = await fetch(upload_url, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
        })

        if (!s3Res.ok) {
            practiceError.value = 'Error al subir el archivo. Intenta de nuevo.'
            return
        }

        // 3. Register submission in backend
        const submission = await store.submitPracticeFile(props.evaluation.id, {
            file_url:  public_url,
            file_key:  key,
            file_type: file.type,
            file_name: file.name,
            module_id: props.evaluation.module_id,
        })

        if (submission) {
            practiceSubmitted.value = true
            emit('practice-submitted')
        } else {
            practiceError.value = 'Error al registrar el archivo. Intenta de nuevo.'
        }
    } catch (e) {
        console.error('[EvaluationModal] practice upload error:', e)
        practiceError.value = 'Error inesperado. Intenta de nuevo.'
    } finally {
        practiceUploading.value = false
    }
}
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                <div class="relative z-10 w-full max-w-2xl mx-auto max-h-[90vh] flex flex-col">
                    <div class="bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                        <!-- Header (accordion) -->
                        <div class="bg-primary shrink-0">
                            <!-- Always-visible summary row -->
                            <div class="px-6 pt-5"
                                :class="headerExpanded && hasDetails ? 'pb-2' : 'pb-5'">
                                <p class="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">{{ moduleName }}</p>
                                <div class="flex items-start justify-between gap-3">
                                    <div class="flex-1 min-w-0">
                                        <h2 class="text-lg font-bold text-white leading-tight">{{ evaluation.title }}</h2>
                                        <p class="text-white/70 text-xs mt-1.5">
                                            Puntaje mínimo para aprobar:
                                            <strong class="text-white">{{ evaluation.passing_score }}%</strong>
                                        </p>
                                    </div>
                                    <!-- Toggle button — only show if there are details -->
                                    <button v-if="hasDetails"
                                        @click="headerExpanded = !headerExpanded"
                                        type="button"
                                        class="shrink-0 mt-0.5 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-semibold transition-all"
                                        :title="headerExpanded ? 'Ocultar detalles' : 'Ver objetivo y ejercicio'">
                                        <span>{{ headerExpanded ? 'Ocultar' : 'Ver más' }}</span>
                                        <ChevronDown
                                            class="w-3.5 h-3.5 transition-transform duration-300"
                                            :class="headerExpanded ? 'rotate-180' : 'rotate-0'"
                                        />
                                    </button>
                                </div>
                            </div>

                            <!-- Collapsible details -->
                            <div
                                class="accordion-body overflow-hidden"
                                :class="headerExpanded ? 'accordion-open' : 'accordion-closed'">
                                <div class="px-6 pb-5 pt-1 space-y-3">
                                    <div v-if="evaluation.description" class="rounded-xl bg-white/10 px-4 py-3">
                                        <h4 class="text-white text-xs font-bold uppercase tracking-wider mb-1">Objetivo</h4>
                                        <p class="text-white/90 text-sm leading-relaxed">{{ evaluation.description }}</p>
                                    </div>
                                    <div v-if="evaluation.practice_exercise" class="rounded-xl bg-white/10 px-4 py-3">
                                        <h4 class="text-white text-xs font-bold uppercase tracking-wider mb-1">Ejercicio práctico</h4>
                                        <p class="text-white/90 text-sm leading-relaxed">{{ evaluation.practice_exercise }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ═══ QUIZ step ═══════════════════════════════════════ -->
                        <template v-if="step === 'quiz'">
                            <div class="overflow-y-auto flex-1 p-6 space-y-6">
                                <div v-for="(q, qi) in evaluation.questions" :key="q.id">
                                    <p class="text-sm font-semibold text-foreground mb-3">
                                        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full gradient-bg text-primary-foreground text-[10px] font-bold mr-2">{{ qi + 1 }}</span>
                                        {{ q.question }} <span class="text-xs font-medium ml-2" v-if="q.weight">({{ q.weight }} %)</span>
                                    </p>

                                    <div class="space-y-2">
                                        <!-- Open answer: textarea -->
                                        <template v-if="q.type === 'open_answer'">
                                            <div class="relative">
                                                <textarea
                                                    :value="getOpenAnswer(q.id)"
                                                    @input="setOpenAnswer(q.id, ($event.target as HTMLTextAreaElement).value)"
                                                    rows="4"
                                                    placeholder="Escribe tu respuesta aquí..."
                                                    class="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                                                />
                                                <span class="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
                                                    {{ getOpenAnswer(q.id).length }} caracteres
                                                </span>
                                            </div>
                                            <p class="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                                                Tu respuesta será evaluada automáticamente
                                            </p>
                                        </template>

                                        <!-- Choice-based questions -->
                                        <template v-else>
                                            <button v-for="opt in q.options" :key="opt.id"
                                                @click="q.type === 'multiple_choice' ? toggleMultiple(q.id, opt.id) : selectSingle(q.id, opt.id)"
                                                type="button"
                                                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-normal transition-all text-left"
                                                :class="isSelected(q.id, opt.id)
                                                    ? 'gradient-bg text-primary-foreground border-transparent shadow-md'
                                                    : 'bg-muted/30 border-border text-foreground hover:bg-muted hover:border-primary/30'">
                                                <span class="shrink-0 w-5 h-5 rounded flex items-center justify-center border-2 transition-all text-xs font-semibold"
                                                    :class="isSelected(q.id, opt.id)
                                                        ? 'border-white/60 bg-white/20 text-white'
                                                        : 'border-muted-foreground/30'">
                                                    <template v-if="q.type === 'multiple_choice'">
                                                        <CheckCircle2 v-if="isSelected(q.id, opt.id)" class="w-3.5 h-3.5" />
                                                    </template>
                                                    <template v-else>
                                                        {{ String.fromCharCode(65 + q.options.indexOf(opt)) }}
                                                    </template>
                                                </span>
                                                {{ opt.text }}
                                            </button>

                                            <p v-if="q.type === 'multiple_choice'" class="text-[10px] text-muted-foreground mt-1.5 ml-1">
                                                Selección múltiple — elige todas las que apliquen
                                            </p>
                                        </template>
                                    </div>
                                </div>
                            </div>

                            <!-- Footer -->
                            <div class="px-6 py-4 border-t border-border/50 bg-muted/10 shrink-0 flex items-center justify-end">
                                <!-- <button @click="emit('skip')"
                                    class="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                    Omitir evaluación
                                </button> -->
                                <button @click="handleSubmit" :disabled="!allAnswered || submitting"
                                    class="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-bg text-primary-foreground text-sm font-bold shadow-md hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100">
                                    <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
                                    {{ submitting ? 'Enviando...' : 'Enviar respuestas' }}
                                </button>
                            </div>
                        </template>

                        <!-- ═══ RESULT step ═════════════════════════════════════ -->
                        <template v-else>
                            <div class="overflow-y-auto flex-1 p-8">
                                <!-- Score block -->
                                <div class="text-center mb-6">
                                    <!-- Icon -->
                                    <div class="mb-5">
                                        <Trophy v-if="result?.passed" class="w-14 h-14 text-yellow-400 mx-auto" />
                                        <XCircle v-else class="w-14 h-14 text-destructive mx-auto" />
                                    </div>

                                    <!-- Score -->
                                    <p class="text-5xl font-bold mb-1" :class="scoreColor">{{ result?.score }}%</p>
                                    <p class="text-sm text-muted-foreground mb-4">
                                        Puntaje mínimo requerido: <strong>{{ result?.passing_score }}%</strong>
                                    </p>

                                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4"
                                        :class="result?.passed
                                            ? 'bg-success/10 text-success border border-success/20'
                                            : 'bg-destructive/10 text-destructive border border-destructive/20'">
                                        <CheckCircle2 v-if="result?.passed" class="w-4 h-4" />
                                        <XCircle v-else class="w-4 h-4" />
                                        {{ result?.passed ? '¡Aprobado!' : 'No aprobado' }}
                                    </div>

                                    <p v-if="result?.passed && !hasPractice" class="text-sm text-muted-foreground leading-relaxed">
                                        ¡Excelente! Has superado la evaluación del módulo <strong class="text-foreground">{{ moduleName }}</strong>.
                                    </p>
                                    <p v-else-if="!result?.passed" class="text-sm text-muted-foreground leading-relaxed">
                                        No alcanzaste el puntaje mínimo. Puedes revisar el material e intentarlo de nuevo.
                                    </p>
                                </div>

                                <!-- ── Practice Exercise upload block ─────────────── -->
                                <div v-if="hasPractice"
                                    class="mt-2 rounded-2xl border-2 overflow-hidden"
                                    :class="(practiceSubmitted || alreadySubmitted) ? 'border-success/40 bg-success/5' : 'border-primary/20 bg-primary/5'">

                                    <!-- Already submitted -->
                                    <div v-if="practiceSubmitted || alreadySubmitted" class="p-5 text-center">
                                        <CheckCheck class="w-8 h-8 text-success mx-auto mb-2" />
                                        <p class="font-bold text-success text-sm">¡Archivo entregado correctamente!</p>
                                        <p class="text-xs text-muted-foreground mt-1">Tu ejercicio práctico está en revisión.</p>
                                    </div>

                                    <!-- Upload form -->
                                    <div v-else class="p-5">
                                        <div class="flex items-center gap-2 mb-3">
                                            <div class="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center shrink-0">
                                                <Upload class="w-3.5 h-3.5 text-white" />
                                            </div>
                                            <div>
                                                <p class="text-sm font-bold text-foreground">Siguiente paso: Ejercicio Práctico</p>
                                                <p class="text-xs text-muted-foreground">Sube tu archivo para completar el módulo</p>
                                            </div>
                                        </div>

                                        <!-- Practice description (short reminder) -->
                                        <p class="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 mb-3 leading-relaxed">
                                            {{ evaluation.practice_exercise }}
                                        </p>

                                        <!-- File picker -->
                                        <label class="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl px-4 py-5 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group">
                                            <component :is="practiceFile ? FileText : Upload"
                                                class="w-6 h-6 transition-colors"
                                                :class="practiceFile ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'" />
                                            <span class="text-xs font-semibold"
                                                :class="practiceFile ? 'text-foreground' : 'text-muted-foreground'">
                                                {{ practiceFile ? practiceFile.name : 'Seleccionar archivo' }}
                                            </span>
                                            <span v-if="practiceFile" class="text-[10px] text-muted-foreground">
                                                {{ (practiceFile.size / 1024 / 1024).toFixed(2) }} MB
                                            </span>
                                            <span v-else class="text-[10px] text-muted-foreground/70">
                                                Imagen, PDF, Word, Video — máx. 300 MB
                                            </span>
                                            <input type="file" class="hidden" :accept="ACCEPTED_EXTENSIONS" @change="onFileSelected" />
                                        </label>

                                        <!-- Error -->
                                        <div v-if="practiceError" class="flex items-center gap-2 mt-2 text-destructive text-xs">
                                            <AlertCircle class="w-3.5 h-3.5 shrink-0" />
                                            {{ practiceError }}
                                        </div>

                                        <!-- Upload button -->
                                        <button v-if="practiceFile" @click="handlePracticeUpload"
                                            :disabled="practiceUploading"
                                            class="w-full mt-3 gradient-bg text-primary-foreground text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:scale-100">
                                            <Loader2 v-if="practiceUploading" class="w-4 h-4 animate-spin" />
                                            <Upload v-else class="w-4 h-4" />
                                            {{ practiceUploading ? 'Subiendo...' : 'Entregar ejercicio' }}
                                        </button>
                                    </div>
                                </div>

                                <!-- Actions -->
                                <div class="flex gap-3 w-full mt-6">
                                    <button v-if="!result?.passed" @click="retry"
                                        class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-colors">
                                        <RotateCcw class="w-4 h-4" />
                                        Reintentar
                                    </button>
                                    <button @click="handleFinish" :disabled="!canFinish"
                                        class="flex-1 gradient-bg text-primary-foreground font-bold py-2.5 px-4 rounded-xl shadow-md hover:scale-[1.02] transition-transform text-sm disabled:opacity-40 disabled:scale-100">
                                        {{ result?.passed ? (canFinish ? 'Continuar' : 'Sube el archivo para continuar') : 'Cerrar' }}
                                    </button>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

/* ── Accordion ─────────────────────────────────────────── */
.accordion-body {
    transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                opacity   0.3s  ease;
}
.accordion-closed {
    max-height: 0;
    opacity: 0;
}
.accordion-open {
    max-height: 32rem; /* tall enough for any realistic text */
    opacity: 1;
}
</style>
