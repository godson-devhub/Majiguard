import {
  Activity,
  ChevronDown,
  Droplets,
  Flag,
  LoaderCircle,
  MapPin,
  Play,
  ShieldAlert,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { useI18n } from '@/app/providers/locale-provider'
import {
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
import { riskBandTone, whyReasonLabelKey, type RiskTone } from '@/lib/priority-presentation'
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
function ProbabilityBar({
  value,
  tone,
  className,
}: {
  value: number
  tone: RiskTone | null
  className?: string
}) {
  return (
    <div aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-white/60 dark:bg-white/15">
      <div
        className={cn('h-full rounded-full', className ?? (tone === null ? 'bg-muted-foreground' : RISK_BAR_CLASS[tone]))}
        style={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%` }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Compact, colour-led summary: four tiles, one action, a few reasons.
 * Every value is the stored one; the long explanations live under "More".
 * ------------------------------------------------------------------ */

const RISK_TILE: Record<RiskTone, string> = {
  low: 'border-risk-low/40 bg-risk-low-soft text-risk-low-fg',
  moderate: 'border-risk-moderate/40 bg-risk-moderate-soft text-risk-moderate-fg',
  high: 'border-risk-high/40 bg-risk-high-soft text-risk-high-fg',
}

function Tile({
  icon: Icon,
  label,
  className,
  children,
}: {
  icon: LucideIcon
  label: string
  className: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5 rounded-2xl border p-3 shadow-mg-1', className)}>
      <p className="flex items-center gap-1.5 text-mg-caption font-semibold opacity-85">
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
        {label}
      </p>
      {children}
    </div>
  )
}

function Summary({
  explanation,
  prediction,
  impactQuery,
  impactHigh,
  observedStatus,
  reasons,
}: {
  explanation: DecisionExplanation
  prediction: PredictionResponse | null
  impactQuery: ReturnType<typeof useImpactQuery>
  impactHigh?: boolean | null
  observedStatus: string | null
  reasons: readonly string[]
}) {
  const { t } = useI18n()
  const { glance, action } = explanation
  const riskTone = prediction === null ? null : riskBandTone(prediction.risk_band)
  const probability = prediction?.probability_non_functional ?? null
  const impact =
    impactQuery.isSuccess && isStored(impactQuery.data) && impactQuery.data.data.impact_available
      ? impactQuery.data.data
      : null
  const preventive = glance.pathway === 'preventive'
  const nonFunctional = observedStatus !== null && observedStatus.toLowerCase().includes('non')

  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-2 gap-3">
        <Tile
          icon={Activity}
          label={t('detail.tile.condition')}
          className={
            nonFunctional
              ? 'border-status-nonfunctional/40 bg-status-nonfunctional-soft text-status-nonfunctional-fg'
              : 'border-status-functional/40 bg-status-functional-soft text-status-functional-fg'
          }
        >
          <ObservedStatusChip value={observedStatus} />
        </Tile>

        <Tile
          icon={ShieldAlert}
          label={t('detail.tile.risk')}
          className={riskTone === null ? 'border-border bg-muted/50 text-muted-foreground' : RISK_TILE[riskTone]}
        >
          {probability === null ? (
            <p className="text-mg-body-sm font-semibold">{t('explain.glance.notAssessed')}</p>
          ) : (
            <>
              <p className="mg-figure font-serif text-2xl leading-none font-semibold">{formatPercent(probability)}</p>
              <ProbabilityBar value={probability} tone={riskTone} />
            </>
          )}
        </Tile>

        <Tile
          icon={Users}
          label={t('detail.tile.impact')}
          className="border-impact-high/30 bg-impact-low-soft text-impact-low-fg"
        >
          {impact === null ? (
            <p className="text-mg-body-sm font-semibold">{t('explain.glance.notAssessed')}</p>
          ) : (
            <>
              <p className="flex items-center gap-2">
                <span className="mg-figure font-serif text-2xl leading-none font-semibold">
                  {formatPercent(impact.impact_score)}
                </span>
                {impactHigh === true ? <SemanticChip kind="impact" tone="high" /> : null}
              </p>
              <ProbabilityBar value={impact.impact_score ?? 0} tone={null} className="bg-impact-high" />
            </>
          )}
        </Tile>

        <Tile
          icon={Flag}
          label={t('detail.tile.priority')}
          className={
            glance.pathway === null
              ? 'border-border bg-muted/50 text-muted-foreground'
              : preventive
                ? 'border-risk-moderate/40 bg-risk-moderate-soft text-risk-moderate-fg'
                : 'border-status-nonfunctional/40 bg-status-nonfunctional-soft text-status-nonfunctional-fg'
          }
        >
          {glance.pathway === null ? (
            <p className="text-mg-body-sm font-semibold">
              {t(glance.priorityStatus === 'not-eligible' ? 'explain.decision.notEligible' : 'explain.glance.notShown')}
            </p>
          ) : (
            <>
              <p className="mg-figure font-serif text-2xl leading-none font-semibold">
                #{glance.rank ?? '—'}
                {glance.scoreText === null ? null : (
                  <span className="ms-2 font-sans text-mg-body-sm font-semibold">{glance.scoreText}</span>
                )}
              </p>
              <p className="text-mg-caption font-semibold">
                {t(preventive ? 'detail.priority.preventive' : 'detail.priority.restoration')}
              </p>
            </>
          )}
        </Tile>
      </div>

      {action.kind === 'ready' ? (
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-water-800 to-water-500 px-4 py-3 text-white shadow-mg-2">
          <Wrench aria-hidden="true" className="size-5 shrink-0" />
          <div className="min-w-0">
            <p className="text-mg-caption font-semibold text-white/80">{t('explain.action.title')}</p>
            <p className="text-mg-body font-semibold">{action.label}</p>
          </div>
        </div>
      ) : null}

      {reasons.length === 0 ? null : (
        <ul className="flex flex-wrap gap-1.5" aria-label={t('priority.column.why')}>
          {reasons.slice(0, 3).map((reason) => {
            const key = whyReasonLabelKey(reason)
            return (
              <li
                key={reason}
                className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-mg-caption font-medium text-primary"
              >
                {key === null ? reason : t(key)}
              </li>
            )
          })}
        </ul>
      )}
    </div>
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
      <div className={cn('mg-glass mg-glass-static px-4 py-4', className)}>
        <Pending />
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className={cn('mg-glass mg-glass-static px-4 py-4', className)}>
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
      className={cn('mg-glass mg-glass-static overflow-hidden', className)}
    >
      <header className="mg-banner flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Droplets aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="mg-figure font-serif text-xl leading-tight font-semibold">{point.master_id}</p>
            {location.length > 0 ? (
              <p className="flex items-center gap-1 text-mg-caption text-white/85">
                <MapPin aria-hidden="true" className="size-3 shrink-0" />
                <span className="truncate">{location}</span>
              </p>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
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
      </header>
      {compute.isError ? (
        <p
          role="alert"
          className="border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-mg-caption text-destructive"
        >
          {t('detail.assessError')}
        </p>
      ) : null}

      <Summary
        explanation={explanation}
        prediction={prediction}
        impactQuery={impactQuery}
        impactHigh={impactHigh}
        observedStatus={point.observed_status}
        reasons={(priorityItem ?? lookup.item)?.why_prioritized ?? []}
      />

      <details className="group border-t border-border/60">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-mg-body-sm font-semibold text-primary">
          {t('detail.more')}
          <ChevronDown
            aria-hidden="true"
            className="size-4 transition-transform duration-300 group-open:rotate-180"
          />
        </summary>
        <div className="divide-y divide-border/60 border-t border-border/60">
          <EvidenceSection evidence={explanation.evidence} />
        </div>
      </details>
    </article>
  )
}
