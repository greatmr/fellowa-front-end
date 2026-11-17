import {
  CheckIcon,
  HeartIcon,
  LockIcon,
  MessageCircleIcon,
  PlayIcon,
  RotateCcwIcon,
  RotateCwIcon,
  UserPlusIcon,
} from 'lucide-react'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { getDirection } from '@/i18n/routing'
import { cn } from '@/lib/utils'

import { AvatarStack } from './avatar-stack'
import { landingImages } from './landing-images'
import { SamplePreview } from './sample-preview'

/** A grey stand-in for text in a mock-up. */
function TextBar({ className }: { className: string }) {
  return <span className={cn('block h-2 rounded-full bg-accent', className)} />
}

/**
 * A glass chip floating beside a mock-up (presentation `.fw-float`): desktop
 * only, bobbing on its own timing, nudged by `FloatParallax` while scrolling.
 */
function FloatingChip({
  children,
  className,
}: {
  children: ReactNode
  className: string
}) {
  return (
    <div
      data-parallax
      aria-hidden
      className={cn(
        'absolute z-20 hidden items-center gap-2.5 rounded-full border border-white/95 bg-card/90 py-2 ps-4 pe-3 text-caption font-semibold text-foreground shadow-panel backdrop-blur-md lg:flex dark:border-border',
        className
      )}
    >
      {children}
    </div>
  )
}

/** Avatar plus two grey lines: someone, unnamed. */
function PersonChip({
  image,
  className,
}: {
  image: (typeof landingImages)[keyof typeof landingImages]
  className: string
}) {
  return (
    <FloatingChip className={className}>
      <Image
        {...image}
        alt=""
        sizes="1.875rem"
        className="size-7.5 rounded-full object-cover"
      />
      <span className="flex flex-col gap-1.5">
        <TextBar className="w-14" />
        <TextBar className="w-9" />
      </span>
    </FloatingChip>
  )
}

/** A label over a figure (presentation `.fw-mini-stat`). */
function StatChip({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className: string
}) {
  return (
    <FloatingChip
      className={cn(
        'flex-col items-start gap-0.5 rounded-2xl px-3.75 py-2.5',
        className
      )}
    >
      <span className="text-micro font-semibold text-muted-foreground">
        {label}
      </span>
      {children}
    </FloatingChip>
  )
}

function CheckBadge({ className }: { className?: string }) {
  return (
    <CheckIcon
      className={cn(
        'size-4 shrink-0 rounded-full bg-money-500/15 p-0.5 text-money-600 dark:text-money-400',
        className
      )}
      aria-hidden
    />
  )
}

export function SupportVisual() {
  const t = useTranslations('landing.features.support')

  return (
    <SamplePreview>
      <div className="relative flex min-h-90 items-center justify-center">
        <div className="relative z-10 w-full max-w-78 overflow-hidden rounded-card border bg-card text-center shadow-panel">
          <div className="relative h-24">
            <Image
              {...landingImages.brushes}
              alt=""
              sizes="20rem"
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-b from-transparent from-30% to-card/90" />
          </div>
          <div className="relative -mt-9 px-6 pb-6">
            <Image
              {...landingImages.avatar1}
              alt=""
              sizes="4.5rem"
              className="mx-auto mb-3 size-18 rounded-full border-4 border-card object-cover shadow-soft"
            />
            <TextBar className="mx-auto mb-2 h-2.5 w-2/5" />
            <TextBar className="mx-auto mb-1.5 w-2/3" />
            <TextBar className="mx-auto mb-4.5 w-1/2" />
            <dl className="mb-4 flex justify-center gap-5 border-y py-2.5">
              {(['members', 'posts', 'tiers'] as const).map((stat) => (
                <div key={stat} className="flex flex-col-reverse">
                  <dt className="text-micro font-semibold text-muted-foreground">
                    {t(`stats.${stat}.label`)}
                  </dt>
                  <dd className="text-body font-black text-foreground">
                    {t(`stats.${stat}.value`)}
                  </dd>
                </div>
              ))}
            </dl>
            <Button asChild className="w-full rounded-full shadow-brand">
              <Link href="/creators">{t('action')}</Link>
            </Button>
          </div>
        </div>
        <PersonChip
          image={landingImages.avatar2}
          className="start-1/7 top-1/8 motion-safe:animate-float-2"
        />
        <FloatingChip className="start-1/6 bottom-1/7 motion-safe:animate-float-3">
          <span className="flex size-5.5 items-center justify-center rounded-full bg-red-500/10">
            <HeartIcon className="size-3 fill-red-500 text-red-500" />
          </span>
          {t('cheer')}
        </FloatingChip>
        <PersonChip
          image={landingImages.avatar1}
          className="end-1/7 top-1/5 motion-safe:animate-float-4"
        />
        <StatChip
          label={t('newSupporters.label')}
          className="end-1/8 bottom-2/9 motion-safe:animate-float-5"
        >
          <span className="text-subtitle font-black text-money-600 dark:text-money-400">
            {t('newSupporters.value')}
          </span>
        </StatChip>
      </div>
    </SamplePreview>
  )
}

function TierCard({
  image,
  name,
  price,
  lines,
  highlighted = false,
  className,
}: {
  image: (typeof landingImages)[keyof typeof landingImages]
  name: string
  price: string
  lines: string[]
  highlighted?: boolean
  className?: string
}) {
  const t = useTranslations('landing.sample')

  return (
    <div
      className={cn(
        'relative min-w-0 flex-1 overflow-hidden rounded-card border bg-card text-start sm:w-59 sm:flex-none',
        highlighted
          ? 'z-10 -translate-y-2 shadow-brand sm:-translate-y-3 sm:scale-105'
          : 'shadow-panel sm:scale-93',
        className
      )}
    >
      <Image
        {...image}
        alt=""
        sizes="(min-width: 40rem) 15rem, 33vw"
        className="h-16 w-full object-cover sm:h-32.5"
      />
      <div className="p-2 sm:px-4.5 sm:pt-4 sm:pb-4.5">
        <p className="text-micro font-bold text-foreground sm:text-body">
          {name}
        </p>
        <p className="mt-0.5 text-label font-black text-foreground sm:text-title-sm">
          {price}
        </p>
        <p className="mb-2 text-micro text-muted-foreground sm:mb-3 sm:text-caption">
          {t('perMonth')}
        </p>
        <div className="space-y-1.5 sm:space-y-2.5">
          {lines.map((width) => (
            <div key={width} className="flex items-center gap-1.5 sm:gap-2">
              <CheckBadge className="size-3 sm:size-4" />
              <TextBar className={width} />
            </div>
          ))}
        </div>
        <Button
          asChild
          size="sm"
          variant={highlighted ? 'default' : 'inverse'}
          className="mt-3 h-7 w-full rounded-full px-1 text-micro sm:h-9 sm:text-label"
        >
          <Link href="/creators">{t('join')}</Link>
        </Button>
      </div>
    </div>
  )
}

export function TiersVisual() {
  const t = useTranslations('landing.features.tiers')
  const tSample = useTranslations('landing.sample')

  return (
    <SamplePreview>
      <div className="relative flex min-h-95 items-end justify-center gap-2 pt-4 sm:items-center sm:gap-0">
        <TierCard
          image={landingImages.bronze}
          name={t('basic.name')}
          price={t('basic.price')}
          lines={['w-3/4', 'w-1/2']}
          className="sm:-me-9.5"
        />
        <TierCard
          image={landingImages.silver}
          name={t('pro.name')}
          price={t('pro.price')}
          lines={['w-4/5', 'w-2/3', 'w-1/2']}
          highlighted
        />
        <TierCard
          image={landingImages.gold}
          name={t('special.name')}
          price={t('special.price')}
          lines={['w-4/5', 'w-3/5', 'w-1/2', 'w-2/5']}
          className="sm:-ms-9.5"
        />
        <FloatingChip className="start-1/8 top-1/3 flex-col items-start gap-0.75 motion-safe:animate-float-2">
          <AvatarStack
            images={[
              landingImages.avatar1,
              landingImages.avatar,
              landingImages.avatar2,
            ]}
            className="size-5"
          />
          <span className="text-body-lg font-black">{t('members')}</span>
        </FloatingChip>
        <StatChip
          label={t('income.label')}
          className="end-1/8 top-3/8 motion-safe:animate-float-3"
        >
          <span className="text-subtitle font-black text-foreground">
            {t('income.value')}{' '}
            <span className="text-micro font-semibold text-muted-foreground">
              {tSample('toman')}
            </span>
          </span>
        </StatChip>
      </div>
    </SamplePreview>
  )
}

/** Like count under a post in the collage. */
function Likes({ count, className }: { count: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-caption font-semibold',
        className
      )}
    >
      <HeartIcon className="size-3.25" strokeWidth={2} aria-hidden />
      {count}
    </span>
  )
}

/**
 * The collage is laid out physically left-to-right in both languages, as in
 * the design (presentation `.fw-collage`, `direction: ltr`); the text inside
 * each tile follows the page's direction. Physical offsets below are
 * intentional and `rtl:` variants are avoided inside it, because they would
 * still match through the page's `dir="rtl"`.
 */
export function ContentVisual() {
  const t = useTranslations('landing.features.content')
  const dir = getDirection(useLocale())

  return (
    <SamplePreview>
      <div
        dir="ltr"
        className="mx-auto grid max-w-190 grid-cols-2 gap-3 md:grid-cols-12 md:gap-5"
      >
        <div className="relative col-span-2 h-40 overflow-hidden rounded-card shadow-panel md:col-span-7 md:h-64.5">
          <Image
            {...landingImages.stage}
            alt=""
            sizes="(min-width: 48rem) 28rem, 100vw"
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-b from-transparent from-45% to-ink-900/50" />
          <span className="absolute top-1/2 left-1/2 flex size-14 -translate-1/2 items-center justify-center rounded-full bg-white/95 text-ink-900 shadow-panel">
            <PlayIcon className="ms-0.5 size-4.5 fill-current" aria-hidden />
          </span>
          <div className="absolute inset-x-5.5 bottom-3 text-white">
            <div className="mb-2 h-1 rounded-full bg-white/40">
              <div className="relative h-full w-3/10 rounded-full bg-white after:absolute after:top-1/2 after:-right-1.5 after:size-3.25 after:-translate-y-1/2 after:rounded-full after:bg-white after:shadow-soft" />
            </div>
            <div className="flex justify-between text-label font-semibold">
              <span>{t('timeStart')}</span>
              <span>{t('timeEnd')}</span>
            </div>
          </div>
        </div>

        <div className="relative col-span-1 mt-3 h-40 md:col-span-5 md:mt-2.5 md:h-59.5">
          <div
            className="absolute inset-0 translate-x-3 -translate-y-3 rounded-card bg-linear-140 from-money-500/35 to-amber-500/30 md:translate-x-6.5 md:-translate-y-6.5"
            aria-hidden
          />
          <div
            className="absolute inset-0 translate-x-1.5 -translate-y-1.5 rounded-card bg-linear-140 from-amber-500/45 to-red-500/25 md:translate-x-3.25 md:-translate-y-3.25"
            aria-hidden
          />
          <div
            dir={dir}
            className="absolute inset-0 overflow-hidden rounded-card shadow-panel"
          >
            <Image
              {...landingImages.brushes}
              alt=""
              sizes="(min-width: 48rem) 20rem, 50vw"
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-b from-transparent from-50% to-ink-900/60" />
            <div className="absolute inset-x-4 bottom-3 text-white">
              <p className="mb-1 text-body font-bold md:text-body-lg">
                {t('photoCaption')}
              </p>
              <Likes count={t('likes')} className="text-white/90" />
            </div>
          </div>
        </div>

        <div
          dir={dir}
          className="col-span-2 flex flex-col rounded-card border bg-card p-5 text-start shadow-soft md:col-span-3 md:h-50"
        >
          <p className="mb-2 text-body font-bold text-foreground">
            {t('postTitle')}
          </p>
          <p className="flex-1 text-label leading-6 text-muted-foreground">
            {t('postBody')}
          </p>
          <Likes count={t('likes')} className="mt-2 text-muted-foreground" />
        </div>

        <div className="relative col-span-1 flex h-40 items-center justify-center rounded-card bg-locked-mock shadow-panel max-md:col-start-2 max-md:row-start-2 md:col-span-3 md:h-66">
          <span
            dir={dir}
            className="flex items-center gap-1.5 rounded-full bg-white px-5 py-2.75 text-label font-bold text-ink-900 shadow-panel"
          >
            <LockIcon className="size-3.25" strokeWidth={2.2} aria-hidden />
            {t('locked')}
          </span>
        </div>

        <div className="col-span-2 flex h-40 gap-4.5 rounded-card bg-money-700 p-3.5 text-white shadow-panel md:col-span-6 md:h-44.5">
          <div
            dir={dir}
            className="relative w-28 shrink-0 overflow-hidden rounded-lg md:w-37.5"
          >
            <Image
              {...landingImages.greenmic}
              alt=""
              sizes="9.5rem"
              className="size-full object-cover"
            />
            <p className="absolute inset-x-2.5 top-2.5 text-caption font-bold">
              {t('audioTitle')}
            </p>
            <span
              className="absolute bottom-2 left-2 flex flex-col gap-0.5"
              aria-hidden
            >
              <i className="block h-0.75 w-8.5 rounded-full bg-money-300/90" />
              <i className="block h-0.75 w-6.5 rounded-full bg-money-300/90" />
              <i className="block h-0.75 w-7.5 rounded-full bg-money-300/90" />
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-5">
            <div className="flex items-center justify-center gap-6.5">
              <span className="flex items-center gap-1 text-caption font-bold">
                <RotateCcwIcon className="size-4" aria-hidden />
                {t('skip')}
              </span>
              <span className="flex size-11.5 items-center justify-center rounded-full bg-white text-money-700 shadow-panel">
                <PlayIcon className="ms-0.5 size-4 fill-current" aria-hidden />
              </span>
              <span className="flex items-center gap-1 text-caption font-bold">
                {t('skip')}
                <RotateCwIcon className="size-4" aria-hidden />
              </span>
            </div>
            <div className="flex items-center gap-3 text-caption font-semibold">
              <span>{t('timeStart')}</span>
              <span className="h-1 flex-1 rounded-full bg-white/35">
                <span className="relative block h-full w-1/4 rounded-full bg-white after:absolute after:top-1/2 after:-right-1.5 after:size-3 after:-translate-y-1/2 after:rounded-full after:bg-white" />
              </span>
              <span>{t('timeEnd')}</span>
            </div>
          </div>
        </div>
      </div>
    </SamplePreview>
  )
}

/** A notification card beside the chat mock-up (presentation `.fw-notif`). */
function NoticeCard({
  icon,
  tint,
  title,
  detail,
}: {
  icon: ReactNode
  tint: string
  title: string
  detail: string
}) {
  return (
    <div className="flex w-full max-w-82 items-center gap-2.5 rounded-2xl border border-white/95 bg-card/90 px-4 py-3 text-start shadow-panel backdrop-blur-md md:w-48 dark:border-border">
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          tint
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-caption font-bold text-foreground">
          {title}
        </span>
        <span className="block text-micro text-muted-foreground">{detail}</span>
      </span>
    </div>
  )
}

export function ChatVisual() {
  const t = useTranslations('landing.features.chat')

  return (
    <SamplePreview>
      <div className="flex flex-col items-center justify-center gap-5.5 md:flex-row">
        <div className="flex w-full max-w-82 flex-col gap-3 rounded-card border bg-card p-5 text-start shadow-panel">
          <div className="flex items-center gap-2.5 border-b pb-3">
            <Image
              {...landingImages.avatar}
              alt=""
              sizes="2.25rem"
              className="size-8.5 rounded-full object-cover"
            />
            <TextBar className="h-2.5 w-24" />
          </div>
          <p className="max-w-4/5 self-start rounded-2xl rounded-es-sm bg-accent px-3.5 py-2.5 text-label leading-6 text-foreground">
            {t('fanMessage')}
          </p>
          <p className="max-w-4/5 self-end rounded-2xl rounded-ee-sm bg-cover-mix px-3.5 py-2.5 text-label leading-6 text-white">
            {t('creatorMessage')}
          </p>
        </div>
        <div className="flex w-full flex-col items-center gap-3.5 md:w-auto">
          <NoticeCard
            icon={<UserPlusIcon className="size-4" aria-hidden />}
            tint="bg-money-500/15 text-money-600 dark:text-money-400"
            title={t('newMemberTitle')}
            detail={t('newMemberDetail')}
          />
          <NoticeCard
            icon={<MessageCircleIcon className="size-4" aria-hidden />}
            tint="bg-violet-500/10 text-violet-600 dark:text-violet-300"
            title={t('unreadTitle')}
            detail={t('unreadDetail')}
          />
        </div>
      </div>
    </SamplePreview>
  )
}
