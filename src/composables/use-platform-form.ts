/**
 * usePlatformForm.ts
 *
 * Composable that encapsulates all platform CRUD + logo upload logic.
 * PlatformsAdmin.vue becomes a pure UI layer.
 */
import { ref }  from 'vue'
import { useLmsStore } from '@/stores/aliht-context-store'
import type { Platform } from '@/types/academy-type'
import { uploadAcademyFile, getAcceptString } from '@/utils/uploadUtils'

export interface PlatformUploadState {
  isUploading: boolean
  progress: number
  error: string | null
}

export function usePlatformForm() {
  const store = useLmsStore()

  // ─── Modal / form state ─────────────────────────────────────────────────────
  const showModal    = ref(false)
  const editing      = ref<Partial<Platform>>({})
  const isNew        = ref(false)
  const isSubmitting = ref(false)

  // Logo upload state
  const logoUpload = ref<PlatformUploadState>({
    isUploading: false,
    progress:    0,
    error:       null,
  })

  // ─── Open modal for new platform ────────────────────────────────────────────
  function startNew() {
    isNew.value = true
    editing.value = {
      name:        '',
      description: '',
      image_url:   '',
      color:       '#3597d4',
      visible:     true,
    }
    logoUpload.value = { isUploading: false, progress: 0, error: null }
    showModal.value  = true
  }

  // ─── Open modal to edit existing platform ───────────────────────────────────
  function startEdit(platform: Platform) {
    isNew.value      = false
    editing.value    = { ...platform }
    logoUpload.value = { isUploading: false, progress: 0, error: null }
    showModal.value  = true
  }

  // ─── Save (create or update) ────────────────────────────────────────────────
  async function handleSave(): Promise<boolean> {
    if (!editing.value.name) return false

    isSubmitting.value = true
    try {
      if (isNew.value) {
        await store.createPlatform(editing.value)
      } else {
        await store.updatePlatform(editing.value.id!, editing.value)
      }
      showModal.value = false
      editing.value   = {}
      return true
    } catch (error) {
      console.error('[usePlatformForm] Error saving platform:', error)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    if (!confirm('¿Estás seguro de eliminar esta plataforma?')) return
    await store.deletePlatform(id)
  }

  // ─── Toggle visibility ───────────────────────────────────────────────────────
  async function toggleVisibility(platform: Platform) {
    await store.updatePlatform(platform.id, { visible: !platform.visible })
  }

  // ─── Logo upload ─────────────────────────────────────────────────────────────
  async function handleLogoUpload(file: File) {
    logoUpload.value = { isUploading: true, progress: 0, error: null }

    try {
      const { publicUrl } = await uploadAcademyFile(file, 'image', (progress) => {
        logoUpload.value = { ...logoUpload.value, progress }
      })

      editing.value.image_url = publicUrl
      logoUpload.value = { isUploading: false, progress: 100, error: null }
    } catch (err: any) {
      logoUpload.value = { isUploading: false, progress: 0, error: err.message }
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const imageAccept = getAcceptString('image')

  return {
    // state
    showModal,
    editing,
    isNew,
    isSubmitting,
    logoUpload,
    // actions
    startNew,
    startEdit,
    handleSave,
    handleDelete,
    toggleVisibility,
    handleLogoUpload,
    // helpers
    imageAccept,
  }
}
