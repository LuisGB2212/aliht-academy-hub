<script setup lang="ts">
import { Loader2, X, FileText, CheckCircle2, XCircle, ChevronRight } from 'lucide-vue-next';
import { EvaluationResultTabEnum, type EvaluationResultComposable } from '@/composables/use-evaluation-result';
import AreaScroll from '@/components/ui/AreaScroll.vue';

const { evaluationResultComposable } = defineProps<{
    evaluationResultComposable: EvaluationResultComposable
}>()

const { state, closeShowEvalModal, getOptionState, viewDetail, activeTabClass, resultByUser } = evaluationResultComposable;

</script>

<template>
    <!-- ═══ Evaluation Results Modal ═══════════════════════════════════════════ -->
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="state.showEvalModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeShowEvalModal" />

                <div class="relative z-10 w-full max-w-5xl mx-auto max-h-[90vh] flex flex-col">
                    <div class="bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                        <!-- Header -->
                        <div class="flex items-start justify-between px-6 py-4 border-b border-border/50 shrink-0">
                            <div>
                                <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                                    Evaluación · {{ state.evalModalUser?.module_name }}
                                </p>
                                <h2 class="text-base font-bold text-foreground">
                                    {{ state.selectedDetailResult?.evaluation?.title ?? 'Resultado de Evaluación' }}
                                </h2>
                            </div>
                            <button @click="closeShowEvalModal" class="p-2 rounded-lg hover:bg-muted transition-colors shrink-0">
                                <X class="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>

                        <!-- Loading -->
                        <div v-if="state.evalModalLoading" class="flex items-center justify-center py-16">
                            <Loader2 class="w-6 h-6 animate-spin text-primary" />
                        </div>

                        <template v-else>
                            <!-- User result card + Tabs -->
                            <div class="px-6 pt-4 shrink-0">
                                <!-- Selected user card -->
                                <div v-if="state.selectedDetailResult"
                                    class="flex items-center gap-4 p-3 rounded-2xl border mb-4"
                                    :class="state.selectedDetailResult.passed
                                        ? 'bg-success/5 border-success/20'
                                        : 'bg-destructive/5 border-destructive/20'">
                                    <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                                        {{ state.selectedDetailResult.user_name?.charAt(0).toUpperCase() }}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="font-bold text-sm text-foreground truncate">{{ state.selectedDetailResult.user_name }}</p>
                                        <p class="text-[10px] text-muted-foreground truncate">{{ state.selectedDetailResult.user_email }}</p>
                                    </div>
                                    <!-- Score ring -->
                                    <div class="text-center shrink-0">
                                        <p class="text-2xl font-black leading-none"
                                            :class="state.selectedDetailResult.passed ? 'text-success' : 'text-destructive'">
                                            {{ state.selectedDetailResult.score }}%
                                        </p>
                                        <p class="text-[9px] font-semibold uppercase tracking-wider mt-0.5"
                                            :class="state.selectedDetailResult.passed ? 'text-success' : 'text-destructive'">
                                            {{ state.selectedDetailResult.passed ? 'Aprobado' : 'No aprobado' }}
                                        </p>
                                    </div>
                                    <div class="shrink-0">
                                        <CheckCircle2 v-if="state.selectedDetailResult.passed" class="w-7 h-7 text-success" />
                                        <XCircle v-else class="w-7 h-7 text-destructive" />
                                    </div>
                                </div>

                                <!-- Tabs -->
                                <div class="flex gap-1 border-b border-border/50 -mx-1 px-1">
                                    <button @click="state.evalModalTab = EvaluationResultTabEnum.DETAIL"
                                        class="px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-all"
                                        :class="activeTabClass(EvaluationResultTabEnum.DETAIL)">
                                        Detalle de Respuestas
                                    </button>
                                    <button @click="state.evalModalTab = EvaluationResultTabEnum.RESULT_BY_USER"
                                        class="px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-all"
                                        :class="activeTabClass(EvaluationResultTabEnum.RESULT_BY_USER)">
                                        Resultados del usuario
                                        <span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-bold">
                                            {{ resultByUser.length }}
                                        </span>
                                    </button>
                                    <button @click="state.evalModalTab = EvaluationResultTabEnum.ALL"
                                        class="px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-all"
                                        :class="activeTabClass(EvaluationResultTabEnum.ALL)">
                                        Todos los Resultados
                                        <span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-bold">
                                            {{ state.evalModalResults.length }}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <!-- ═══ TAB: Detalle de Respuestas ══════════════════ -->
                            <AreaScroll v-if="state.evalModalTab === EvaluationResultTabEnum.DETAIL">
                                <div v-if="!state.selectedDetailResult" class="text-center py-12 text-muted-foreground">
                                    <FileText class="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p class="font-medium text-sm">Sin datos de respuestas.</p>
                                </div>

                                <template v-else>
                                    <!-- Leyenda -->
                                    <div class="flex flex-wrap gap-2 text-[10px] font-semibold">
                                        <span class="flex items-center gap-1 px-2 py-1 rounded-lg bg-success/10 text-success">
                                            <CheckCircle2 class="w-3 h-3" /> Correcta seleccionada
                                        </span>
                                        <span class="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-success/60 border border-success/20">
                                            <CheckCircle2 class="w-3 h-3" /> Correcta no seleccionada
                                        </span>
                                        <span class="flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/10 text-destructive">
                                            <XCircle class="w-3 h-3" /> Incorrecta seleccionada
                                        </span>
                                    </div>

                                    <!-- Questions -->
                                    <div v-for="(q, qi) in (state.selectedDetailResult?.evaluation?.questions ?? [])" :key="q.id"
                                        class="rounded-2xl border border-border/50 overflow-hidden">

                                        <!-- Question header -->
                                        <div class="flex items-start gap-3 px-4 py-3 bg-muted/30 border-b border-border/40">
                                            <span class="shrink-0 w-6 h-6 rounded-full gradient-bg text-primary-foreground text-[10px] font-bold flex items-center justify-center mt-0.5">
                                                {{ Number(qi) + 1 }}
                                            </span>
                                            <div class="flex-1">
                                                <p class="text-sm font-semibold text-foreground">{{ q.question }}</p>
                                                <p class="text-[10px] text-muted-foreground mt-0.5">
                                                    {{ q.type === 'multiple_choice' ? 'Selección múltiple' : q.type === 'true_false' ? 'Verdadero / Falso' : 'Opción única' }}
                                                </p>
                                            </div>
                                            <!-- Question result badge -->
                                            <span class="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                :class="q.options.every((o: any) =>
                                                    (o.correct && (state.selectedDetailResult?.answers?.[q.id] ?? []).includes(o.id)) ||
                                                    (!o.correct && !(state.selectedDetailResult?.answers?.[q.id] ?? []).includes(o.id))
                                                )
                                                    ? 'bg-success/10 text-success'
                                                    : 'bg-destructive/10 text-destructive'">
                                                {{ q.options.every((o: any) =>
                                                    (o.correct && (state.selectedDetailResult?.answers?.[q.id] ?? []).includes(o.id)) ||
                                                    (!o.correct && !(state.selectedDetailResult?.answers?.[q.id] ?? []).includes(o.id))
                                                ) ? '✓ Correcta' : '✗ Incorrecta' }}
                                            </span>
                                        </div>

                                        <!-- Options -->
                                        <div class="p-3 space-y-2">
                                            <div v-for="opt in q.options" :key="opt.id"
                                                class="flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all"
                                                :class="{
                                                    'bg-success/10 border-success/30 text-success': getOptionState(q.id, opt.id, opt.correct) === 'correct-selected',
                                                    'bg-muted/30 border-success/20 text-success/60': getOptionState(q.id, opt.id, opt.correct) === 'correct-missed',
                                                    'bg-destructive/10 border-destructive/30 text-destructive': getOptionState(q.id, opt.id, opt.correct) === 'wrong-selected',
                                                    'bg-transparent border-border/40 text-muted-foreground': getOptionState(q.id, opt.id, opt.correct) === 'neutral',
                                                }">
                                                <!-- State icon -->
                                                <span class="shrink-0 w-5 h-5 flex items-center justify-center">
                                                    <CheckCircle2 v-if="getOptionState(q.id, opt.id, opt.correct) === 'correct-selected'" class="w-4 h-4" />
                                                    <CheckCircle2 v-else-if="getOptionState(q.id, opt.id, opt.correct) === 'correct-missed'" class="w-4 h-4 opacity-40" />
                                                    <XCircle v-else-if="getOptionState(q.id, opt.id, opt.correct) === 'wrong-selected'" class="w-4 h-4" />
                                                    <span v-else class="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/20 inline-block" />
                                                </span>
                                                <span class="flex-1 font-medium">{{ opt.text }}</span>
                                                <!-- Labels -->
                                                <span v-if="getOptionState(q.id, opt.id, opt.correct) === 'correct-selected'"
                                                    class="shrink-0 text-[9px] font-bold uppercase tracking-wider">
                                                    Tu respuesta · Correcta
                                                </span>
                                                <span v-else-if="getOptionState(q.id, opt.id, opt.correct) === 'correct-missed'"
                                                    class="shrink-0 text-[9px] font-bold uppercase tracking-wider opacity-60">
                                                    Respuesta correcta
                                                </span>
                                                <span v-else-if="getOptionState(q.id, opt.id, opt.correct) === 'wrong-selected'"
                                                    class="shrink-0 text-[9px] font-bold uppercase tracking-wider">
                                                    Tu respuesta · Incorrecta
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Metadata footer -->
                                    <p class="text-xs text-muted-foreground text-center pt-1">
                                        Respondido el {{ state.selectedDetailResult?.completed_at
                                            ? new Date(state.selectedDetailResult.completed_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                            : '—' }}
                                        · Puntaje mínimo requerido: <strong>{{ state.selectedDetailResult.evaluation?.passing_score }}%</strong>
                                    </p>
                                </template>
                            </AreaScroll>

                            <!-- ═══ TAB: Resultados por usuario ═════════════════════ -->
                            <AreaScroll v-if="state.evalModalTab === EvaluationResultTabEnum.RESULT_BY_USER">
                                <!-- Empty -->
                                <div v-if="resultByUser.length === 0" class="text-center py-12 text-muted-foreground">
                                    <FileText class="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p class="font-medium text-sm">Sin resultados aún.</p>
                                </div>

                                <!-- Users list -->
                                <div v-else class="space-y-2">
                                    <div v-for="(result, idx) in resultByUser" :key="idx" @click="viewDetail(result)"
                                        class="flex items-center gap-3 p-3 rounded-2xl border cursor-pointer hover:border-primary/50 transition-colors"
                                        :class="result.id === state.selectedDetailResult?.id
                                            ? 'bg-primary/10 border-primary'
                                            : 'bg-card border-border/50 hover:bg-muted/50'">
                                        <!-- User avatar -->
                                        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                                            {{ result.user_name?.charAt(0).toUpperCase() }}
                                        </div>

                                        <!-- Main content -->
                                        <div class="flex-1 min-w-0">
                                            <p class="font-bold text-sm truncate"
                                                :class="result.user_id === state.selectedDetailResult?.user_id ? 'text-primary' : 'text-foreground'">
                                                {{ result.user_name }}
                                            </p>
                                            <p class="text-[10px] text-muted-foreground truncate">{{ result.user_email }}</p>
                                        </div>

                                        <!-- Score -->
                                        <div class="flex items-center gap-2 shrink-0 text-right">
                                            <span class="font-black text-lg leading-none"
                                                :class="result.passed ? 'text-success' : 'text-destructive'">
                                                {{ result.score }}%
                                            </span>
                                            <CheckCircle2 v-if="result.passed" class="w-5 h-5 text-success shrink-0" />
                                            <XCircle v-else class="w-5 h-5 text-destructive shrink-0" />
                                        </div>

                                        <!-- Chevron (optional) -->
                                        <ChevronRight v-if="result.id !== state.selectedDetailResult?.id"
                                            class="w-4 h-4 text-muted-foreground" />
                                    </div>
                                </div>
                            </AreaScroll>

                            <!-- ═══ TAB: Todos los Resultados ═════════════════════ -->
                            <AreaScroll v-if="state.evalModalTab === EvaluationResultTabEnum.ALL">
                                <!-- Empty -->
                                <div v-if="state.evalModalResults.length === 0" class="text-center py-12 text-muted-foreground">
                                    <FileText class="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p class="font-medium text-sm">Sin resultados aún.</p>
                                </div>

                                <template v-else>
                                    <!-- Summary chips -->
                                    <div class="flex flex-wrap gap-2">
                                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-xs font-semibold text-foreground">
                                            {{ state.evalModalResults.length }} resultado{{ state.evalModalResults.length !== 1 ? 's' : '' }}
                                        </span>
                                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-semibold">
                                            <CheckCircle2 class="w-3.5 h-3.5" />
                                            {{ state.evalModalResults.filter(r => r.passed).length }} aprobaron
                                        </span>
                                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
                                            <XCircle class="w-3.5 h-3.5" />
                                            {{ state.evalModalResults.filter(r => !r.passed).length }} no aprobaron
                                        </span>
                                    </div>

                                    <!-- Results list -->
                                    <div class="rounded-2xl border border-border/50 overflow-hidden">
                                        <table class="w-full text-left border-collapse">
                                            <thead>
                                                <tr class="bg-muted/40 border-b border-border/50">
                                                    <th class="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Usuario</th>
                                                    <th class="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Agencia</th>
                                                    <th class="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Puntaje</th>
                                                    <th class="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Estado</th>
                                                    <th class="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha</th>
                                                    <th class="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Detalle</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-border/40">
                                                <tr v-for="result in state.evalModalResults" :key="result.id"
                                                    class="hover:bg-muted/20 transition-colors"
                                                    :class="result.user_id === state.evalModalUser?.user_id ? 'bg-primary/5' : ''">
                                                    <td class="px-4 py-3">
                                                        <div class="flex items-center gap-2">
                                                            <div class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                                                {{ result.user_name?.charAt(0).toUpperCase() }}
                                                            </div>
                                                            <div>
                                                                <p class="text-sm font-semibold text-foreground leading-tight">
                                                                    {{ result.user_name }}
                                                                </p>
                                                                <p class="text-[10px] text-muted-foreground">{{ result.user_email }}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td class="px-4 py-3">
                                                        <span v-if="result.agency_name"
                                                            class="text-xs px-2 py-0.5 rounded-full font-bold"
                                                            style="background-color: hsla(16,85%,55%,0.1); color: hsl(16,85%,55%)">
                                                            {{ result.agency_name }}
                                                        </span>
                                                        <span v-else class="text-xs text-muted-foreground">—</span>
                                                    </td>
                                                    <td class="px-4 py-3 text-center font-bold text-sm"
                                                        :class="result.passed ? 'text-success' : 'text-destructive'">
                                                        {{ result.score }}%
                                                    </td>
                                                    <td class="px-4 py-3 text-center">
                                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                                            :class="result.passed ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'">
                                                            <CheckCircle2 v-if="result.passed" class="w-3 h-3" />
                                                            <XCircle v-else class="w-3 h-3" />
                                                            {{ result.passed ? 'Aprobado' : 'No aprobado' }}
                                                        </span>
                                                    </td>
                                                    <td class="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                        {{ result.completed_at
                                                            ? new Date(result.completed_at).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })
                                                            : '—' }}
                                                    </td>
                                                    <td class="px-4 py-3 text-center">
                                                        <button @click="viewDetail(result)"
                                                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors"
                                                            :class="state.selectedDetailResult?.id === result.id
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary'">
                                                            <FileText class="w-3 h-3" />
                                                            Ver
                                                        </button>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </template>
                            </AreaScroll>
                        </template>

                        <!-- Footer -->
                        <div class="px-6 py-3 border-t border-border/50 bg-muted/10 shrink-0 flex justify-end">
                            <button @click="closeShowEvalModal"
                                class="px-6 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped></style>