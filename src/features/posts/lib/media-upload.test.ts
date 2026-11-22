import { describe, expect, it, vi } from 'vitest'

import { SERVER_ACTION_BODY_LIMIT_BYTES } from '@/features/tiers/lib/cover-limits'

import {
  MediaUploadCancelledError,
  uploadMediaFile,
  type MediaUploadSteps,
} from './media-upload'
import {
  MAX_MEDIA_UPLOAD_BYTES,
  MEDIA_CHUNK_BYTES,
} from './media-upload-limits'

const session = {
  fileId: 'abc==',
  uploadUrl: 'https://napi.arvancloud.ir/vod/2.0/files/abc%3D%3D',
  uploadToken: 'upload-token',
}

function steps(): MediaUploadSteps & {
  forms: Array<Record<string, string | number>>
} {
  const forms: Array<Record<string, string | number>> = []
  return {
    forms,
    init: vi.fn(async () => session),
    chunk: vi.fn(async (form: FormData) => {
      const file = form.get('file')
      forms.push({
        size: file instanceof Blob ? file.size : -1,
        offset: String(form.get('offset')),
        uploadUrl: String(form.get('uploadUrl')),
        uploadToken: String(form.get('uploadToken')),
      })
    }),
    finalize: vi.fn(async () => ({ id: 70, name: 'clip.mp4' })),
  }
}

const file = (bytes: number, type = 'video/mp4') =>
  new File([new Uint8Array(bytes)], 'clip.mp4', { type })

describe('uploadMediaFile', () => {
  it('starts with the file’s name, size and type, sends ordered chunks and finalizes with the token', async () => {
    const s = steps()
    const progress: number[] = []
    const media = await uploadMediaFile(file(25), 'video', s, {
      chunkBytes: 10,
      onProgress: (p) => progress.push(p.sent),
    })
    expect(s.init).toHaveBeenCalledWith({
      fileName: 'clip.mp4',
      fileSize: 25,
      fileType: 'video/mp4',
    })
    expect(s.forms).toEqual([
      { size: 10, offset: '0', ...pick(session) },
      { size: 10, offset: '10', ...pick(session) },
      { size: 5, offset: '20', ...pick(session) },
    ])
    expect(s.finalize).toHaveBeenCalledWith({
      kind: 'video',
      fileId: 'abc==',
      uploadToken: 'upload-token',
    })
    expect(progress).toEqual([0, 10, 20, 25, 25])
    expect(media).toEqual({ id: 70, name: 'clip.mp4' })
  })

  it('stops between chunks when cancelled, and never finalizes', async () => {
    const s = steps()
    let calls = 0
    const upload = uploadMediaFile(file(30), 'audio', s, {
      chunkBytes: 10,
      isCancelled: () => calls++ >= 1,
    })
    await expect(upload).rejects.toBeInstanceOf(MediaUploadCancelledError)
    expect(s.forms).toHaveLength(1)
    expect(s.finalize).not.toHaveBeenCalled()
  })

  it('stops at the first failed chunk', async () => {
    const s = steps()
    vi.mocked(s.chunk).mockRejectedValueOnce(new Error('down'))
    await expect(
      uploadMediaFile(file(30), 'video', s, { chunkBytes: 10 })
    ).rejects.toThrow('down')
    expect(s.finalize).not.toHaveBeenCalled()
  })

  it('keeps a chunk inside the Server Action body limit and the 2 GB cap', () => {
    expect(MEDIA_CHUNK_BYTES).toBeLessThan(SERVER_ACTION_BODY_LIMIT_BYTES)
    expect(MAX_MEDIA_UPLOAD_BYTES).toBe(2 * 1024 ** 3)
  })
})

function pick({ uploadUrl, uploadToken }: typeof session) {
  return { uploadUrl, uploadToken }
}
