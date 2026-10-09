import { ArrowRight, ChartNoAxesColumn, Map, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router'
import { lazy, Suspense, useState } from 'react'

import { Reveal } from '@/components/landing/reveal'
import { useI18n } from '@/app/providers/locale-provider'
import { LandingImage } from '@/components/landing/landing-image'
import { EmptyState, FailureState, LoadingState } from '@/components/data/data-states'
import { buttonVariants } from '@/components/ui/button'
import { formatNumber } from '@/components/data/format'
import { usePrioritySummaryQuery } from '@/hooks/priority'
import { useProgressiveMapPoints } from '@/hooks/water-points'
import { cn } from '@/lib/utils'
import type { MapLayerId } from '@/components/map/map-layers'

// Leaflet is the heaviest library on this page; load it after the page itself paints.
const WaterPointMap = lazy(() =>
  import('@/components/map/water-point-map').then((m) => ({ default: m.WaterPointMap })),
)

const chain = [
  ['landing.short.data.title', 'landing.short.data.body'],
  ['landing.short.condition.title', 'landing.short.condition.body'],
  ['landing.short.risk.title', 'landing.short.risk.body'],
  ['landing.short.impact.title', 'landing.short.impact.body'],
  ['landing.short.priority.title', 'landing.short.priority.body'],
  ['landing.short.action.title', 'landing.short.action.body'],
] as const

const CHAIN_TINTS = ['bg-sky-100 text-sky-700','bg-teal-100 text-teal-700','bg-rose-100 text-rose-700','bg-violet-100 text-violet-700','bg-amber-100 text-amber-700','bg-emerald-100 text-emerald-700']

const capabilities = [
  [ShieldCheck, 'landing.short.featureRisk.title', 'landing.short.featureRisk.body', 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300'],
  [Users, 'landing.short.featureImpact.title', 'landing.short.featureImpact.body', 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300'],
  [ChartNoAxesColumn, 'landing.short.featurePriority.title', 'landing.short.featurePriority.body', 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300'],
  [Map, 'landing.short.featureMap.title', 'landing.short.featureMap.body', 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300'],
] as const

export function LandingRoute() {
  const { t } = useI18n()
  const [layer, setLayer] = useState<MapLayerId>('condition')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const mapQuery = useProgressiveMapPoints()
  const summary = usePrioritySummaryQuery()
  const mapPoints = mapQuery.data?.items ?? []

  return (
    <div className="overflow-hidden bg-background selection:bg-primary/15">
      <section aria-labelledby="landing-title" className="relative isolate overflow-hidden bg-water-800 text-white">
        <img src="/images/landing/hero-community-water-point.jpg" alt="" aria-hidden="true" fetchPriority="high" decoding="async" className="absolute inset-0 -z-20 size-full scale-110 object-cover object-[center_35%] blur-md" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-br from-water-900/90 via-water-800/80 to-water-600/70" />
        <div className="mx-auto w-full max-w-[var(--content-max-width)] px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
          <div className="max-w-3xl">
            <p className="text-mg-caption font-semibold uppercase tracking-[.16em] text-white/85">{t('landing.short.eyebrow')}</p>
            <h1 id="landing-title" className="mt-4 font-serif text-[clamp(2.5rem,5vw,4.25rem)] font-semibold leading-[1.08] tracking-[-.015em] text-white [text-shadow:0_2px_18px_rgb(6_20_50/0.45)] [text-wrap:balance]">
              {t('landing.short.title')}
            </h1>
            <p className="mt-6 max-w-xl text-mg-title-sm leading-relaxed text-white/95 [text-shadow:0_1px_10px_rgb(6_20_50/0.4)]">{t('landing.short.body')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className={cn(buttonVariants({ size: 'lg' }), 'gap-2 bg-white text-water-700 shadow-mg-2 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-mg-3')}>{t('landing.short.getStarted')}<ArrowRight aria-hidden="true" className="size-4" /></Link>
              <a href="#how-it-works" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-white/70 bg-white/5 text-white backdrop-blur-sm hover:bg-white/15 hover:text-white')}>{t('landing.short.explore')}</a>
            </div>
          </div>
        </div>
        <dl aria-label={t('landing.stat.label')} className="bg-water-900/55 backdrop-blur-md">
          <div className="mx-auto grid max-w-[var(--content-max-width)] divide-y divide-white/15 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {([
              [summary.data?.total_water_points, 'landing.stat.total', 'text-white'],
              [summary.data?.observed_non_functional, 'landing.stat.nonFunctional', 'text-risk-high-soft'],
              [summary.data?.eligible_restoration, 'landing.stat.restoration', 'text-water-300'],
            ] as const).map(([value, labelKey, tone]) => (
              <div key={labelKey} className="px-4 py-6 sm:px-6 lg:px-8">
                <dd className={cn('mg-figure text-3xl font-extrabold', tone)}>{value === undefined ? '—' : formatNumber(value)}</dd>
                <dt className="mt-1 text-mg-body-sm text-white/85">{t(labelKey)}</dt>
              </div>
            ))}
          </div>
        </dl>
      </section>

      <section id="about" aria-labelledby="question-title" className="border-b border-border bg-surface-subtle">
        <Reveal><div className="mx-auto grid max-w-[var(--content-max-width)] items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
          <div className="mx-auto aspect-square w-full max-w-lg overflow-hidden rounded-2xl shadow-mg-3 lg:max-w-none"><img src="/images/landing/picture2.jpg" alt={t('landing.about.photoAlt')} loading="lazy" decoding="async" className="size-full -rotate-90 object-cover" /></div>
          <div>
            <p className="text-mg-caption font-semibold uppercase tracking-[.14em] text-primary">{t('landing.short.problemEyebrow')}</p>
            <h2 id="question-title" className="mt-4 max-w-2xl font-serif text-[clamp(2rem,3.4vw,3.4rem)] font-semibold leading-[1.12] tracking-[-.01em] text-foreground [text-wrap:balance]">{t('landing.short.question')}</h2>
            <p className="mt-6 max-w-2xl text-mg-title-sm leading-relaxed text-muted-foreground">{t('landing.short.valueBody')}</p>
            <p className="mt-8 max-w-xl border-s-2 border-primary ps-5 text-mg-body font-medium text-foreground">{t('landing.short.questionSupport')}</p>
          </div>
        </div></Reveal>
      </section>

      <section id="spatial-story" aria-labelledby="spatial-title" className="border-b border-border bg-background">
        <div className="mx-auto max-w-[var(--content-max-width)] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
            <div><p className="text-mg-caption font-semibold uppercase tracking-[.14em] text-primary">{t('landing.gis.eyebrow')}</p><h2 id="spatial-title" className="mt-4 max-w-xl font-serif text-[clamp(2rem,3.6vw,3.6rem)] font-semibold leading-[1.1] tracking-[-.01em] text-foreground">{t('landing.gis.title')}</h2></div>
            <p className="max-w-xl text-mg-body leading-relaxed text-muted-foreground">{t('landing.gis.body')}</p>
          </div>
          <div className="mt-10 overflow-hidden rounded-panel border border-border bg-map-surface shadow-mg-3">
            {mapQuery.isPending ? <div className="flex min-h-[30rem] items-center justify-center"><LoadingState label={t('map.loading')} /></div> : mapQuery.isError ? <div className="p-6"><FailureState error={mapQuery.error} onRetry={() => void mapQuery.refetch()} /></div> : mapPoints.length === 0 ? <div className="p-6"><EmptyState body={t('overview.list.empty')} /></div> : <Suspense fallback={<div className="flex min-h-[30rem] items-center justify-center sm:min-h-[38rem]"><LoadingState label={t('map.loading')} /></div>}><WaterPointMap className="h-[30rem] sm:h-[38rem]" points={mapPoints} total={mapQuery.data?.total ?? mapPoints.length} filterLabel={t('filters.tanzania')} selectedId={selectedId} onSelect={setSelectedId} layer={layer} onLayerChange={setLayer} guestMode /></Suspense>}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><p className="max-w-xl text-mg-caption text-muted-foreground">{t('landing.short.mapNote')}</p></div>
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="chain-title" className="border-b border-border bg-surface-subtle">
        <div className="mx-auto max-w-[var(--content-max-width)] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl"><p className="text-mg-caption font-semibold uppercase tracking-[.14em] text-primary">{t('landing.short.chainEyebrow')}</p><h2 id="chain-title" className="mt-4 font-serif text-[clamp(2rem,3.6vw,3.6rem)] font-semibold leading-[1.1] tracking-[-.01em] text-foreground">{t('landing.short.chainTitle')}</h2></div>
          <ol className="mt-12 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {chain.map(([titleKey, bodyKey], index) => <li key={titleKey}><Reveal delay={index * 80} className="h-full"><div className="h-full rounded-2xl border border-white/60 bg-card/70 p-5 shadow-mg-1 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-mg-3"><span className={cn('mg-figure inline-flex size-9 items-center justify-center rounded-full text-mg-body-sm font-bold', CHAIN_TINTS[index])}>{index + 1}</span><h3 className="mt-4 font-serif text-lg font-semibold">{t(titleKey)}</h3><p className="mt-2 text-mg-body-sm leading-relaxed text-muted-foreground">{t(bodyKey)}</p></div></Reveal></li>)}
          </ol>
        </div>
      </section>

      <section id="features" aria-labelledby="features-title" className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-[var(--content-max-width)] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[.65fr_1.35fr] lg:px-8 lg:py-24"><div><p className="text-mg-caption font-semibold uppercase tracking-[.14em] text-primary">{t('landing.short.featuresEyebrow')}</p><h2 id="features-title" className="mt-4 font-serif text-[clamp(2rem,3.4vw,3.4rem)] font-semibold leading-[1.12] tracking-[-.01em] text-foreground">{t('landing.short.featuresTitle')}</h2></div><div className="grid gap-5 sm:grid-cols-2">{capabilities.map(([Icon, titleKey, bodyKey, tint], index) => <Reveal key={titleKey} delay={index * 90}><div className="group h-full rounded-2xl border border-white/60 bg-card/70 p-6 shadow-mg-2 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-mg-3"><span className={cn('inline-flex size-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110', tint)}><Icon aria-hidden="true" className="size-5" /></span><h3 className="mt-5 font-serif text-xl font-semibold">{t(titleKey)}</h3><p className="mt-2 text-mg-body-sm leading-relaxed text-muted-foreground">{t(bodyKey)}</p></div></Reveal>)}</div></div>
      </section>

      <section aria-labelledby="trust-title" className="border-b border-border bg-surface-subtle"><div className="mx-auto grid max-w-[var(--content-max-width)] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8 lg:py-20"><div><p className="text-mg-caption font-semibold uppercase tracking-[.14em] text-primary">{t('landing.short.trustEyebrow')}</p><h2 id="trust-title" className="mt-4 font-serif text-[clamp(2rem,3.4vw,3.4rem)] font-semibold leading-[1.12] tracking-[-.01em] text-foreground">{t('landing.short.trustTitle')}</h2></div><div className="space-y-5 text-mg-body leading-relaxed text-muted-foreground"><p>{t('landing.short.trustBody')}</p><p className="border-s-2 border-primary ps-5 text-mg-body-sm font-medium text-foreground">{t('landing.users.disclaimer')}</p></div></div></section>

      <section aria-labelledby="closing-title" className="bg-background text-foreground"><div className="mx-auto max-w-[var(--content-max-width)] px-4 py-16 sm:px-6 lg:px-8 lg:py-24"><Reveal><div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"><div className="max-w-2xl"><h2 id="closing-title" className="font-serif text-[clamp(2rem,3.4vw,3.4rem)] font-semibold leading-[1.1] tracking-[-.01em] text-foreground [text-wrap:balance]">{t('landing.short.closingTitle')}</h2><p className="mt-5 max-w-xl text-mg-title-sm text-muted-foreground">{t('landing.short.closingBody')}</p><Link to="/signup" className={cn(buttonVariants({ size: 'lg' }), 'mt-8 shadow-mg-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-mg-3')}>{t('landing.short.getStarted')}</Link></div><LandingImage src="/images/landing/picture3.jpg" altKey="landing.closing.photoAlt" aspectClass="aspect-[4/3] object-cover" className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl shadow-mg-3 lg:max-w-none [&_img]:rounded-2xl [&_img]:border-0" fallback={{ kind: 'none' }} /></div></Reveal></div></section>
    </div>
  )
}
