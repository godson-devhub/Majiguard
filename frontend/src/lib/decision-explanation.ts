import type { Translate } from '@/app/providers/locale-provider'
import { formatDate, formatNumber, formatPercent, formatScorePercent } from '@/components/data/format'
import { recommendedActionLabelKey, whyReasonLabelKey } from '@/lib/priority-presentation'
import { observedStatusLabel, riskBandLabel } from '@/lib/status-labels'
function rounded(value: number | null, digits = 0): string {
  if (value === null) return '?'
  const factor = 10 ** digits
  return (Math.round(value * factor) / factor).toLocaleString('en-TZ', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function evidenceDistance(value: number | null): string {
  if (value === null) return '?'
  return value >= 1000 ? `${rounded(value / 1000, 2)} km` : `${rounded(value)} m`
}

import type {
  ConsequenceResponse,
  ImpactResponse,
  PredictionResponse,
  PriorityItemOut,
  WaterPointOut,
} from '@/types/api'

/**
 * The one place that turns already-stored results into the plain-language
 * explanation shown for a water point. The Decision Map and the Priority list
 * both render the inspection panel from this function's output, so the same
 * water point reads the same way from either entry point.
 *
 * It is pure: no fetching, no clock (the caller passes `now`), no state. It
 * never computes a score, rank, band, threshold or eligibility - every number
 * and classification below is read from a stored result. It never states a
 * cause the API does not expose (no per-point feature explanation exists), and
 * it keeps three kinds of statement apart: observed (recorded survey facts),
 * model-estimated (stored model output) and decision (stored priority output).
 */

export type Pathway = 'preventive' | 'restoration'

export type PriorityContext =
  | { status: 'unknown' }
  | { status: 'not-eligible' }
  | {
      status: 'eligible'
      pathway: Pathway
      rank: number | null
      score: number | null
      /** the backend's ranked item, which carries the reasons and the action */
      item: PriorityItemOut | null
      /** whether `item` is still being looked up, or could not be found */
      lookup: 'ready' | 'pending' | 'unavailable'
      version: string | null
    }

export type DecisionInput = {
  point: WaterPointOut
  /** null when no prediction is stored */
  prediction: PredictionResponse | null
  predictionSettled: boolean
  impact: ImpactResponse | null
  impactSettled: boolean
  consequence: ConsequenceResponse | null
  impactHigh: boolean | null | undefined
  priority: PriorityContext
  impactThreshold: { value: number; version: string } | null
  now: Date
}

export type Fact = { label: string; value: string }

export type DecisionExplanation = {
  glance: {
    priorityStatus: PriorityContext['status']
    pathway: Pathway | null
    rank: number | null
    scoreText: string | null
    scoreNote: string | null
    headline: string
    summary: string
    observationNote: string | null
    observationCaution: string | null
  }
  risk: { lines: string[]; limits: string }
  impact: { lines: string[]; limits: string }
  action:
    | { kind: 'ready'; label: string; note: string }
    | { kind: 'message'; text: string }
  evidence: { observed: Fact[]; model: Fact[]; impact: Fact[]; decision: Fact[]; context: Fact[]; community: Fact[]; climate: Fact[]; services: Fact[] }
  technical: Fact[]
}

/** Whole months between a `YYYY-MM-DD` survey date and `now`, or null. */
export function observationMonths(surveyDate: string | null, now: Date): number | null {
  if (surveyDate === null) {
    return null
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(surveyDate)
  if (match === null) {
    return null
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const months =
    (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month) - (now.getDate() < day ? 1 : 0)
  return months < 0 ? null : months
}

/** "Observation recorded about 21 years ago." - the age of the survey record, never of the water point. */
function observationSentence(months: number | null, t: Translate): string | null {
  if (months === null) {
    return null
  }
  if (months < 1) {
    return t('explain.obs.recent')
  }
  if (months < 12) {
    return t('explain.obs.months', { count: months })
  }
  const years = Math.round(months / 12)
  return years === 1 ? t('explain.obs.oneYear') : t('explain.obs.years', { count: years })
}

const BASE_REASONS = new Set(['high risk of non-functionality', 'observed non-functional'])

export function buildDecisionExplanation(input: DecisionInput, t: Translate): DecisionExplanation {
  const { point, prediction, impact, consequence, priority, impactHigh } = input
  const observedText =
    point.observed_status === null || point.observed_status.length === 0
      ? t('explain.status.notRecorded')
      : observedStatusLabel(point.observed_status, t)
  const months = observationMonths(point.survey_date, input.now)

  /* ---- Decision at a glance ---- */
  const pathway = priority.status === 'eligible' ? priority.pathway : null
  const rank = priority.status === 'eligible' ? priority.rank : null
  const score = priority.status === 'eligible' ? priority.score : null

  let headline: string
  let summary: string
  if (priority.status === 'eligible') {
    headline = t(
      priority.pathway === 'preventive'
        ? 'explain.glance.preventive.headline'
        : 'explain.glance.restoration.headline',
      { rank: priority.rank ?? '—' },
    )
    summary = t(
      priority.pathway === 'preventive'
        ? 'explain.glance.preventive.summary'
        : 'explain.glance.restoration.summary',
      { status: observedText },
    )
  } else if (priority.status === 'not-eligible') {
    headline = t('explain.glance.none.headline')
    summary = t('explain.glance.none.summary', { status: observedText })
  } else {
    headline = t('explain.glance.unknown.headline')
    summary = t('explain.glance.unknown.summary', { status: observedText })
  }

  /* ---- Why: risk (model-estimated) ---- */
  const riskLines: string[] = []
  if (prediction !== null && prediction.probability_non_functional !== null) {
    riskLines.push(
      t('explain.risk.probability', { percent: formatPercent(prediction.probability_non_functional) }),
    )
    if (prediction.risk_band !== null) {
      riskLines.push(t('explain.risk.band', { band: riskBandLabel(prediction.risk_band, t) }))
    }
    if (prediction.predicted_status !== null) {
      riskLines.push(
        t('explain.risk.predicted', { status: observedStatusLabel(prediction.predicted_status, t) }),
      )
    }
  } else if (input.predictionSettled) {
    riskLines.push(t('explain.risk.none'))
  }

  /* ---- Why: impact (model-estimated) ---- */
  const impactLines: string[] = []
  if (impact !== null && impact.impact_available) {
    if (impactHigh === true) {
      impactLines.push(t('explain.impact.high'))
    } else if (impactHigh === false) {
      impactLines.push(t('explain.impact.notHigh'))
    }
    if (impact.population_component !== null && impact.alternative_scarcity_component !== null) {
      impactLines.push(
        t('explain.impact.scoreWithComponents', {
          score: formatPercent(impact.impact_score),
          population: formatNumber(impact.population_component),
          scarcity: formatNumber(impact.alternative_scarcity_component),
        }),
      )
    } else {
      impactLines.push(t('explain.impact.score', { score: formatPercent(impact.impact_score) }))
    }
  } else if (input.impactSettled) {
    impactLines.push(t('explain.impact.none'))
  }
  if (priority.status === 'eligible' && priority.item !== null) {
    const reasons = priority.item.why_prioritized
      .filter((reason) => !BASE_REASONS.has(reason))
      .map((reason) => {
        const key = whyReasonLabelKey(reason)
        return (key === null ? reason : t(key)).toLowerCase()
      })
    if (reasons.length > 0) {
      impactLines.push(
        t('explain.impact.aboveMedian', {
          pathway: t(
            priority.pathway === 'preventive' ? 'explain.pathway.preventive' : 'explain.pathway.restoration',
          ),
          reasons: reasons.join('; '),
        }),
      )
    }
  }

  /* ---- What should be done ---- */
  let action: DecisionExplanation['action']
  if (priority.status === 'eligible') {
    if (priority.item !== null) {
      const actionKey = recommendedActionLabelKey(priority.item.recommended_action)
      action = {
        kind: 'ready',
        label: actionKey === null ? priority.item.recommended_action : t(actionKey),
        note: t(
          priority.pathway === 'preventive' ? 'explain.action.preventiveNote' : 'explain.action.restorationNote',
        ),
      }
    } else {
      action = {
        kind: 'message',
        text: t(priority.lookup === 'pending' ? 'explain.action.pending' : 'explain.action.unavailable'),
      }
    }
  } else if (priority.status === 'not-eligible') {
    action = { kind: 'message', text: t('explain.action.none') }
  } else {
    action = { kind: 'message', text: t('detail.priority.notAvailableHere') }
  }

  /* ---- Evidence, grouped ---- */
  const location = [point.nbs_region, point.nbs_district, point.nbs_ward]
    .filter((part): part is string => part !== null && part.length > 0)
    .join(' · ')
  const observed: Fact[] = [
    { label: t('data.column.observedStatus'), value: observedText },
    { label: t('data.column.surveyDate'), value: formatDate(point.survey_date) },
    { label: t('detail.section.location'), value: location.length > 0 ? location : t('data.notRecorded') },
  ]
  const model: Fact[] = []
  if (prediction !== null) {
    model.push({ label: t('explain.group.probability'), value: formatPercent(prediction.probability_non_functional) })
    model.push({
      label: t('data.result.predictedStatus'),
      value: prediction.predicted_status === null ? t('data.notRecorded') : observedStatusLabel(prediction.predicted_status, t),
    })
    model.push({
      label: t('data.result.riskBand'),
      value: prediction.risk_band === null ? t('data.notRecorded') : riskBandLabel(prediction.risk_band, t),
    })
  }
  const impactFacts: Fact[] = []
  if (impact !== null && impact.impact_available) {
    impactFacts.push({ label: t('data.result.impactScore'), value: formatPercent(impact.impact_score) })
    if (impact.population_component !== null) {
      impactFacts.push({ label: t('data.result.populationComponent'), value: formatNumber(impact.population_component) })
    }
    if (impact.alternative_scarcity_component !== null) {
      impactFacts.push({
        label: t('data.result.alternativeScarcityComponent'),
        value: formatNumber(impact.alternative_scarcity_component),
      })
    }
  }
  const context: Fact[] = [
    { label: t('evidence.field.waterSource'), value: point.water_source ?? t('data.notRecorded') },
    { label: t('evidence.field.waterTechnology'), value: point.water_technology ?? t('data.notRecorded') },
    { label: t('evidence.field.technologyCategory'), value: point.water_tech_category ?? t('data.notRecorded') },
    { label: t('evidence.field.management'), value: point.management_type ?? t('data.notRecorded') },
    { label: t('evidence.field.payment'), value: point.payment_type ?? t('data.notRecorded') },
    { label: t('evidence.field.installYear'), value: rounded(point.install_year) },
    { label: t('evidence.field.ageAtSurvey'), value: point.age_at_survey_years === null ? t('data.notRecorded') : `${rounded(point.age_at_survey_years)} ${t('evidence.unit.years')}` },
    { label: t('evidence.field.waterQuality'), value: point.subjective_water_quality ?? t('data.notRecorded') },
  ]
  const community: Fact[] = [
    { label: t('evidence.field.population1km'), value: point.worldpop2022_pop_within_1000m === null ? t('data.notRecorded') : `${rounded(point.worldpop2022_pop_within_1000m)} ${t('evidence.unit.peopleEstimate')}` },
    { label: t('evidence.field.alternatives1km'), value: point.n_water_points_within_1000m === null ? t('data.notRecorded') : `${formatNumber(point.n_water_points_within_1000m)} ${t('evidence.unit.waterPoints')}` },
    { label: t('evidence.field.nearestAlternative'), value: point.dist_nearest_any_water_point_m === null ? t('data.notRecorded') : evidenceDistance(point.dist_nearest_any_water_point_m) },
  ]
  const climate: Fact[] = [
    { label: t('evidence.field.rain3m'), value: point.rain_3m_prior_mm === null ? t('data.notRecorded') : `${rounded(point.rain_3m_prior_mm)} ${t('evidence.unit.millimetres')}` },
    { label: t('evidence.field.rain3mNormal'), value: point.rain_3m_pct_of_normal === null ? t('data.notRecorded') : `${rounded(point.rain_3m_pct_of_normal, 1)}%` },
    { label: t('evidence.field.dryMonths'), value: point.dry_months_prior12_lt30mm === null ? t('data.notRecorded') : `${rounded(point.dry_months_prior12_lt30mm)} ${t('evidence.unit.months')}` },
  ]
  const services: Fact[] = [
    { label: t('evidence.field.healthDistance'), value: point.dist_nearest_health_facility_m === null ? t('data.notRecorded') : evidenceDistance(point.dist_nearest_health_facility_m) },
    { label: t('evidence.field.schoolDistance'), value: point.dist_nearest_school_m === null ? t('data.notRecorded') : evidenceDistance(point.dist_nearest_school_m) },
  ]
  const decision: Fact[] = []
  if (priority.status === 'eligible') {
    decision.push({
      label: t('explain.decision.eligibility'),
      value: t(priority.pathway === 'preventive' ? 'detail.priority.preventive' : 'detail.priority.restoration'),
    })
    decision.push({ label: t('data.result.priorityScore'), value: formatScorePercent(priority.score) })
    decision.push({ label: t('data.result.priorityRank'), value: formatNumber(priority.rank) })
    if (action.kind === 'ready') {
      decision.push({ label: t('explain.action.title'), value: action.label })
    }
  } else if (priority.status === 'not-eligible') {
    decision.push({ label: t('explain.decision.eligibility'), value: t('explain.decision.notEligible') })
  }

  /* ---- Technical details (secondary) ---- */
  const technical: Fact[] = []
  if (prediction !== null) {
    technical.push({ label: t('detail.field.probabilityRaw'), value: formatNumber(prediction.probability_non_functional) })
    technical.push({ label: t('data.result.probabilityFunctional'), value: formatNumber(prediction.probability_functional) })
    technical.push({ label: t('data.result.decisionThreshold'), value: formatNumber(prediction.decision_threshold) })
    technical.push({ label: t('data.result.methodology'), value: prediction.prediction_methodology_version })
  }
  if (impact !== null && impact.impact_available) {
    technical.push({ label: t('detail.field.impactMethodology'), value: impact.impact_methodology_version })
  }
  if (input.impactThreshold !== null) {
    technical.push({
      label: t('explain.tech.impactThreshold'),
      value: `${formatNumber(input.impactThreshold.value)} (${input.impactThreshold.version})`,
    })
  }
  if (consequence !== null) {
    if (consequence.risk_impact_index_available) {
      technical.push({ label: t('data.result.riskImpactIndex'), value: formatNumber(consequence.risk_impact_index) })
    }
    technical.push({
      label: t('detail.field.consequenceMethodology'),
      value: consequence.consequence_priority_methodology_version,
    })
  }
  if (priority.status === 'eligible') {
    technical.push({
      label: t('explain.tech.scoreFormula'),
      value: t(priority.pathway === 'preventive' ? 'explain.tech.formula.preventive' : 'explain.tech.formula.restoration'),
    })
    technical.push({
      label: t('explain.tech.eligibilityRule'),
      value: t(priority.pathway === 'preventive' ? 'explain.tech.rule.preventive' : 'explain.tech.rule.restoration'),
    })
    if (priority.version !== null) {
      technical.push({ label: t('detail.field.priorityMethodology'), value: priority.version })
    }
  }

  return {
    glance: {
      priorityStatus: priority.status,
      pathway,
      rank,
      scoreText: priority.status === 'eligible' ? formatScorePercent(score) : null,
      scoreNote:
        priority.status === 'eligible'
          ? t(priority.pathway === 'preventive' ? 'explain.score.preventiveNote' : 'explain.score.restorationNote')
          : null,
      headline,
      summary,
      observationNote: observationSentence(months, t),
      observationCaution: months !== null && months >= 12 ? t('explain.obs.caution') : null,
    },
    risk: { lines: riskLines, limits: t('explain.risk.limits') },
    impact: { lines: impactLines, limits: t('explain.impact.limits') },
    action,
    evidence: { observed, model, impact: impactFacts, decision, context, community, climate, services },
    technical,
  }
}
