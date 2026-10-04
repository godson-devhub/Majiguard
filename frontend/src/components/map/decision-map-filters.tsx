import { useId } from 'react'

import { useI18n } from '@/app/providers/locale-provider'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  type ConditionFilter,
  type DecisionMapFilterState,
  type ImpactFilter,
  type RiskFilter,
} from '@/lib/decision-map-filters'
import { cn } from '@/lib/utils'

type DecisionMapFiltersProps = {
  value: DecisionMapFilterState
  onChange: (next: DecisionMapFilterState) => void
  className?: string
}

/**
 * The four Decision Map filters (Condition / Risk / Impact / Priority view).
 *
 * Risk only means something for currently-functional points (predicting
 * future failure) and Impact only for currently-observed non-functional
 * points (the restoration pathway's gate), so each is disabled - and reset to
 * "all" - whenever the Condition filter rules it out, rather than left
 * active with no meaningful points to show.
 */
export function DecisionMapFilters({ value, onChange, className }: DecisionMapFiltersProps) {
  const { t } = useI18n()
  const conditionId = useId()
  const riskId = useId()
  const impactId = useId()
  const priorityId = useId()

  const riskDisabled = value.condition === 'nonfunctional'
  const impactDisabled = value.condition === 'functional'

  function setCondition(condition: ConditionFilter) {
    onChange({
      ...value,
      condition,
      risk: condition === 'nonfunctional' ? 'all' : value.risk,
      impact: condition === 'functional' ? 'all' : value.impact,
    })
  }

  return (
    <div className={cn('flex flex-wrap items-end gap-x-4 gap-y-3', className)}>
      <div className="flex flex-col gap-1">
        <Label htmlFor={conditionId} className="text-mg-caption font-medium text-muted-foreground">
          {t('map.filter.condition')}
        </Label>
        <select
          id={conditionId}
          value={value.condition}
          onChange={(event) => {
            setCondition(event.target.value as ConditionFilter)
          }}
          className="h-9 min-w-[9rem] rounded-sm border border-input bg-background px-2.5 text-mg-body-sm text-foreground"
        >
          <option value="all">{t('map.filter.condition.all')}</option>
          <option value="functional">{t('map.filter.condition.functional')}</option>
          <option value="nonfunctional">{t('map.filter.condition.nonfunctional')}</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor={riskId}
          className={cn('text-mg-caption font-medium text-muted-foreground', riskDisabled && 'opacity-50')}
        >
          {t('map.filter.risk')}
        </Label>
        <select
          id={riskId}
          value={value.risk}
          disabled={riskDisabled}
          onChange={(event) => {
            onChange({ ...value, risk: event.target.value as RiskFilter })
          }}
          className="h-9 min-w-[9rem] rounded-sm border border-input bg-background px-2.5 text-mg-body-sm text-foreground disabled:opacity-50"
        >
          <option value="all">{t('map.filter.risk.all')}</option>
          <option value="high">{t('map.filter.risk.high')}</option>
          <option value="moderate">{t('map.filter.risk.medium')}</option>
          <option value="low">{t('map.filter.risk.low')}</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor={impactId}
          className={cn('text-mg-caption font-medium text-muted-foreground', impactDisabled && 'opacity-50')}
        >
          {t('map.filter.impact')}
        </Label>
        <select
          id={impactId}
          value={value.impact}
          disabled={impactDisabled}
          onChange={(event) => {
            onChange({ ...value, impact: event.target.value as ImpactFilter })
          }}
          className="h-9 min-w-[9rem] rounded-sm border border-input bg-background px-2.5 text-mg-body-sm text-foreground disabled:opacity-50"
        >
          <option value="all">{t('map.filter.impact.all')}</option>
          <option value="high">{t('map.filter.impact.high')}</option>
          <option value="moderate">{t('map.filter.impact.medium')}</option>
          <option value="low">{t('map.filter.impact.low')}</option>
        </select>
      </div>

      <label className="flex items-center gap-2.5 pb-1.5 text-mg-body-sm text-foreground" htmlFor={priorityId}>
        <Switch
          id={priorityId}
          checked={value.priorityView}
          onCheckedChange={(checked) => {
            onChange({ ...value, priorityView: checked })
          }}
          aria-describedby="decision-map-priority-hint"
        />
        {t('map.filter.priorityView')}
      </label>
      <p id="decision-map-priority-hint" className="sr-only">
        {t('map.filter.priorityViewHint')}
      </p>
    </div>
  )
}
