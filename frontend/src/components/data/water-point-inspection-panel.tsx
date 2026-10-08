import { Droplets, FileQuestion, LoaderCircle, MapPin, Play } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { useI18n } from '@/app/providers/locale-provider'
import {
  formatCoordinatePair,
  formatDate,
  formatPercent,
} from '@/components/data/format'
import { ObservedStatusChip } from '@/components/data/observed-status'
import { SemanticChip } from '@/components/status/semantic-chip'
import { Button } from '@/components/ui/button'
import { usePointPriorityItem, usePrioritySummaryQuery } from '@/hooks/priority'
import {
  useComputeWaterPointMutation,
  useConsequenceQuery,
  useImpactQuery,
  usePredictionQuery,
  useWaterPointQuery,
} from '@/hooks/water-points'
import { isStored } from '@/lib/api-result'
import {
  buildDecisionExplanation,
  type DecisionExplanation,
  type Fact,
  type Pathway,
  type PriorityContext,
} from '@/lib/decision-explanation'
import { riskBandTone, type RiskTone } from '@/lib/priority-presentation'
import { riskBandLabel } from '@/lib/status-labels'
import { cn } from '@/lib/utils'
import type { MapPointOut, PredictionResponse, PriorityItemOut } from '@/types/api'

/* ------------------------------------------------------------------ *
 * Building blocks
 * ------------------------------------------------------------------ */

/**
 * Three kinds of information, each marked by label and by border shape (not
 * colour alone): `observed` is recorded survey data, `model` is a stored model
 * estimate, `decision` is a decision-support output derived from those.
 */
type Kind = 'observed' | 'model' | 'decision' | 'context'

const KIND_BADGE_KEY = {
  observed: 'detail.observed.badge',
  model: 'detail.model.badge',
  decision: 'explain.decision.badge',
  context: 'detail.context.badge',
} as const

const KIND_BADGE_CLASS: Record<Kind, string> = {
  observed: 'border border-border-strong bg-muted text-foreground',
  model: 'border border-dashed border-border-strong text-muted-foreground',
  decision: 'border border-primary/50 bg-primary/5 text-foreground',
  context: 'border border-border-strong bg-muted text-muted-foreground',
}

const KIND_RULE_CLASS: Record<Kind, string> = {
  observed: 'border-border-strong',
  model: 'border-dashed border-border-strong',
  decision: 'border-primary',
  context: 'border-border-strong',
}

function Section({
  title,
  note,
  kind,
  children,
}: {
  title: string
  note?: string
  kind?: Kind
  children: ReactNode
}) {
  const { t } = useI18n()
  return (
    <section aria-label={title} className="px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h3 className="text-mg-body-sm font-semibold text-foreground">{title}</h3>
          {note === undefined ? null : (
            <p className="mt-0.5 text-mg-caption text-muted-foreground">{note}</p>
          )}
        </div>
        {kind === undefined ? null : (
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-sm px-2 py-0.5 text-mg-caption font-medium',
              KIND_BADGE_CLASS[kind],
            )}
          >
            {t(KIND_BADGE_KEY[kind])}
          </span>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-mg-caption text-muted-foreground">{label}</dt>
      <dd className="mg-figure mt-0.5 break-words text-mg-body-sm text-foreground">{children}</dd>
    </div>
  )
}

function FactList({ facts }: { facts: Fact[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {facts.map((fact) => (
        <Field key={fact.label} label={fact.label}>
          {fact.value}
        </Field>
      ))}
    </dl>
  )
}

function NotStored({ body }: { body: string }) {
  const { t } = useI18n()
  return (
    <p className="flex items-start gap-2 text-mg-caption text-muted-foreground">
      <FileQuestion aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>
        {t('detail.notComputed')} — {body}
      </span>
    </p>
  )
}

function Pending() {
  const { t } = useI18n()
  return (
    <div role="status" aria-live="polite" className="space-y-2">
      <span className="sr-only">{t('state.loadingSection')}</span>
      <div aria-hidden="true" className="h-5 w-1/2 animate-pulse rounded-control bg-muted" />
      <div aria-hidden="true" className="h-4 w-3/4 animate-pulse rounded-control bg-muted" />
    </div>
  )
}

function Failed() {
  const { t } = useI18n()
  return <p className="text-mg-caption text-destructive">{t('data.error.title')}</p>
}

const RISK_BAR_CLASS: Record<RiskTone, string> = {
  low: 'bg-risk-low',
  moderate: 'bg-risk-moderate',
  high: 'bg-risk-high',
}

/** The stored probability as a thin bar. Decorative: the value is also written out. */
function ProbabilityBar({ value, tone }: { value: number; tone: RiskTone | null }) {
  return (
    <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn('h-full rounded-full', tone === null ? 'bg-muted-foreground' : RISK_BAR_CLASS[tone])}
        style={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%` }}
      />
    </div>
  )
}

function AssessedAt({ value }: { value: string }) {
  const { t } = useI18n()
  return (
    <p className="text-mg-caption text-muted-foreground">
      {t('detail.assessedAt', { dateTime: formatDate(value.slice(0, 10)) })}
    </p>
  )
}

function Lines({ lines, limits }: { lines: string[]; limits: string }) {
  return (
    <div className="space-y-2">
      {lines.length === 0 ? null : (
        <ul className="space-y-1 text-mg-body-sm text-foreground">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <p className="text-mg-caption text-muted-foreground">{limits}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * 1. Decision at a glance
 * ------------------------------------------------------------------ */

function Glance({
  explanation,
  prediction,
  observedStatus,
}: {
  explanation: DecisionExplanation
  prediction: PredictionResponse | null
  observedStatus: string | null
}) {
  const { t } = useI18n()
  const { glance } = explanation
  const tone = prediction === null ? null : riskBandTone(prediction.risk_band)

  return (
    <Section title={glance.headline} kind="decision">
      <div className="space-y-3">
        <p className="text-mg-body-sm text-foreground">{glance.summary}</p>

        {glance.scoreText === null ? null : (
          <div className="rounded-control border border-border p-3">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="mg-figure text-mg-title-md font-semibold text-foreground">
                {glance.scoreText}
              </span>
              <span className="text-mg-caption font-medium text-foreground">
                {t('data.result.priorityScore')}
              </span>
            </p>
            {glance.scoreNote === null ? null : (
              <p className="mt-1 text-mg-caption text-muted-foreground">{glance.scoreNote}</p>
            )}
          </div>
        )}

        <dl className="space-y-2.5">
          <div className={cn('border-s-2 ps-3', KIND_RULE_CLASS.observed)}>
            <dt className="text-mg-caption font-semibold uppercase tracking-wider text-muted-foreground">
              {t('explain.group.observed')}
            </dt>
            <dd className="mt-1">
              <ObservedStatusChip value={observedStatus} />
            </dd>
          </div>
          <div className={cn('border-s-2 ps-3', KIND_RULE_CLASS.model)}>
            <dt className="text-mg-caption font-semibold uppercase tracking-wider text-muted-foreground">
              {t('explain.group.model')}
            </dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2 text-mg-body-sm text-foreground">
              {prediction === null || prediction.risk_band === null ? (
                t('explain.glance.notAssessed')
              ) : (
                <>
                  {tone === null ? null : <SemanticChip kind="risk" tone={tone} />}
                  <span>{riskBandLabel(prediction.risk_band, t)}</span>
                  {prediction.probability_non_functional === null ? null : (
                    <span className="mg-figure text-muted-foreground">
                      · {formatPercent(prediction.probability_non_functional)}
                    </span>
                  )}
                </>
              )}
            </dd>
          </div>
          <div className={cn('border-s-2 ps-3', KIND_RULE_CLASS.decision)}>
            <dt className="text-mg-caption font-semibold uppercase tracking-wider text-muted-foreground">
              {t('explain.group.decision')}
            </dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2 text-mg-body-sm text-foreground">
              {glance.pathway === null ? (
                t(
                  glance.priorityStatus === 'not-eligible'
                    ? 'explain.decision.notEligible'
                    : 'explain.glance.notShown',
                )
              ) : (
                <>
                  <span className="font-medium">
                    {t(glance.pathway === 'preventive' ? 'detail.priority.preventive' : 'detail.priority.restoration')}
                  </span>
                  <span className="mg-figure rounded-sm border border-primary/50 bg-primary/5 px-1.5 py-0.5 text-mg-caption font-semibold">
                    {t('data.result.priorityRank')} #{glance.rank ?? '—'}
                  </span>
                </>
              )}
            </dd>
          </div>
        </dl>

        {glance.observationNote === null ? null : (
          <p className="text-mg-caption text-muted-foreground">
            {glance.observationNote}
            {glance.observationCaution === null ? null : ` ${glance.observationCaution}`}
          </p>
        )}
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ *
 * 2. Why - model-estimated risk and relative impact
 * ------------------------------------------------------------------ */

function RiskWhy({
  query,
  explanation,
}: {
  query: ReturnType<typeof usePredictionQuery>
  explanation: DecisionExplanation
}) {
  const { t } = useI18n()
  return (
    <Section title={t('explain.section.risk')} kind="model">
      {query.isPending ? (
        <Pending />
      ) : query.isError ? (
        <Failed />
      ) : !isStored(query.data) ? (
        <NotStored body={t('data.prediction.notStored.title')} />
      ) : (
        <div className="space-y-2.5">
          {query.data.data.probability_non_functional === null ? null : (
            <div className="space-y-1.5">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="mg-figure text-mg-title-md font-semibold text-foreground">
                  {formatPercent(query.data.data.probability_non_functional)}
                </span>
                <span className="text-mg-caption text-muted-foreground">
                  {t('detail.risk.estimatedProbability')}
                </span>
              </p>
              <ProbabilityBar
                value={query.data.data.probability_non_functional}
                tone={riskBandTone(query.data.data.risk_band)}
              />
            </div>
          )}
          <Lines lines={explanation.risk.lines} limits={explanation.risk.limits} />
          <AssessedAt value={query.data.data.computed_at} />
        </div>
      )}
    </Section>
  )
}

function ImpactWhy({
  query,
  impactHigh,
  explanation,
}: {
  query: ReturnType<typeof useImpactQuery>
  impactHigh?: boolean | null
  explanation: DecisionExplanation
}) {
  const { t } = useI18n()
  return (
    <Section title={t('explain.section.impact')} kind="model">
      {query.isPending ? (
        <Pending />
      ) : query.isError ? (
        <Failed />
      ) : !isStored(query.data) ? (
        <NotStored body={t('data.impact.notStored.title')} />
      ) : !query.data.data.impact_available ? (
        <NotStored body={query.data.data.impact_unavailable_reason ?? t('data.impact.notStored.title')} />
      ) : (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mg-figure text-mg-title-md font-semibold text-foreground">
              {formatPercent(query.data.data.impact_score)}
            </span>
            <span className="text-mg-caption text-muted-foreground">{t('data.result.impactScore')}</span>
            {impactHigh === true ? <SemanticChip kind="impact" tone="high" /> : null}
          </div>
          <Lines lines={explanation.impact.lines} limits={explanation.impact.limits} />
          <AssessedAt value={query.data.data.computed_at} />
        </div>
      )}
    </Section>
  )
}

/* ------------------------------------------------------------------ *
 * 3. What should be done
 * ------------------------------------------------------------------ */

function ActionSection({ action }: { action: DecisionExplanation['action'] }) {
  const { t } = useI18n()
  return (
    <Section title={t('explain.action.title')} kind="decision">
      {action.kind === 'ready' ? (
        <div className="border-s-4 border-primary bg-primary/5 px-3 py-2.5">
          <p className="text-mg-body font-semibold text-foreground">{action.label}</p>
          <p className="mt-1 text-mg-body-sm text-muted-foreground">{action.note}</p>
        </div>
      ) : (
        <p className="text-mg-body-sm text-muted-foreground">{action.text}</p>
      )}
    </Section>
  )
}

/* ------------------------------------------------------------------ *
 * 4. Evidence - grouped by kind, 5. Technical details - secondary
 * ------------------------------------------------------------------ */

function EvidenceGroup({ kind, title, facts }: { kind: Kind; title: string; facts: Fact[] }) {
  if (facts.length === 0) {
    return null
  }
  return (
    <div className={cn('border-s-2 ps-3', KIND_RULE_CLASS[kind])}>
      <h4 className="mb-2 text-mg-caption font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <FactList facts={facts} />
    </div>
  )
}

function EvidenceSection({ evidence }: { evidence: DecisionExplanation['evidence'] }) {
  const { t } = useI18n()
  return (
    <Section title={t('explain.section.evidence')}>
      <div className="space-y-4">
        <EvidenceGroup kind="observed" title={t('explain.group.observed')} facts={evidence.observed} />
        <EvidenceGroup kind="model" title={t('explain.group.model')} facts={evidence.model} />
        <EvidenceGroup kind="model" title={t('explain.group.impact')} facts={evidence.impact} />
        <EvidenceGroup kind="decision" title={t('explain.group.decision')} facts={evidence.decision} />
        <EvidenceGroup kind="context" title={t('explain.group.context')} facts={evidence.context} />
        <EvidenceGroup kind="context" title={t('explain.group.community')} facts={evidence.community} />
        <EvidenceGroup kind="context" title={t('explain.group.climate')} facts={evidence.climate} />
        <EvidenceGroup kind="context" title={t('explain.group.services')} facts={evidence.services} />
      </div>
    </Section>
  )
}


/* ------------------------------------------------------------------ *
 * The panel
 * ------------------------------------------------------------------ */

type WaterPointInspectionPanelProps = {
  id: number | null
  /** The selected point's already-fetched map record, when the caller has one
   * (the Decision Map). Its stored rank and score are used, and the ranked
   * Priority item is looked up through the existing Priority endpoints so the
   * explanation is the same one the Priority list produces. */
  mapPoint?: MapPointOut | null
  /** The ranked Priority item the point was opened from, when there is one. */
  priorityItem?: PriorityItemOut | null
  className?: string
}

function locationLine(parts: (string | null)[]): string {
  return parts.filter((part): part is string => part !== null && part.length > 0).join(' · ')
}

/**
 * The per-water-point inspection, ordered for a non-technical official:
 * decision at a glance, why (model-estimated risk and impact), what should be
 * done, the evidence grouped by observed / model / decision, and finally the
 * raw technical fields in a collapsed disclosure. Every sentence comes from
 * `buildDecisionExplanation`, shared by the Decision Map and the Priority list.
 */
export function WaterPointInspectionPanel({
  id,
  mapPoint = null,
  priorityItem = null,
  className,
}: WaterPointInspectionPanelProps) {
  const { t } = useI18n()
  const compute = useComputeWaterPointMutation()
  const query = useWaterPointQuery(id)
  const predictionQuery = usePredictionQuery(id)
  const impactQuery = useImpactQuery(id)
  const consequenceQuery = useConsequenceQuery(id)
  const summaryQuery = usePrioritySummaryQuery()
  // Fixed for the life of the panel, so the observation age is stable between renders.
  const [now] = useState(() => new Date())

  // The Decision Map only has the map record; fetch the same ranked item the
  // Priority list uses so the reasons and action are identical in both flows.
  const mapPathway: Pathway | null =
    mapPoint?.preventive_priority_eligible === true
      ? 'preventive'
      : mapPoint?.restoration_priority_eligible === true
        ? 'restoration'
        : null
  const lookup = usePointPriorityItem({
    waterPointId: id,
    pathway: mapPathway,
    region: mapPoint?.nbs_region ?? null,
    district: mapPoint?.nbs_district ?? null,
    ward: mapPoint?.nbs_ward ?? null,
    enabled: priorityItem === null && mapPathway !== null,
  })

  if (id === null) {
    return (
      <div
        className={cn(
          'rounded-panel border border-dashed border-border-strong bg-muted/40 px-4 py-3',
          className,
        )}
      >
        <p className="flex items-center gap-2 text-mg-body-sm text-muted-foreground">
          <MapPin aria-hidden="true" className="size-4 shrink-0" />
          {t('detail.selectHint')}
        </p>
      </div>
    )
  }

  if (query.isPending) {
    return (
      <div className={cn('rounded-panel border border-border bg-card px-4 py-4', className)}>
        <Pending />
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className={cn('rounded-panel border border-border bg-card px-4 py-4', className)}>
        <Failed />
      </div>
    )
  }

  const point = query.data
  const prediction =
    predictionQuery.isSuccess && isStored(predictionQuery.data) ? predictionQuery.data.data : null
  const impact =
    impactQuery.isSuccess && isStored(impactQuery.data) ? impactQuery.data.data : null
  const consequence =
    consequenceQuery.isSuccess && isStored(consequenceQuery.data) ? consequenceQuery.data.data : null
  const impactHigh = mapPoint?.impact_high ?? priorityItem?.impact_high

  let priority: PriorityContext
  if (priorityItem !== null) {
    const pathway: Pathway = priorityItem.priority_type === 'restoration' ? 'restoration' : 'preventive'
    priority = {
      status: 'eligible',
      pathway,
      rank: priorityItem.rank,
      score: priorityItem.priority_score,
      item: priorityItem,
      lookup: 'ready',
      version: priorityItem.priority_methodology_version,
    }
  } else if (mapPoint !== null && mapPathway !== null) {
    const preventive = mapPathway === 'preventive'
    priority = {
      status: 'eligible',
      pathway: mapPathway,
      rank: preventive ? mapPoint.preventive_priority_rank : mapPoint.restoration_priority_rank,
      score: preventive ? mapPoint.preventive_priority_score : mapPoint.restoration_priority_score,
      item: lookup.item,
      lookup: lookup.item !== null ? 'ready' : lookup.isPending ? 'pending' : 'unavailable',
      version: lookup.item?.priority_methodology_version ?? mapPoint.priority_methodology_version,
    }
  } else if (mapPoint !== null) {
    priority = { status: 'not-eligible' }
  } else {
    priority = { status: 'unknown' }
  }

  const summary = summaryQuery.data
  const explanation = buildDecisionExplanation(
    {
      point,
      prediction,
      predictionSettled: predictionQuery.isSuccess,
      impact,
      impactSettled: impactQuery.isSuccess,
      consequence,
      impactHigh,
      priority,
      impactThreshold:
        summary === undefined
          ? null
          : { value: summary.impact_high_threshold, version: summary.impact_high_threshold_version },
      now,
    },
    t,
  )
  const location = locationLine([point.nbs_region, point.nbs_district, point.nbs_ward])

  return (
    <article
      aria-label={t('detail.inspection.title')}
      className={cn('overflow-hidden rounded-panel border border-border bg-card', className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border bg-surface-subtle px-4 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Droplets aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-mg-caption text-muted-foreground">{t('detail.inspection.title')}</p>
            <p className="mg-figure text-mg-title-sm font-semibold text-foreground">{point.master_id}</p>
            {location.length > 0 ? (
              <p className="text-mg-caption text-muted-foreground">{location}</p>
            ) : null}
            <p className="text-mg-caption text-muted-foreground">
              {t('data.column.surveyDate')}: {formatDate(point.survey_date)}
            </p>
            {point.latitude === null || point.longitude === null ? null : (
              <p className="mg-figure text-mg-caption text-muted-foreground">
                {formatCoordinatePair(point.latitude, point.longitude)}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ObservedStatusChip value={point.observed_status} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={compute.isPending}
            onClick={() => {
              compute.mutate(id)
            }}
          >
            {compute.isPending ? (
              <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
            ) : (
              <Play aria-hidden="true" className="size-3.5" />
            )}
            {t('detail.assessAction')}
          </Button>
        </div>
      </header>
      {compute.isError ? (
        <p
          role="alert"
          className="border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-mg-caption text-destructive"
        >
          {t('detail.assessError')}
        </p>
      ) : null}

      <div className="divide-y divide-border">
        <Glance explanation={explanation} prediction={prediction} observedStatus={point.observed_status} />
        <RiskWhy query={predictionQuery} explanation={explanation} />
        <ImpactWhy query={impactQuery} impactHigh={impactHigh} explanation={explanation} />
        <EvidenceSection evidence={explanation.evidence} />
        <ActionSection action={explanation.action} />
        {/* Technical fields stay out of the main reading path. */}
      </div>
    </article>
  )
}
