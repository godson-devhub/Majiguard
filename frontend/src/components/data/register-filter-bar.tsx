import { FilterX } from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import {
  FilterChip,
  FilterChipRow,
  FilterSelect,
  type FilterOption,
} from '@/components/data/filter-controls'
import { Button } from '@/components/ui/button'
import {
  useAdministrativeDistrictsQuery,
  useAdministrativeRegionsQuery,
  useAdministrativeWardsQuery,
} from '@/hooks/water-points'
import {
  EMPTY_FILTERS,
  OBSERVED_STATUS_VALUES,
  REGION_VALUES,
  type RegisterFilters,
} from '@/lib/register-reference'
import { observedStatusLabel } from '@/lib/status-labels'

type RegisterFilterBarProps = {
  value: RegisterFilters
  onChange: (next: RegisterFilters) => void
  /** Hide the observed-status control on the overview, where it is summarised. */
  showStatus?: boolean
  /** One column of full-width controls with no chip row, for use inside a
   * popover whose owner already shows the active filters. */
  stacked?: boolean
  className?: string
}

const FIELD_WIDTH = 'w-full sm:w-44'
const STACKED_FIELD_WIDTH = 'w-full'

/**
 * The shared Scope filter: Region, then District, then Ward (each narrowing
 * the next), plus an optional observed-status lens. Active filters are shown
 * as removable chips so the current scope is always visible and reversible
 * without hunting through the controls.
 *
 * Filtering semantics are unchanged: a region change cascade-resets district
 * and ward, a district change resets ward, and the values passed to `onChange`
 * are exactly the same `RegisterFilters` the screens already consume.
 */
export function RegisterFilterBar({
  value,
  onChange,
  showStatus = true,
  stacked = false,
  className,
}: RegisterFilterBarProps) {
  const { t } = useI18n()
  const regions = useAdministrativeRegionsQuery()
  const districts = useAdministrativeDistrictsQuery(value.region)
  const wards = useAdministrativeWardsQuery(value.region, value.district ?? null)

  const filtersActive =
    value.region !== null || value.status !== null || value.district !== null || value.ward !== null

  const regionOptions: FilterOption[] = [
    { value: '', label: t('filters.allRegions') },
    ...(regions.data ?? REGION_VALUES).map((region) => {
      const name = typeof region === 'string' ? region : region.name
      return { value: name, label: name }
    }),
  ]
  const districtOptions: FilterOption[] = [
    { value: '', label: t('filters.allDistricts') },
    ...(districts.data ?? []).map((area) => ({ value: area.name, label: area.name })),
  ]
  const wardOptions: FilterOption[] = [
    { value: '', label: t('filters.allWards') },
    ...(wards.data ?? []).map((area) => ({ value: area.name, label: area.name })),
  ]
  const statusOptions: FilterOption[] = [
    { value: '', label: t('filters.allStatuses') },
    ...OBSERVED_STATUS_VALUES.map((status) => ({
      value: status,
      label: observedStatusLabel(status, t),
    })),
  ]

  const chips: { key: string; label: string; clear: () => void }[] = []
  if (value.region !== null) {
    chips.push({
      key: 'region',
      label: `${t('filters.region')}: ${value.region}`,
      clear: () => {
        onChange({ ...value, region: null, district: null, ward: null })
      },
    })
  }
  if (value.district) {
    chips.push({
      key: 'district',
      label: `${t('filters.district')}: ${value.district}`,
      clear: () => {
        onChange({ ...value, district: null, ward: null })
      },
    })
  }
  if (value.ward) {
    chips.push({
      key: 'ward',
      label: `${t('filters.ward')}: ${value.ward}`,
      clear: () => {
        onChange({ ...value, ward: null })
      },
    })
  }
  if (value.status !== null) {
    chips.push({
      key: 'status',
      label: `${t('filters.status')}: ${observedStatusLabel(value.status, t)}`,
      clear: () => {
        onChange({ ...value, status: null })
      },
    })
  }

  return (
    <div className={className}>
      <div
        className={
          stacked ? 'flex flex-col gap-3' : 'flex flex-wrap items-end gap-x-3 gap-y-3'
        }
      >
        <FilterSelect
          className={stacked ? STACKED_FIELD_WIDTH : FIELD_WIDTH}
          label={t('filters.region')}
          value={value.region ?? ''}
          options={regionOptions}
          onChange={(next) => {
            // A region change invalidates any district/ward from the previous
            // region - both must cascade-reset, not just ward.
            onChange({ ...value, region: next === '' ? null : next, district: null, ward: null })
          }}
        />
        <FilterSelect
          className={stacked ? STACKED_FIELD_WIDTH : FIELD_WIDTH}
          label={t('filters.district')}
          value={value.district ?? ''}
          options={districtOptions}
          disabled={!value.region || districts.isPending}
          onChange={(next) => {
            onChange({ ...value, district: next === '' ? null : next, ward: null })
          }}
        />
        <FilterSelect
          className={stacked ? STACKED_FIELD_WIDTH : FIELD_WIDTH}
          label={t('filters.ward')}
          value={value.ward ?? ''}
          options={wardOptions}
          disabled={!value.district || wards.isPending}
          onChange={(next) => {
            onChange({ ...value, ward: next === '' ? null : next })
          }}
        />
        {showStatus ? (
          <FilterSelect
            className={stacked ? STACKED_FIELD_WIDTH : 'w-full sm:w-56'}
            label={t('filters.status')}
            value={value.status ?? ''}
            options={statusOptions}
            onChange={(next) => {
              onChange({ ...value, status: next === '' ? null : next })
            }}
          />
        ) : null}

        <Button
          variant="outline"
          disabled={!filtersActive}
          onClick={() => {
            onChange(EMPTY_FILTERS)
          }}
        >
          <FilterX aria-hidden="true" className="size-4" />
          {t('filters.clear')}
        </Button>
      </div>

      {stacked ? null : chips.length > 0 ? (
        <div className="mt-3">
          <FilterChipRow label={t('filters.activeLabel')}>
            {chips.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                removeLabel={t('filters.remove', { label: chip.label })}
                onRemove={chip.clear}
              />
            ))}
          </FilterChipRow>
        </div>
      ) : (
        <p className="mt-2 text-mg-caption text-muted-foreground">{t('filters.noneActive')}</p>
      )}
    </div>
  )
}
