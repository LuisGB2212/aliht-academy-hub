/**
 * useLessonForm.ts
 *
 * Composable that encapsulates all lesson CRUD logic.
 * LessonsAdmin.vue becomes a pure UI layer — it only binds refs and calls these functions.
 */
import { ref, computed } from 'vue'
import { useLmsStore } from '@/stores/aliht-context-store'
import type { Lesson, LessonPlatformContent, ContentType } from '@/types/academy-type'
import { uploadAcademyFile, getAcceptString } from '@/utils/uploadUtils'

// ─── Upload state per platform content slot ───────────────────────────────────
export interface PlatformContentUploadState {
  isUploading: boolean
  progress: number
  error: string | null
}

export function useLessonForm() {
  const store = useLmsStore()

  // ─── Modal / form state ─────────────────────────────────────────────────────
  const showModal    = ref(false)
  const editing      = ref<Partial<Lesson>>({})
  const isNew        = ref(false)
  const isSubmitting = ref(false)

  // Upload state keyed by array index of platform_contents
  const uploadStates = ref<Record<number, PlatformContentUploadState>>({})

  // ─── Open modal for new lesson ──────────────────────────────────────────────
  function startNew() {
    isNew.value = true
    editing.value = {
      title:             '',
      description:       '',
      type_content:      'video',
      order:             store.lessons.length + 1,
      visible:           true,
      module_ids:        [],
      platform_contents: [],
    }
    uploadStates.value = {}
    showModal.value    = true
  }

  // ─── Open modal to edit existing lesson ─────────────────────────────────────
  function startEdit(lesson: Lesson) {
    isNew.value = false

    const moduleIds = lesson.modules?.map(m => m.id) ?? lesson.module_ids ?? []

    const platformContents = (lesson.platform_contents ?? []).map(pc => {
      // Normalise: ensure content is always a PlatformContentValue object
      const content = (typeof pc.content === 'object' && pc.content !== null)
        ? { ...pc.content }
        : { value: typeof pc.content === 'string' ? pc.content : '' }

      return { ...pc, content } as LessonPlatformContent
    })

    editing.value      = { ...lesson, module_ids: moduleIds, platform_contents: platformContents }
    uploadStates.value = {}
    showModal.value    = true
  }

  // ─── Save (create or update) ────────────────────────────────────────────────
  async function handleSave(): Promise<boolean> {
    if (!editing.value.title) return false

    isSubmitting.value = true
    try {
      const payload = {
        ...editing.value,
        modules:           editing.value.module_ids,
        platform_contents: editing.value.platform_contents,
      }

      if (isNew.value) {
        await store.createLesson(payload)
      } else {
        await store.updateLesson(editing.value.id!, payload)
      }

      showModal.value   = false
      editing.value     = {}
      return true
    } catch (error) {
      console.error('[useLessonForm] Error saving lesson:', error)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    if (!confirm('¿Estás seguro de eliminar este tutorial?')) return
    await store.deleteLesson(id)
  }

  // ─── Toggle visibility ───────────────────────────────────────────────────────
  async function togglePublish(lesson: Lesson) {
    await store.updateLesson(lesson.id, { visible: !lesson.visible })
  }

  // ─── Module selection (single-select) ───────────────────────────────────────
  function setModule(id: number) {
    editing.value.module_ids = [id]

    // Remove platform contents that belong to platforms no longer in scope
    if (editing.value.platform_contents) {
      const validIds = availablePlatforms.value.map(p => p.id)
      editing.value.platform_contents = editing.value.platform_contents.filter(
        pc => validIds.includes(pc.platform_id),
      )
    }
  }

  // ─── Platform content slots ──────────────────────────────────────────────────
  function addPlatformContent(platformId: number) {
    if (!editing.value.platform_contents) editing.value.platform_contents = []
    if (editing.value.platform_contents.some(c => c.platform_id === platformId)) return

    editing.value.platform_contents.push({
      platform_id: platformId,
      type:        'video',
      title:       '',
      content:     { value: '' },
      order:       editing.value.platform_contents.length,
      visible:     true,
    })
  }

  function removePlatformContent(index: number) {
    editing.value.platform_contents?.splice(index, 1)
    delete uploadStates.value[index]
  }

  // ─── File upload for a specific platform content slot ────────────────────────
  async function handleFileUpload(index: number, file: File, type: ContentType) {
    const category = type as 'video' | 'pdf' // only called for uploadable types

    uploadStates.value[index] = { isUploading: true, progress: 0, error: null }

    try {
      const { publicUrl, key } = await uploadAcademyFile(file, category, (progress) => {
        uploadStates.value[index] = { ...uploadStates.value[index], progress }
      })

      if (editing.value.platform_contents?.[index]) {
        editing.value.platform_contents[index].content = { value: publicUrl, file_key: key }
      }

      uploadStates.value[index] = { isUploading: false, progress: 100, error: null }
    } catch (err: any) {
      uploadStates.value[index] = { isUploading: false, progress: 0, error: err.message }
    }
  }

  // ─── Computed ───────────────────────────────────────────────────────────────
  const availablePlatforms = computed(() => {
    if (!editing.value.module_ids?.length) return []
    const mod = store.modules.find(m => m.id === editing.value.module_ids![0])
    return mod?.platforms ?? []
  })

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const getPlatformName = (id: number) =>
    store.platforms.find(p => p.id === id)?.name ?? '?'

  const isUploadableType = (type: ContentType) =>
    type === 'video' || type === 'pdf'

  const getFileAccept = (type: ContentType) =>
    isUploadableType(type) ? getAcceptString(type as 'video' | 'pdf') : ''

  return {
    // state
    showModal,
    editing,
    isNew,
    isSubmitting,
    uploadStates,
    // computed
    availablePlatforms,
    // actions
    startNew,
    startEdit,
    handleSave,
    handleDelete,
    togglePublish,
    setModule,
    addPlatformContent,
    removePlatformContent,
    handleFileUpload,
    // helpers
    getPlatformName,
    isUploadableType,
    getFileAccept,
  }
}
