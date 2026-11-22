/**
 * Responses shaped as `back-end/test/landing-anonymous-posts.e2e-spec.ts`
 * asserts them (`GET /landing/posts/:id`) and as `formatContent` +
 * `applyContentAccess` build `GET /content/:id`. The marker words let a test
 * prove what is absent from the document.
 */
export const OPEN_PART = 'OPENPART the free opening'
export const PREVIEW = 'PREVIEWTEXT what the owner typed'
export const BODY = 'FULLBODY the whole post'

/** The creator page that owns post 31 (BE-CONT-13 `creatorId`). */
export const CREATOR_ID = 4

const common = {
  id: 31,
  creatorId: CREATOR_ID,
  type: 'text',
  title: 'A title',
  tags: null,
  createdAt: '2026-11-01T10:00:00.000Z',
}

const row = { contentId: 31, createdAt: '2026-11-01T10:00:00.000Z' }

/** Landing FULL (Q-57): body and media, never polls or the position. */
export function rawFullPublic() {
  return {
    ...common,
    type: 'image',
    text: BODY,
    access: 'FULL',
    images: [{ id: 5, url: 'https://cdn.test/IMAGEKEY.png' }],
    videos: [
      {
        ...row,
        id: 6,
        videoCloudId: 'VIDEOASSET',
        videoCloudChannel: null,
        fileNameCloud: null,
        // BE-CONT-16: `null` for an Arvan asset.
        playbackUrl: null,
      },
    ],
    audios: [
      {
        ...row,
        id: 7,
        audioCloudId: 'AUDIOASSET',
        audioCloudChannel: null,
        fileNameCloud: null,
        status: true,
        playbackUrl: null,
      },
    ],
    links: [{ ...row, id: 8, link: 'https://link.test/page' }],
    attachments: [{ id: 9, url: 'https://cdn.test/FILEKEY.pdf' }],
  }
}

/** `GET /content/:id` FULL for a member: the landing keys plus these. */
export function rawFullMember() {
  return {
    ...rawFullPublic(),
    isApprove: true,
    visibility: {
      contentId: 31,
      type: false,
      datePublished: '2026-11-01T10:00:00.000Z',
      earlyAccess: false,
      dateEarly: null,
      textPreview: PREVIEW,
    },
    polls: [
      {
        id: 3,
        typeSelect: false,
        endDataPublished: null,
        options: [
          { id: 11, pollId: 3, option: 'POLLOPTION one' },
          { id: 12, pollId: 3, option: 'POLLOPTION two' },
        ],
      },
    ],
  }
}

/** BE-CONT-16 public object URLs (`<endpoint>/<bucket>/<key>`). */
export const VIDEO_URL = 'http://localhost:9000/fellowa/content/video/1-a.mp4'
export const AUDIO_URL = 'http://localhost:9000/fellowa/content/audio/1-b.mp3'

/** FULL with object-storage media: each item carries its `playbackUrl`. */
export function rawFullObjectStorage() {
  const raw = rawFullPublic()
  return {
    ...raw,
    type: 'video',
    videos: raw.videos.map((v) => ({
      ...v,
      videoCloudId: null,
      fileNameCloud: 'clip.mp4',
      playbackUrl: VIDEO_URL,
    })),
    audios: raw.audios.map((a) => ({
      ...a,
      audioCloudId: null,
      fileNameCloud: 'ep1.mp3',
      playbackUrl: AUDIO_URL,
    })),
  }
}

export function rawPartial(text: string | null = OPEN_PART) {
  return text === null
    ? { ...common, access: 'PARTIAL' }
    : { ...common, text, access: 'PARTIAL' }
}

export function rawTeaser(textPreview: string | null = PREVIEW) {
  return textPreview === null
    ? { ...common, access: 'TEASER' }
    : { ...common, textPreview, access: 'TEASER' }
}

export const ok = (data: unknown) => ({ data, errors: null })
