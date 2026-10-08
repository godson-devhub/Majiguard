import { ArrowDown, ArrowRight, ChartNoAxesColumn, Map, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router'
import { useState } from 'react'

import { useI18n } from '@/app/providers/locale-provider'
import { LandingImage } from '@/components/landing/landing-image'
import { EmptyState, FailureState, LoadingState } from '@/components/data/data-states'
import { WaterPointMap } from '@/components/map/water-point-map'
import { buttonVariants } from '@/components/ui/button'
import { useProgressiveMapPoints } from '@/hooks/water-points'
import { cn } from '@/lib/utils'
import type { MapLayerId } from '@/components/map/map-layers'

const chain = [
  ['landing.short.data.title', 'landing.short.data.body'],
  ['landing.short.condition.title', 'landing.short.condition.body'],
  ['landing.short.risk.title', 'landing.short.risk.body'],
  ['landing.short.impact.title', 'landing.short.impact.body'],
  ['landing.short.priority.title', 'landing.short.priority.body'],
  ['landing.short.action.title', 'landing.short.action.body'],
] as const

const capabilities = [
  [ShieldCheck, 'landing.short.featureRisk.title', 'landing.short.featureRisk.body'],
  [Users, 'landing.short.featureImpact.title', 'landing.short.featureImpact.body'],
  [ChartNoAxesColumn, 'landing.short.featurePriority.title', 'landing.short.featurePriority.body'],
  [Map, 'landing.short.featureMap.title', 'landing.short.featureMap.body'],
] as const

export function LandingRoute() {
  const { t } = useI18n()
  const [layer, setLayer] = useState<MapLayerId>('condition')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const mapQuery = useProgressiveMapPoints()
  const mapPoints = mapQuery.data?.items ?? []

  return (
    <div className="overflow-hidden bg-background selection:bg-primary/15">
      <section aria-labelledby="landing-title" className="relative border-b border-border bg-background">
        <div className="mx-auto grid min-h-[min(760px,calc(100dvh-7rem))] w-full max-w-[var(--content-max-width)] items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8 lg:py-20">
          <div className="relative z-10 max-w-xl py-6">
            <p className="text-mg-caption font-semibold uppercase tracking-[.18em] text-primary">{t('landing.short.eyebrow')}</p>
            <h1 id="landing-title" className="mt-5 max-w-[10ch] text-[clamp(3.25rem,7vw,7rem)] font-semibold leading-[.9] tracking-[-.065em] text-foreground [text-wrap:balance]">
              {t('landing.short.title')}
            </h1>
            <p className="mt-7 max-w-lg text-mg-title-sm leading-relaxed text-muted-foreground">{t('landing.short.body')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}>{t('landing.short.getStarted')}<ArrowRight aria-hidden="true" className="size-4" /></Link>
              <a href="#spatial-story" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>{t('landing.short.explore')}</a>
            </div>
          </div>
          <div className="relative min-h-[22rem] self-stretch lg:min-h-0">
            <div className="absolute inset-0 overflow-hidden rounded-panel bg-header shadow-mg-3">
              <LandingImage src="/images/landing/hero-community-water-point.jpg" altKey="landing.hero.photoAlt" priority aspectClass="h-full min-h-[22rem] object-cover opacity-90" className="h-full" fallback={{ kind: 'placeholder', subjectKey: 'landing.hero.imageSubject', altKey: 'landing.hero.imageAlt' }} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-header/80 via-transparent to-primary/20" />
              <div className="absolute bottom-5 start-5 max-w-[15rem] border-s border-header-foreground/60 ps-4 text-header-foreground">
                <p className="text-mg-caption font-semibold uppercase tracking-[.16em]">{t('landing.short.spatialLabel')}</p>
                <p className="mt-2 text-mg-body-sm">{t('landing.short.spatialBody')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" aria-labelledby="question-title" className="border-b border-border bg-surface-subtle">
        <div className="mx-auto grid max-w-[var(--content-max-width)] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8 lg:py-24">
          <p className="text-mg-caption font-semibold uppercase tracking-[.18em] text-primary">{t('landing.short.problemEyebrow')}</p>
          <div>
            <h2 id="question-title" className="max-w-4xl text-[clamp(2rem,4vw,4.4rem)] font-semibold leading-[.98] tracking-[-.055em] text-foreground [text-wrap:balance]">{t('landing.short.question')}</h2>
            <p className="mt-6 max-w-2xl text-mg-title-sm leading-relaxed text-muted-foreground">{t('landing.short.valueBody')}</p>
            <p className="mt-8 max-w-xl border-s-2 border-primary ps-5 text-mg-body font-medium text-foreground">{t('landing.short.questionSupport')}</p>
          </div>
        </div>
      </section>

      <section id="spatial-story" aria-labelledby="spatial-title" className="border-b border-border bg-background">
        <div className="mx-auto max-w-[var(--content-max-width)] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
            <div><p className="text-mg-caption font-semibold uppercase tracking-[.18em] text-primary">{t('landing.gis.eyebrow')}</p><h2 id="spatial-title" className="mt-4 max-w-xl text-[clamp(2.2rem,4vw,4.8rem)] font-semibold leading-[.95] tracking-[-.06em] text-foreground">{t('landing.gis.title')}</h2></div>
            <p className="max-w-xl text-mg-body leading-relaxed text-muted-foreground">{t('landing.gis.body')}</p>
          </div>
          <div className="mt-10 overflow-hidden rounded-panel border border-border bg-map-surface shadow-mg-3">
            {mapQuery.isPending ? <div className="flex min-h-[30rem] items-center justify-center"><LoadingState label={t('map.loading')} /></div> : mapQuery.isError ? <div className="p-6"><FailureState error={mapQuery.error} onRetry={() => void mapQuery.refetch()} /></div> : mapPoints.length === 0 ? <div className="p-6"><EmptyState body={t('overview.list.empty')} /></div> : <WaterPointMap className="h-[30rem] sm:h-[38rem]" points={mapPoints} total={mapQuery.data?.total ?? mapPoints.length} filterLabel={t('filters.tanzania')} selectedId={selectedId} onSelect={setSelectedId} layer={layer} onLayerChange={setLayer} />}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><p className="max-w-xl text-mg-caption text-muted-foreground">{t('landing.short.mapNote')}</p><Link to="/decision-map" className="text-mg-body-sm font-semibold text-primary underline-offset-4 hover:underline">{t('landing.short.openMap')} <ArrowRight aria-hidden="true" className="ms-1 inline size-4" /></Link></div>
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="chain-title" className="border-b border-border bg-surface-subtle">
        <div className="mx-auto max-w-[var(--content-max-width)] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl"><p className="text-mg-caption font-semibold uppercase tracking-[.18em] text-primary">{t('landing.short.chainEyebrow')}</p><h2 id="chain-title" className="mt-4 text-[clamp(2.2rem,4vw,4.8rem)] font-semibold leading-[.95] tracking-[-.06em] text-foreground">{t('landing.short.chainTitle')}</h2></div>
          <ol className="mt-12 grid gap-0 md:grid-cols-6">
            {chain.map(([titleKey, bodyKey], index) => <li key={titleKey} className="group relative border-s-2 border-primary/30 py-5 ps-6 first:border-primary md:border-s-0 md:border-t-2 md:py-6 md:ps-0 md:pe-6"><span className="mg-figure text-mg-caption font-semibold text-primary">0{index + 1}</span><h3 className="mt-4 text-mg-title-sm font-semibold">{t(titleKey)}</h3><p className="mt-2 text-mg-caption leading-relaxed text-muted-foreground">{t(bodyKey)}</p>{index < chain.length - 1 ? <ArrowDown aria-hidden="true" className="absolute bottom-[-.6rem] start-[-.55rem] size-4 text-primary md:hidden" /> : null}</li>)}
          </ol>
        </div>
      </section>

      <section id="features" aria-labelledby="features-title" className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-[var(--content-max-width)] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[.65fr_1.35fr] lg:px-8 lg:py-24"><div><p className="text-mg-caption font-semibold uppercase tracking-[.18em] text-primary">{t('landing.short.featuresEyebrow')}</p><h2 id="features-title" className="mt-4 text-[clamp(2rem,3.5vw,4rem)] font-semibold leading-[.98] tracking-[-.055em] text-foreground">{t('landing.short.featuresTitle')}</h2></div><div className="grid gap-0 sm:grid-cols-2">{capabilities.map(([Icon, titleKey, bodyKey]) => <div key={titleKey} className="border-t border-border py-6 sm:pe-8"><Icon aria-hidden="true" className="size-5 text-primary" /><h3 className="mt-5 text-mg-title-sm font-semibold">{t(titleKey)}</h3><p className="mt-2 text-mg-body-sm leading-relaxed text-muted-foreground">{t(bodyKey)}</p></div>)}</div></div>
      </section>

      <section aria-labelledby="trust-title" className="border-b border-border bg-surface-subtle"><div className="mx-auto grid max-w-[var(--content-max-width)] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8 lg:py-20"><div><p className="text-mg-caption font-semibold uppercase tracking-[.18em] text-primary">{t('landing.short.trustEyebrow')}</p><h2 id="trust-title" className="mt-4 text-[clamp(2rem,3.5vw,4rem)] font-semibold leading-[.98] tracking-[-.055em] text-foreground">{t('landing.short.trustTitle')}</h2></div><div className="space-y-5 text-mg-body leading-relaxed text-muted-foreground"><p>{t('landing.short.trustBody')}</p><p className="border-s-2 border-primary ps-5 text-mg-body-sm font-medium text-foreground">{t('landing.users.disclaimer')}</p></div></div></section>

      <section aria-labelledby="closing-title" className="bg-header text-header-foreground"><div className="mx-auto max-w-[var(--content-max-width)] px-4 py-16 sm:px-6 lg:px-8 lg:py-28"><div className="max-w-3xl"><h2 id="closing-title" className="text-[clamp(2.5rem,5vw,6rem)] font-semibold leading-[.92] tracking-[-.065em]">{t('landing.short.closingTitle')}</h2><p className="mt-6 max-w-xl text-mg-title-sm text-header-foreground/75">{t('landing.short.closingBody')}</p><Link to="/signup" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'mt-8')}>{t('landing.short.getStarted')}</Link></div></div></section>
    </div>
  )
}
