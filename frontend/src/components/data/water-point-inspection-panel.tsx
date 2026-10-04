import { Droplets, FileQuestion, LoaderCircle, MapPin, Play } from 'lucide-react'
import type { ReactNode } from 'react'

import { useI18n } from '@/app/providers/locale-provider'
import { ObservedStatusChip } from '@/components/data/observed-status'
import {
  formatCoordinatePair,
  formatDate,
  formatDateTime,
  formatNumber,
} from '@/components/data/format'
import { SemanticChip } from '@/components/status/semantic-chip'
import { useImpactQuery, usePredictionQuery, useConsequenceQuery } from '@/hooks/water-points'
import { isStored } from '@/lib/api-result'
import { useWaterPointQuery } from '@/hooks/water-points'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useComputeWaterPointMutation } from '@/hooks/water-points'
import type { MapPointOut } from '@/types/api'

/**
 * Section heading used by the four assessment sections, so a reader cannot
 * confuse observed survey data with model output: each section carries its own
 * label and a one-line note on what kind of quantity it holds.
 */
function SectionHeader({
  title,
  note,
  className,
}: {
  title: string
  note?: string
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3', className)}>
      <div>
        <h3 className="text-mg-body-sm font-semibold text-foreground">{title}</h3>
        {note === undefined ? null : (
          <p className="mt-0.5 text-mg-caption text-muted-foreground">{note}</p>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-mg-caption text-muted-foreground">{label}</dt>
      <dd className="mg-figure mt-0.5 text-mg-body-sm text-foreground">{children}</dd>
    </div>
  )
}

function NotStored({ body }: { body: string }) {
  const { t } = useI18n()
  return (
    <p className="flex items-center gap-2 text-mg-caption text-muted-foreground">
      <FileQuestion aria-hidden="true" className="size-3.5 shrink-0" />
      {t('detail.notComputed')} — {body}
    </p>
  )
}

/**
 * Risk section: renders the stored prediction only. The probability is
 * presented as the model's estimate with its own decision threshold and
 * methodology version; the risk band chip uses the API's own band when present.
 */
function RiskSection({ id }: { id: number }) {
  const { t } = useI18n()
  const query = usePredictionQuery(id)

  if (query.isPending) {
    return <p className="text-mg-caption text-muted-foreground">{t('availability.checking')}</p>
  }
  if (query.isError) {
    return <p className="text-mg-caption text-destructive">{t('data.error.title')}</p>
  }
  if (!isStored(query.data)) {
    return <NotStored body={t('data.prediction.notStored.title')} />
  }

  const data = query.data.data
  // The band strings are the frozen ML methodology's own vocabulary
  // (majiguard_ml/predict.py): "Functional", "Non-Functional / Moderate Risk",
  // "Non-Functional / High Risk". The chip tone follows that band; an unknown
  // value stays neutral rather than being guessed into a hazard tone.
  const bandTone: 'low' | 'moderate' | 'high' | null =
    data.risk_band === 'Functional'
      ? 'low'
      : data.risk_band === 'Non-Functional / Moderate Risk'
        ? 'moderate'
        : data.risk_band === 'Non-Functional / High Risk'
          ? 'high'
          : null

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {bandTone !== null ? (
          <SemanticChip kind="risk" tone={bandTone} />
        ) : (
          <span className="rounded-sm border border-border bg-muted px-2 py-1 text-mg-caption text-foreground">
            {data.risk_band ?? t('data.notRecorded')}
          </span>
        )}
        <span className="mg-figure text-mg-title-md font-semibold text-foreground">
          {formatNumber(data.probability_non_functional)}
        </span>
        <span className="text-mg-caption text-muted-foreground">
          {t('data.column.probabilityNonFunctional')}
        </span>
      </div>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
        <Field label={t('data.result.decisionThreshold')}>
          {formatNumber(data.decision_threshold)}
        </Field>
        <Field label={t('data.result.predictedStatus')}>
          {data.predicted_status ?? t('data.notRecorded')}
        </Field>
        <Field label={t('data.result.methodology')}>
          {data.prediction_methodology_version}
        </Field>
      </dl>
      <p className="text-mg-caption text-muted-foreground">
        {t('detail.assessedAt', { dateTime: formatDateTime(data.computed_at) })}
      </p>
    </div>
  )
}

/**
 * Impact section: the stored relative score with its two documented components.
 * Every label says "relative": this is a proxy, never a count of people.
 */
function ImpactSection({ id, impactHigh }: { id: number; impactHigh?: boolean | null }) {
  const { t } = useI18n()
  const query = useImpactQuery(id)

  if (query.isPending) {
    return <p className="text-mg-caption text-muted-foreground">{t('availability.checking')}</p>
  }
  if (query.isError) {
    return <p className="text-mg-caption text-destructive">{t('data.error.title')}</p>
  }
  if (!isStored(query.data)) {
    return <NotStored body={t('data.impact.notStored.title')} />
  }

  const data = query.data.data
  if (!data.impact_available) {
    return (
      <NotStored
        body={data.impact_unavailable_reason ?? t('data.impact.notStored.title')}
      />
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="mg-figure text-mg-title-md font-semibold text-foreground">
          {formatNumber(data.impact_score)}
        </span>
        <span className="text-mg-caption text-muted-foreground">
          {t('data.result.impactScore')} · {t('detail.section.impactNote')}
        </span>
        {impactHigh === true ? <SemanticChip kind="impact" tone="high" /> : null}
      </div>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <Field label={t('data.result.populationComponent')}>
          {formatNumber(data.population_component)}
        </Field>
        <Field label={t('data.result.alternativeScarcityComponent')}>
          {formatNumber(data.alternative_scarcity_component)}
        </Field>
      </dl>
      <p className="text-mg-caption text-muted-foreground">
        {t('detail.assessedAt', { dateTime: formatDateTime(data.computed_at) })}
      </p>
    </div>
  )
}

/**
 * Consequence section: the stored risk-impact index with the two inputs it was
 * derived from. The wording never claims maintenance priority.
 */
function ConsequenceSection({ id }: { id: number }) {
  const { t } = useI18n()
  const query = useConsequenceQuery(id)

  if (query.isPending) {
    return <p className="text-mg-caption text-muted-foreground">{t('availability.checking')}</p>
  }
  if (query.isError) {
    return <p className="text-mg-caption text-destructive">{t('data.error.title')}</p>
  }
  if (!isStored(query.data)) {
    return <NotStored body={t('data.consequence.notStored.title')} />
  }

  const data = query.data.data
  if (!data.risk_impact_index_available) {
    return (
      <NotStored
        body={data.consequence_priority_unavailable_reason ?? t('data.consequence.notStored.title')}
      />
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="mg-figure text-mg-title-md font-semibold text-foreground">
          {formatNumber(data.risk_impact_index)}
        </span>
        <span className="text-mg-caption text-muted-foreground">
          {t('data.result.riskImpactIndex')} · {t('detail.section.consequenceNote')}
        </span>
      </div>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <Field label={t('data.column.probabilityNonFunctional')}>
          {formatNumber(data.probability_non_functional)}
        </Field>
        <Field label={t('data.result.impactScore')}>
          {formatNumber(data.impact_score)}
        </Field>
      </dl>
      <p className="text-mg-caption text-muted-foreground">
        {t('detail.assessedAt', { dateTime: formatDateTime(data.computed_at) })}
      </p>
    </div>
  )
}

/**
 * One priority pathway's stored score and national rank. Preventive and
 * restoration are never combined into one figure - each renders its own
 * block, and only when the backend's own eligibility flag is true.
 */
function PriorityPathwayBlock({
  titleKey,
  score,
  rank,
}: {
  titleKey: 'detail.priority.preventive' | 'detail.priority.restoration'
  score: number | null
  rank: number | null
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-2">
      <p className="text-mg-caption font-semibold text-foreground">{t(titleKey)}</p>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="mg-figure text-mg-title-md font-semibold text-foreground">
          {formatNumber(score)}
        </span>
        <span className="text-mg-caption text-muted-foreground">
          {t('data.result.priorityScore')}
        </span>
      </div>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <Field label={t('data.result.priorityRank')}>{formatNumber(rank)}</Field>
      </dl>
    </div>
  )
}

/**
 * Priority section: reads the backend-stored eligibility, score and rank for
 * both pathways straight from the already-fetched map record passed in by the
 * caller - no new request, no combined score, no band. A point ineligible for
 * both pathways is stated as such, never shown as a zero.
 */
function PrioritySection({ mapPoint }: { mapPoint: MapPointOut | null }) {
  const { t } = useI18n()

  if (mapPoint === null) {
    return <NotStored body={t('detail.priority.notAvailableHere')} />
  }

  const preventiveEligible = mapPoint.preventive_priority_eligible === true
  const restorationEligible = mapPoint.restoration_priority_eligible === true

  if (!preventiveEligible && !restorationEligible) {
    return <NotStored body={t('detail.priority.notEligible')} />
  }

  return (
    <div className="space-y-3">
      {preventiveEligible ? (
        <PriorityPathwayBlock
          titleKey="detail.priority.preventive"
          score={mapPoint.preventive_priority_score}
          rank={mapPoint.preventive_priority_rank}
        />
      ) : null}
      {restorationEligible ? (
        <PriorityPathwayBlock
          titleKey="detail.priority.restoration"
          score={mapPoint.restoration_priority_score}
          rank={mapPoint.restoration_priority_rank}
        />
      ) : null}
      {mapPoint.priority_methodology_version !== null ? (
        <p className="text-mg-caption text-muted-foreground">
          {t('data.result.methodology')}: {mapPoint.priority_methodology_version}
        </p>
      ) : null}
    </div>
  )
}

type WaterPointInspectionPanelProps = {
  id: number | null
  /** The selected point's already-fetched map record, when the caller has one
   * (e.g. the dashboard map and risk worklist, both backed by `useMapPointsAll`).
   * Used only to read the stored priority fields - never refetched here. */
  mapPoint?: MapPointOut | null
  /** Compact hides the location block, for use inside the map selection flow. */
  compact?: boolean
  className?: string
}

/**
 * The per-water-point inspection experience: observed survey data on top,
 * then the three model views, each in its own bordered section with its own
 * heading and note. A value that is not stored is stated as such — never
 * rendered as a zero or an assumed band.
 */
export function WaterPointInspectionPanel({
  id,
  mapPoint = null,
  compact = false,
  className,
}: WaterPointInspectionPanelProps) {
  const { t } = useI18n()
  const compute = useComputeWaterPointMutation()
  const query = useWaterPointQuery(id)

  if (id === null) {
    return (
      <div className={cn('rounded-md border border-dashed border-border-strong bg-muted/40 px-4 py-3', className)}>
        <p className="flex items-center gap-2 text-mg-body-sm text-muted-foreground">
          <MapPin aria-hidden="true" className="size-4 shrink-0" />
          {t('detail.selectHint')}
        </p>
      </div>
    )
  }

  if (query.isPending) {
    return (
      <div className={cn('rounded-md border border-border bg-card px-4 py-4', className)}>
        <p className="text-mg-caption text-muted-foreground">{t('data.loading')}</p>
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className={cn('rounded-md border border-border bg-card px-4 py-4', className)}>
        <p className="text-mg-caption text-destructive">{t('data.error.title')}</p>
      </div>
    )
  }

  const point = query.data

  return (
    <article
      aria-label={t('detail.inspection.title')}
      className={cn('overflow-hidden rounded-md border border-border bg-card', className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-sm border border-border bg-card text-primary"
          >
            <Droplets className="size-4" />
          </span>
          <div>
            <p className="text-mg-caption text-muted-foreground">
              {t('detail.inspection.title')}
            </p>
            <p className="mg-figure text-mg-title-sm font-semibold text-foreground">
              {point.master_id}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ObservedStatusChip value={point.observed_status} />
          <Button type="button" size="sm" variant="outline" disabled={compute.isPending} onClick={() => compute.mutate(id)} aria-label={t('detail.assessAction')}>
            {compute.isPending ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : <Play aria-hidden="true" className="size-3.5" />}
            {t('detail.assessAction')}
          </Button>
        </div>
      </header>
      {compute.isError ? <p role="alert" className="border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-mg-caption text-destructive">{t('detail.assessError')}</p> : null}

      <div className="divide-y divide-border">
        <section aria-label={t('detail.section.observed')} className="px-4 py-3.5">
          <SectionHeader title={t('detail.section.observed')} note={t('detail.section.observedNote')} />
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label={t('data.column.masterId')}>{point.master_id}</Field>
            <Field label={t('data.column.wpdxId')}>{point.wpdx_id}</Field>
            {!compact ? (
              <>
                <Field label={t('data.column.region')}>
                  {point.nbs_region ?? t('data.notRecorded')}
                </Field>
                <Field label={t('data.column.surveyDate')}>
                  {formatDate(point.survey_date)}
                </Field>
                <Field label={t('data.column.coordinates')}>
                  {formatCoordinatePair(point.latitude, point.longitude)}
                </Field>
              </>
            ) : null}
          </dl>
        </section>

        <section aria-label={t('detail.section.risk')} className="px-4 py-3.5">
          <SectionHeader title={t('detail.section.risk')} note={t('detail.section.riskNote')} />
          <div className="mt-3">
            <RiskSection id={id} />
          </div>
        </section>

        <section aria-label={t('detail.section.impact')} className="px-4 py-3.5">
          <SectionHeader title={t('detail.section.impact')} note={t('detail.section.impactNote')} />
          <div className="mt-3">
            <ImpactSection id={id} impactHigh={mapPoint?.impact_high} />
          </div>
        </section>

        <section aria-label={t('detail.section.consequence')} className="px-4 py-3.5">
          <SectionHeader
            title={t('detail.section.consequence')}
            note={t('detail.section.consequenceNote')}
          />
          <div className="mt-3">
            <ConsequenceSection id={id} />
          </div>
        </section>

        <section aria-label={t('detail.section.priority')} className="px-4 py-3.5">
          <SectionHeader
            title={t('detail.section.priority')}
            note={t('detail.section.priorityNote')}
          />
          <div className="mt-3">
            <PrioritySection mapPoint={mapPoint} />
          </div>
        </section>
      </div>
    </article>
  )
}
