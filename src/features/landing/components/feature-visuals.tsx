import {
  CheckIcon,
  LockIcon,
  PlayIcon,
  RotateCcwIcon,
  RotateCwIcon,
  UserPlusIcon,
} from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

import { landingImages } from './landing-images'
import { SamplePreview } from './sample-preview'

/** A grey stand-in for text in a mock-up. */
function TextBar({ className }: { className: string }) {
  return <span className={cn('block h-2 rounded-full bg-accent', className)} />
}

function FloatingChip({
  image,
  className,
}: {
  image: (typeof landingImages)[keyof typeof landingImages]
  className: string
}) {
  return (
    <div
      className={cn(
        'absolute z-20 hidden items-center gap-2.5 rounded-full border bg-card/90 py-2 ps-3 pe-4 shadow-panel backdrop-blur-md lg:flex',
        className
      )}
      aria-hidden
    >
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
    </div>
  )
}

export function SupportVisual() {
  const t = useTranslations('landing.features.support')

  return (
    <SamplePreview>
      <div className="relative flex min-h-80 items-center justify-center">
        <div className="relative z-10 w-full max-w-78 overflow-hidden rounded-card border bg-card text-center shadow-panel">
          <div className="relative h-24">
            <Image
              {...landingImages.brushes}
              alt=""
              sizes="20rem"
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-b from-transparent to-card" />
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
            <TextBar className="mx-auto mb-5 w-1/2" />
            <Button asChild className="w-full rounded-full">
              <Link href="/creators">{t('action')}</Link>
            </Button>
          </div>
        </div>
        <FloatingChip
          image={landingImages.avatar2}
          className="start-20 top-8"
        />
        <FloatingChip image={landingImages.avatar1} className="end-20 top-16" />
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
        'relative min-w-0 flex-1 overflow-hidden rounded-card border bg-card text-start sm:w-56 sm:flex-none',
        highlighted
          ? 'z-10 -translate-y-2 shadow-brand sm:-translate-y-3 sm:scale-105'
          : 'shadow-panel sm:scale-95',
        className
      )}
    >
      <Image
        {...image}
        alt=""
        sizes="(min-width: 40rem) 14rem, 33vw"
        className="h-16 w-full object-cover sm:h-32"
      />
      <div className="p-2 sm:p-4">
        <p className="text-micro font-bold text-foreground sm:text-body">
          {name}
        </p>
        <p className="mt-0.5 text-label font-bold text-foreground sm:text-title-sm">
          {price}
        </p>
        <p className="mb-2 text-micro text-muted-foreground sm:mb-3 sm:text-caption">
          {t('perMonth')}
        </p>
        <div className="space-y-1.5 sm:space-y-2.5">
          {lines.map((width) => (
            <div key={width} className="flex items-center gap-1.5 sm:gap-2">
              <CheckIcon
                className="size-3 shrink-0 rounded-full bg-money-500/15 p-0.5 text-money-600 sm:size-4 dark:text-money-400"
                aria-hidden
              />
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

  return (
    <SamplePreview>
      <div className="flex items-center justify-center gap-1 pt-4 sm:gap-0">
        <TierCard
          image={landingImages.bronze}
          name={t('basic.name')}
          price={t('basic.price')}
          lines={['w-3/4', 'w-1/2']}
          className="sm:-me-9"
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
          className="sm:-ms-9"
        />
      </div>
    </SamplePreview>
  )
}

export function ContentVisual() {
  const t = useTranslations('landing.features.content')

  return (
    <SamplePreview>
      <div className="mx-auto grid max-w-190 grid-cols-2 gap-3 text-start md:grid-cols-12 md:gap-5">
        <div className="relative col-span-2 h-40 overflow-hidden rounded-card shadow-panel md:col-span-7 md:h-64">
          <Image
            {...landingImages.stage}
            alt=""
            sizes="(min-width: 48rem) 28rem, 100vw"
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-ink-900/50" />
          <span className="absolute start-1/2 top-1/2 flex size-14 -translate-1/2 items-center justify-center rounded-full bg-white/95 text-ink-900 shadow-panel rtl:translate-x-1/2">
            <PlayIcon className="size-5 fill-current" aria-hidden />
          </span>
          <div className="absolute inset-x-5 bottom-3 text-white" dir="ltr">
            <div className="mb-2 h-1 rounded-full bg-white/40">
              <div className="h-full w-1/3 rounded-full bg-white" />
            </div>
            <div className="flex justify-between text-label font-semibold">
              <span>{t('timeStart')}</span>
              <span>{t('timeEnd')}</span>
            </div>
          </div>
        </div>

        <div className="relative col-span-1 mt-3 h-40 md:col-span-5 md:h-60">
          <div
            className="absolute inset-0 translate-x-3 -translate-y-3 rounded-card bg-money-100 rtl:-translate-x-3 dark:bg-money-700"
            aria-hidden
          />
          <div
            className="absolute inset-0 translate-x-1.5 -translate-y-1.5 rounded-card bg-amber-100 rtl:-translate-x-1.5 dark:bg-amber-700"
            aria-hidden
          />
          <div className="absolute inset-0 overflow-hidden rounded-card shadow-panel">
            <Image
              {...landingImages.brushes}
              alt=""
              sizes="(min-width: 48rem) 20rem, 50vw"
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-ink-900/60" />
            <p className="absolute inset-x-4 bottom-3 text-body font-bold text-white md:text-body-lg">
              {t('photoCaption')}
            </p>
          </div>
        </div>

        <div className="relative col-span-1 flex h-40 items-center justify-center rounded-card bg-cover-violet shadow-panel md:order-4 md:col-span-3 md:h-52">
          <span className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-label font-bold text-ink-900 shadow-panel">
            <LockIcon className="size-3.5" aria-hidden />
            {t('locked')}
          </span>
        </div>

        <div className="col-span-2 rounded-card border bg-card p-5 shadow-soft md:order-3 md:col-span-3 md:h-52">
          <p className="mb-2 text-body font-bold text-foreground">
            {t('postTitle')}
          </p>
          <p className="text-label leading-6 text-muted-foreground">
            {t('postBody')}
          </p>
        </div>

        <div className="col-span-2 flex h-40 gap-4 rounded-card bg-money-700 p-3.5 text-white shadow-panel md:order-5 md:col-span-6 md:h-44">
          <div className="relative w-28 shrink-0 overflow-hidden rounded-lg md:w-36">
            <Image
              {...landingImages.greenmic}
              alt=""
              sizes="9rem"
              className="size-full object-cover"
            />
            <p className="absolute inset-x-2.5 top-2.5 text-caption font-bold">
              {t('audioTitle')}
            </p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-5">
            <div className="flex items-center justify-center gap-5" dir="ltr">
              <span className="flex items-center gap-1 text-caption font-bold">
                <RotateCcwIcon className="size-4" aria-hidden />
                {t('skip')}
              </span>
              <span className="flex size-11 items-center justify-center rounded-full bg-white text-money-700 shadow-panel">
                <PlayIcon className="size-4 fill-current" aria-hidden />
              </span>
              <span className="flex items-center gap-1 text-caption font-bold">
                {t('skip')}
                <RotateCwIcon className="size-4" aria-hidden />
              </span>
            </div>
            <div
              className="flex items-center gap-3 text-caption font-semibold"
              dir="ltr"
            >
              <span>{t('timeStart')}</span>
              <span className="h-1 flex-1 rounded-full bg-white/35">
                <span className="block h-full w-1/4 rounded-full bg-white" />
              </span>
              <span>{t('timeEnd')}</span>
            </div>
          </div>
        </div>
      </div>
    </SamplePreview>
  )
}

export function ChatVisual() {
  const t = useTranslations('landing.features.chat')

  return (
    <SamplePreview>
      <div className="flex flex-col items-center justify-center gap-5 md:flex-row">
        <div className="flex w-full max-w-82 flex-col gap-3 rounded-card border bg-card p-5 text-start shadow-panel">
          <div className="flex items-center gap-2.5 border-b pb-3">
            <Image
              {...landingImages.avatar}
              alt=""
              sizes="2.25rem"
              className="size-9 rounded-full object-cover"
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
        <div className="flex w-full max-w-82 items-center gap-2.5 rounded-xl border bg-card/90 px-4 py-3 text-start shadow-panel backdrop-blur-md md:w-48">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-money-500/15 text-money-600 dark:text-money-400">
            <UserPlusIcon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-caption font-bold text-foreground">
              {t('newMemberTitle')}
            </span>
            <span className="block text-micro text-muted-foreground">
              {t('newMemberDetail')}
            </span>
          </span>
        </div>
      </div>
    </SamplePreview>
  )
}
