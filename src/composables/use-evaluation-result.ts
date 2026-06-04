import { computed, reactive } from 'vue'
import type { EvaluationResultResponse, TopUserStat } from '@/types/academy-type'
import { useLmsStore } from '@/stores/aliht-context-store';
import { apiRepository } from '@/utils/apiRepository';

interface EvaluationResultComposableState {
    showEvalModal: boolean,
    evalModalLoading: boolean,
    evalModalUser: TopUserStat | null,
    evalModalResults: EvaluationResultResponse[],
    selectedDetailResult: EvaluationResultResponse | null,
    evalModalTab: EvaluationResultTabEnum,
}

export enum EvaluationResultQuestionEnum {
    CORRECT_SELECTED = 'correct-selected',
    CORRECT_MISSED = 'correct-missed',
    WRONG_SELECTED = 'wrong-selected',
    NEUTRAL = 'neutral',
}

export enum EvaluationResultTabEnum {
    DETAIL = 'detail',
    RESULT_BY_USER = 'result_by_user',
    ALL = 'all',
}

// export type of composable
export type EvaluationResultComposable = ReturnType<typeof useEvaluationResultComposable>

export function useEvaluationResultComposable() {
    const store = useLmsStore()

    const state = reactive<EvaluationResultComposableState>({
        showEvalModal: false,
        evalModalLoading: false,
        evalModalUser: null,
        evalModalResults: [],
        selectedDetailResult: null,
        evalModalTab: EvaluationResultTabEnum.DETAIL,
    });

    const openShowEvalModal = async (user: TopUserStat) => {
        if (!user.evaluation_id) return
        state.evalModalUser = user
        state.evalModalResults = []
        state.evalModalTab = EvaluationResultTabEnum.DETAIL
        state.showEvalModal = true
        state.evalModalLoading = true
        try {
            const res = await apiRepository.get<EvaluationResultResponse[]>({
                endpoint: `/academy/evaluations/${user.evaluation_id}/results`,
                params: store.getPayloadBaseProgress()
            })
            if (res?.success) {
                state.evalModalResults = res.data
                state.selectedDetailResult = res.data.find((result: EvaluationResultResponse) => result.id === state.evalModalUser?.evaluation_result_id) ?? res.data[0] ?? null
            }
        } catch (e) {
            console.error('Error fetching eval results:', e)
        } finally {
            state.evalModalLoading = false
        }
    }

    const closeShowEvalModal = () => {
        state.showEvalModal = false
        state.evalModalUser = null
        state.evalModalResults = []
    }

    // Determina el estado visual de una opción según si es correcta y si el usuario la eligió
    const getOptionState = (questionId: string, optionId: string, isCorrect?: boolean): 'correct-selected' | 'correct-missed' | 'wrong-selected' | 'neutral' => {
        const userSelected = (state.selectedDetailResult?.answers?.[questionId] ?? []).includes(optionId)
        if (isCorrect && userSelected) return 'correct-selected'
        if (isCorrect && !userSelected) return 'correct-missed'
        if (!isCorrect && userSelected) return 'wrong-selected'
        return 'neutral'
    }

    const viewDetail = (result: any) => {
        state.selectedDetailResult = result
        state.evalModalTab = EvaluationResultTabEnum.DETAIL
    }

    const resultByUser = computed(() => {
        return state.evalModalResults.filter((result: EvaluationResultResponse) => result.user_id === state.evalModalUser?.user_id)
    })

    const activeTabClass = (tab: EvaluationResultTabEnum) => {
        return state.evalModalTab === tab
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
    }

    return {
        state,
        resultByUser,
        openShowEvalModal,
        closeShowEvalModal,
        getOptionState,
        viewDetail,
        activeTabClass
    }
}