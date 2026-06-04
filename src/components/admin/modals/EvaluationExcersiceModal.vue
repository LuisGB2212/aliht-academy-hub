<script setup lang="ts">
import { Loader2, X, FileText, Image, Film, File, Star, MessageSquare, AlertCircle, Send, ExternalLink } from 'lucide-vue-next';
import { EvaluationExcersiceComposable } from '@/composables/use-evaluation-excersice';
import AreaScroll from '@/components/ui/AreaScroll.vue';

const { evaluationExcersiceComposable } = defineProps<{
    evaluationExcersiceComposable: EvaluationExcersiceComposable
}>()

const { state, calMaxScore, closeShowCalSubmisionModal, submitPracticeReview } = evaluationExcersiceComposable;

function getFileIcon(fileType: string) {
    if (!fileType) return 'file'
    const t = fileType.toLowerCase()
    if (t.startsWith('image')) return 'image'
    if (t.startsWith('video')) return 'video'
    if (t === 'application/pdf' || t.includes('pdf')) return 'pdf'
    return 'file'
}
</script>

<template>
    <!-- ═══ Archivo Calificacion Modal ═══════════════════════════════════════════ -->
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="state.showCalSubmisionModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeShowCalSubmisionModal" />

                <div class="relative z-10 w-full max-w-2xl mx-auto max-h-[92vh] flex flex-col">
                    <form @submit.prevent="async () => {
                        await submitPracticeReview()
                        $emit('refreshStats')
                        }" class="bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

                        <!-- Header -->
                        <div class="flex items-start justify-between px-6 py-4 border-b border-border/50 shrink-0">
                            <div>
                                <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                                    Ejercicio Práctico · Calificación
                                </p>
                                <h2 class="text-base font-bold text-foreground">
                                    Calificar Ejercicio
                                </h2>
                            </div>
                            <button @click="closeShowCalSubmisionModal" class="p-2 rounded-lg hover:bg-muted transition-colors shrink-0">
                                <X class="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>

                        <!-- Loading -->
                        <div v-if="state.calSubmisionLoading" class="flex items-center justify-center py-16">
                            <Loader2 class="w-6 h-6 animate-spin text-primary" />
                        </div>

                        <AreaScroll v-else>
                            <div class="space-y-5">
                                <!-- ─ Info del usuario ─────────────────────────── -->
                                <div class="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/40">
                                    <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                                        {{ state.calSubmisionUser?.user_name?.charAt(0).toUpperCase() }}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="font-bold text-sm text-foreground truncate">{{ state.calSubmisionUser?.user_name }}</p>
                                        <p class="text-[10px] text-muted-foreground truncate">{{ state.calSubmisionUser?.user_email }} · {{ state.calSubmisionUser?.agency_name }}</p>
                                    </div>
                                    <!-- Score de la evaluación del usuario -->
                                    <div v-if="state.calSubmisionUser?.evaluation_score != null" class="text-center shrink-0">
                                        <p class="text-xl font-black leading-none"
                                            :class="state.calSubmisionUser.evaluation_passed ? 'text-success' : 'text-destructive'">
                                            {{ state.calSubmisionUser.evaluation_score }}%
                                        </p>
                                        <p class="text-[9px] font-semibold uppercase tracking-wider mt-0.5 text-muted-foreground">Evaluación</p>
                                    </div>
                                </div>

                                <!-- ─ Descripción del ejercicio práctico ────── -->
                                <div v-if="state.calSubmisionUser?.practice_exercise"
                                    class="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                                    <div class="flex items-center gap-2 mb-2">
                                        <FileText class="w-4 h-4 text-primary" />
                                        <span class="text-xs font-bold uppercase tracking-wider text-primary">Enunciado del Ejercicio</span>
                                    </div>
                                    <p class="text-sm text-foreground leading-relaxed whitespace-pre-line">{{ state.calSubmisionUser?.practice_exercise }}</p>
                                </div>

                                <!-- ─ Archivo enviado ────────────────────────── -->
                                <div v-if="state.calSubmisionUser?.practice_submission">
                                    <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Archivo enviado</p>

                                    <!-- Meta del archivo -->
                                    <div class="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-muted/20 mb-3">
                                        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                            :class="{
                                                'bg-blue-500/10 text-blue-500': getFileIcon(    state.calSubmisionUser.practice_submission.file_type) === 'image',
                                                'bg-purple-500/10 text-purple-500': getFileIcon(state.calSubmisionUser.practice_submission.file_type) === 'video',
                                                'bg-red-500/10 text-red-500': getFileIcon(state.calSubmisionUser.practice_submission.file_type) === 'pdf',
                                                'bg-muted text-muted-foreground': getFileIcon(state.calSubmisionUser.practice_submission.file_type) === 'file',
                                            }">
                                            <Image v-if="getFileIcon(state.calSubmisionUser.practice_submission.file_type) === 'image'" class="w-5 h-5" />
                                            <Film v-else-if="getFileIcon(state.calSubmisionUser.practice_submission.file_type) === 'video'" class="w-5 h-5" />
                                            <FileText v-else-if="getFileIcon(state.calSubmisionUser.practice_submission.file_type) === 'pdf'" class="w-5 h-5" />
                                            <File v-else class="w-5 h-5" />
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-sm font-semibold text-foreground truncate">
                                                {{ state.calSubmisionUser.practice_submission.file_name || 'Archivo sin nombre' }}
                                            </p>
                                            <p class="text-[10px] text-muted-foreground font-mono">
                                                {{ state.calSubmisionUser.practice_submission.file_type }}
                                                · Enviado {{ state.calSubmisionUser.practice_submission.created_at
                                                    ? new Date(state.calSubmisionUser.practice_submission.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                                                    : '—' }}
                                            </p>
                                        </div>
                                        <a :href="state.calSubmisionUser.practice_submission.file_url"
                                            target="_blank" rel="noopener"
                                            class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                            <ExternalLink class="w-3.5 h-3.5" />
                                            Abrir
                                        </a>
                                    </div>

                                    <!-- Preview del archivo -->
                                    <!-- Imagen -->
                                    <div v-if="getFileIcon(state.calSubmisionUser.practice_submission.file_type) === 'image'"
                                        class="rounded-2xl overflow-hidden border border-border/40 bg-muted/20">
                                        <img :src="state.calSubmisionUser.practice_submission.file_url"
                                            alt="Vista previa"
                                            class="w-full max-h-64 object-contain" />
                                    </div>

                                    <!-- Video -->
                                    <div v-else-if="getFileIcon(state.calSubmisionUser.practice_submission.file_type) === 'video'"
                                        class="rounded-2xl overflow-hidden border border-border/40 bg-black">
                                        <video :src="state.calSubmisionUser.practice_submission.file_url"
                                            controls
                                            class="w-full max-h-64" />
                                    </div>

                                    <!-- PDF -->
                                    <div v-else-if="getFileIcon(state.calSubmisionUser.practice_submission.file_type) === 'pdf'"
                                        class="rounded-2xl overflow-hidden border border-border/40 bg-muted/10">
                                        <iframe :src="state.calSubmisionUser.practice_submission.file_url"
                                            class="w-full h-64"
                                            frameborder="0"
                                            title="Vista previa PDF" />
                                    </div>

                                    <!-- Otro tipo -->
                                    <div v-else
                                        class="rounded-2xl border border-border/40 bg-muted/10 p-6 flex flex-col items-center gap-2 text-muted-foreground">
                                        <File class="w-10 h-10 opacity-40" />
                                        <p class="text-xs">Vista previa no disponible para este tipo de archivo.</p>
                                    </div>
                                </div>

                                <!-- ─ Formulario de calificación ──────────────── -->
                                <div class="rounded-2xl border border-border/50 bg-card p-4 space-y-4">
                                    <div class="flex items-center gap-2 mb-1">
                                        <Star class="w-4 h-4 text-amber-500" />
                                        <span class="text-sm font-bold text-foreground">Calificación del ejercicio</span>
                                    </div>

                                    <!-- Score -->
                                    <div>
                                        <label class="block text-xs font-semibold text-muted-foreground mb-1.5">
                                            Puntaje del ejercicio
                                            <span class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold">
                                                Máximo {{ calMaxScore }} pts
                                            </span>
                                            <span v-if="calMaxScore === 50" class="ml-1 text-[10px] text-muted-foreground">
                                                (la evaluación de preguntas suma los otros 50)
                                            </span>
                                        </label>
                                        <div class="flex items-center gap-3">
                                            <input
                                                id="review-score-input"
                                                v-model.number="state.form.review_metadata.score"
                                                type="number"
                                                :min="0"
                                                :max="calMaxScore"
                                                class="w-24 px-3 py-2 rounded-xl border bg-muted/30 text-foreground text-center text-lg font-bold outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                                :class="(state.form.review_metadata.score ?? 0) > calMaxScore ? 'border-destructive text-destructive' : 'border-border'"
                                            />
                                            <div class="flex-1">
                                                <div class="h-2 bg-muted rounded-full overflow-hidden">
                                                    <div class="h-full rounded-full transition-all duration-300"
                                                        :class="(state.form.review_metadata.score ?? 0) >= calMaxScore * 0.7 ? 'bg-success' : (state.form.review_metadata.score ?? 0) >= calMaxScore * 0.4 ? 'bg-amber-500' : 'bg-destructive'"
                                                        :style="`width: ${Math.min(100, ((state.form.review_metadata.score ?? 0) / calMaxScore) * 100)}%`" />
                                                </div>
                                                <p class="text-[10px] text-muted-foreground mt-1 text-right">
                                                    {{ Math.round(((state.form.review_metadata.score ?? 0) / calMaxScore) * 100) }}% del máximo
                                                </p>
                                            </div>
                                        </div>
                                        <p v-if="(state.form.review_metadata.score ?? 0) > calMaxScore"
                                            class="mt-1.5 text-xs text-destructive flex items-center gap-1">
                                            <AlertCircle class="w-3.5 h-3.5" />
                                            El puntaje no puede superar {{ calMaxScore }} puntos.
                                        </p>
                                    </div>

                                    <!-- Nota del revisor -->
                                    <div>
                                        <label class="block text-xs font-semibold text-muted-foreground mb-1.5">
                                            <MessageSquare class="w-3.5 h-3.5 inline-block mr-1" />
                                            Nota del ejercicio
                                        </label>
                                        <textarea
                                            id="reviewer-note-input"
                                            v-model="state.form.reviewer_note"
                                            rows="3"
                                            placeholder="Escribe aquí tus comentarios sobre el ejercicio..."
                                            class="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </AreaScroll>
                        <!-- Footer -->
                        <div class="px-6 py-3 border-t border-border/50 bg-muted/10 shrink-0 flex items-center justify-between gap-3">
                            <button @click="closeShowCalSubmisionModal"
                                class="px-5 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors">
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                :disabled="state.calSubmisionSubmitting || (state.form.review_metadata.score ?? 0) > calMaxScore"
                                class="inline-flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                <Loader2 v-if="state.calSubmisionSubmitting" class="w-4 h-4 animate-spin" />
                                <Send v-else class="w-4 h-4" />
                                {{ state.calSubmisionSubmitting ? 'Guardando...' : 'Guardar Calificación' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>