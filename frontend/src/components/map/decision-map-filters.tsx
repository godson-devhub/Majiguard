import { useId } from 'react'

import { useI18n } from '@/app/providers/locale-provider'
import { FilterSelect } from '@/components/data/filter-controls'
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
 * The four Decision Map lens filters (Condition / Risk / Impact / High Risk +
 * High Impact).
 *
 * Risk only means something for currently-functional points (predicting
 * future failure) and Impact only for currently-observed non-functional
 * points (the restoration pathway's gate), so each is disabled - and reset to
 * "all" - whenever the Condition filter rules it out, rather than left
 * active with no meaningful points to show.
 */
export function DecisionMapFilters({ value, onChange, className }: DecisionMapFiltersProps) {
  const { t } = useI18n()
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
    <div className={cn('space-y-3', className)}>
      <FilterSelect
        label={t('map.filter.condition')}
        value={value.condition}
        onChange={(next) => {
          setCondition(next as ConditionFilter)
        }}
        options={[
          { value: 'all', label: t('map.filter.condition.all') },
          { value: 'functional', label: t('map.filter.condition.functional') },
          { value: 'nonfunctional', label: t('map.filter.condition.nonfunctional') },
        ]}
      />
      <FilterSelect
        label={t('map.filter.risk')}
        value={value.risk}
        disabled={riskDisabled}
        onChange={(next) => {
          onChange({ ...value, risk: next as RiskFilter })
        }}
        options={[
          { value: 'all', label: t('map.filter.risk.all') },
          { value: 'high', label: t('map.filter.risk.high') },
          { value: 'moderate', label: t('map.filter.risk.medium') },
          { value: 'low', label: t('map.filter.risk.low') },
        ]}
      />
      <FilterSelect
        label={t('map.filter.impact')}
        value={value.impact}
        disabled={impactDisabled}
        onChange={(next) => {
          onChange({ ...value, impact: next as ImpactFilter })
        }}
        options={[
          { value: 'all', label: t('map.filter.impact.all') },
          { value: 'high', label: t('map.filter.impact.high') },
          { value: 'moderate', label: t('map.filter.impact.medium') },
          { value: 'low', label: t('map.filter.impact.low') },
        ]}
      />

      <div className="flex items-center gap-2.5 pt-1">
        <Switch
          id={priorityId}
          checked={value.priorityView}
          onCheckedChange={(checked) => {
            onChange({ ...value, priorityView: checked })
          }}
          aria-describedby="decision-map-priority-hint"
        />
        <Label htmlFor={priorityId} className="text-mg-body-sm text-foreground">
          {t('map.filter.priorityView')}
        </Label>
      </div>
      <p id="decision-map-priority-hint" className="text-mg-caption text-muted-foreground">
        {t('map.filter.priorityViewHint')}
      </p>
    </div>
  )
}
