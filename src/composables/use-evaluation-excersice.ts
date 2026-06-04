import { computed, reactive } from 'vue'
import type { TopUserStat } from '@/types/academy-type'
import { useAuthStore } from '@/stores/auth';
import { apiRepository } from '@/utils/apiRepository';
import { toast } from 'vue3-toastify';

interface EvaluationExcersiceComposableState {
    showCalSubmisionModal: boolean
    calSubmisionUser: TopUserStat | null
    calSubmisionLoading: boolean
    calSubmisionSubmitting: boolean
    form: {
        reviewer_note: string
        review_metadata: {
            user_id: number
            user_name: string
            agency_id?: number
            score: number
        }
    }
}

// export type of composable
export type EvaluationExcersiceComposable = ReturnType<typeof useEvaluationExcersiceComposable>

export function useEvaluationExcersiceComposable() {
    const auth = useAuthStore();

    const state = reactive<EvaluationExcersiceComposableState>({
        showCalSubmisionModal: false,
        calSubmisionUser: null,
        calSubmisionLoading: false,
        calSubmisionSubmitting: false,
        form: {
            reviewer_note: '',
            review_metadata: {
                user_id: auth.user?.id || 0,
                user_name: auth.user?.name || '',
                agency_id: auth.user?.agency_id || 0,
                score: 0
            }
        }
    });

    const openShowCalSubmisionModal = async (user: TopUserStat) => {
        state.calSubmisionUser = user
        state.form.reviewer_note = user.practice_submission?.reviewer_note || ''
        state.form.review_metadata = {
            user_id: auth.user?.id || 0,
            user_name: auth.user?.name || '',
            agency_id: auth.user?.agency_id || 0,
            score: user.practice_submission?.review_metadata?.score ?? 0
        }
        // state.calSubmisionEvaluation = user.practice_submission?.module.evaluation
        state.showCalSubmisionModal = true
        
        
    }

    const closeShowCalSubmisionModal = () => {
        state.showCalSubmisionModal = false
        state.calSubmisionUser = null
        state.form.reviewer_note = ''
        state.form.review_metadata = {
            user_id: 0,
            user_name: '',
            agency_id: 0,
            score: 0
        }
    }

    const calMaxScore = computed(() => {
        return state.calSubmisionUser?.has_evaluation ? 50 : 100
    })

    const submitPracticeReview = async () => {
        if (!state.calSubmisionUser?.practice_submission) return
        state.calSubmisionSubmitting = true
        try {
            const submissionId = state.calSubmisionUser.practice_submission.id
            await apiRepository.post({
                endpoint: `/academy/practice/${submissionId}/review`,
                body: {
                    reviewer_note: state.form.reviewer_note,
                    review_metadata: {
                        ...state.form.review_metadata,
                        score: Number(state.form.review_metadata.score)
                    }
                }
            })
            toast.success('Calificación enviada exitosamente');
            closeShowCalSubmisionModal()
        } catch (e) {
            console.error('Error submitting practice review:', e)
        } finally {
            state.calSubmisionSubmitting = false
        }
    }

    return {
        state,
        calMaxScore,
        openShowCalSubmisionModal,
        closeShowCalSubmisionModal,
        submitPracticeReview
    }
}