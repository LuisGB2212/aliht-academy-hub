<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLmsStore } from '@/stores/aliht-context-store'
import type { ModuleEvaluation, EvaluationResult } from '@/types/academy-type'
import { CheckCircle2, XCircle, Loader2, Trophy, RotateCcw } from 'lucide-vue-next'

const props = defineProps<{
    evaluation: ModuleEvaluation
    moduleName: string
}>()

const emit = defineEmits<{
    (e: 'passed', result: EvaluationResult): void
    (e: 'skip'): void
    (e: 'close'): void
}>()

const store = useLmsStore()

// answers: { [questionId]: string[] }
const answers = ref<Record<string, string[]>>({})
const submitting = ref(false)
const result = ref<EvaluationResult | null>(null)
const step = ref<'quiz' | 'result'>('quiz')

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
        }
    } finally {
        submitting.value = false
    }
}

function retry() {
    answers.value = {}
    result.value = null
    step.value = 'quiz'
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
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                <div class="relative z-10 w-full max-w-2xl mx-auto max-h-[90vh] flex flex-col">
                    <div class="bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                        <!-- Header -->
                        <div class="gradient-bg px-6 py-5 shrink-0">
                            <p class="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">{{ moduleName }}</p>
                            <h2 class="text-lg font-bold text-white">{{ evaluation.title }}</h2>
                            <div v-if="evaluation.description">
                                <h4 class="text-white/70 text-md mt-1">Objetivo</h4>
                                <p class="text-white/70 text-sm mt-1">{{ evaluation.description }}</p>
                            </div>
                            <div v-if="evaluation.practice_exercise">
                                <h4 class="text-white/70 text-md mt-1">Ejercicio práctico</h4>
                                <p class="text-white/70 text-sm mt-1">{{ evaluation.practice_exercise }}</p>
                            </div>
                            <p class="text-white/60 text-xs mt-2">Puntaje mínimo para aprobar: <strong class="text-white">{{ evaluation.passing_score }}%</strong></p>
                        </div>

                        <!-- ═══ QUIZ step ═══════════════════════════════════════ -->
                        <template v-if="step === 'quiz'">
                            <div class="overflow-y-auto flex-1 p-6 space-y-6">
                                <div v-for="(q, qi) in evaluation.questions" :key="q.id">
                                    <p class="text-sm font-semibold text-foreground mb-3">
                                        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full gradient-bg text-primary-foreground text-[10px] font-bold mr-2">{{ qi + 1 }}</span>
                                        {{ q.question }}
                                    </p>

                                    <div class="space-y-2">
                                        <button v-for="opt in q.options" :key="opt.id"
                                            @click="q.type === 'multiple_choice' ? toggleMultiple(q.id, opt.id) : selectSingle(q.id, opt.id)"
                                            type="button"
                                            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left"
                                            :class="isSelected(q.id, opt.id)
                                                ? 'gradient-bg text-primary-foreground border-transparent shadow-md'
                                                : 'bg-muted/30 border-border text-foreground hover:bg-muted hover:border-primary/30'">
                                            <span class="shrink-0 w-5 h-5 rounded flex items-center justify-center border-2 transition-all text-xs font-bold"
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
                                    </div>

                                    <p v-if="q.type === 'multiple_choice'" class="text-[10px] text-muted-foreground mt-1.5 ml-1">
                                        Selección múltiple — elige todas las que apliquen
                                    </p>
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
                            <div class="p-8 text-center flex-1 flex flex-col items-center justify-center">
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

                                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-6"
                                    :class="result?.passed
                                        ? 'bg-success/10 text-success border border-success/20'
                                        : 'bg-destructive/10 text-destructive border border-destructive/20'">
                                    <CheckCircle2 v-if="result?.passed" class="w-4 h-4" />
                                    <XCircle v-else class="w-4 h-4" />
                                    {{ result?.passed ? '¡Aprobado!' : 'No aprobado' }}
                                </div>

                                <p v-if="result?.passed" class="text-sm text-muted-foreground mb-6 leading-relaxed">
                                    ¡Excelente! Has superado la evaluación del módulo <strong class="text-foreground">{{ moduleName }}</strong>.
                                </p>
                                <p v-else class="text-sm text-muted-foreground mb-6 leading-relaxed">
                                    No alcanzaste el puntaje mínimo. Puedes revisar el material e intentarlo de nuevo.
                                </p>

                                <div class="flex gap-3 w-full">
                                    <button v-if="!result?.passed" @click="retry"
                                        class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:bg-muted transition-colors">
                                        <RotateCcw class="w-4 h-4" />
                                        Reintentar
                                    </button>
                                    <button @click="handleFinish"
                                        class="flex-1 gradient-bg text-primary-foreground font-bold py-2.5 px-4 rounded-xl shadow-md hover:scale-[1.02] transition-transform text-sm">
                                        {{ result?.passed ? 'Continuar' : 'Cerrar' }}
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
</style>
