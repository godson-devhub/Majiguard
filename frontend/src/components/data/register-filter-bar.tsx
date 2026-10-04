import { useId } from 'react'
import { FilterX } from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAdministrativeDistrictsQuery, useAdministrativeRegionsQuery, useAdministrativeWardsQuery } from '@/hooks/water-points'
import {
  EMPTY_FILTERS,
  OBSERVED_STATUS_VALUES,
  REGION_VALUES,
  type RegisterFilters,
} from '@/lib/register-reference'

type RegisterFilterBarProps = {
  value: RegisterFilters
  onChange: (next: RegisterFilters) => void
  /** Hide the observed-status control on the overview, where it is summarised. */
  showStatus?: boolean
  className?: string
}

/**
 * The register's two supported filters, as native selects.
 *
 * Native selects are used deliberately: they are keyboard operable, screen
 * reader labelled and native on mobile without any custom widget behaviour to
 * get wrong. Each has a visible label, and the reset control appears only when a
 * filter is actually applied.
 */
export function RegisterFilterBar({
  value,
  onChange,
  showStatus = true,
  className,
}: RegisterFilterBarProps) {
  const { t } = useI18n()
  const regions = useAdministrativeRegionsQuery()
  const districts = useAdministrativeDistrictsQuery(value.region)
  const wards = useAdministrativeWardsQuery(value.region, value.district ?? null)
  const regionId = useId()
  const statusId = useId()
  const districtId = useId()
  const wardId = useId()
  const filtersActive = value.region !== null || value.status !== null || value.district !== null || value.ward !== null

  return (
    <div className={className}>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={regionId}
            className="text-mg-caption font-medium text-muted-foreground"
          >
            {t('filters.region')}
          </Label>
          <select
            id={regionId}
            value={value.region ?? ''}
            onChange={(event) => {
              // A region change invalidates any district/ward from the
              // previous region - both must cascade-reset, not just ward.
              onChange({
                ...value,
                region: event.target.value === '' ? null : event.target.value,
                district: null,
                ward: null,
              })
            }}
            className="h-9 min-w-[10rem] rounded-sm border border-input bg-background px-2.5 text-mg-body-sm text-foreground"
          >
            <option value="">{t('filters.allRegions')}</option>
            {(regions.data ?? REGION_VALUES).map((region) => { const name = typeof region === 'string' ? region : region.name; return (<option key={name} value={name}>{name}</option>) })}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor={districtId} className="text-mg-caption font-medium text-muted-foreground">District</Label>
          <select id={districtId} value={value.district ?? ''} disabled={!value.region || districts.isPending} onChange={(event) => onChange({ ...value, district: event.target.value === '' ? null : event.target.value, ward: null })} className="h-9 min-w-[10rem] rounded-sm border border-input bg-background px-2.5 text-mg-body-sm text-foreground"><option value="">{t('filters.allDistricts')}</option>{(districts.data ?? []).map((area) => <option key={area.code ?? area.name} value={area.name}>{area.name}</option>)}</select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={wardId} className="text-mg-caption font-medium text-muted-foreground">Ward</Label>
          <select id={wardId} value={value.ward ?? ''} disabled={!value.district || wards.isPending} onChange={(event) => onChange({ ...value, ward: event.target.value === '' ? null : event.target.value })} className="h-9 min-w-[10rem] rounded-sm border border-input bg-background px-2.5 text-mg-body-sm text-foreground"><option value="">{t('filters.allWards')}</option>{(wards.data ?? []).map((area) => <option key={area.code ?? area.name} value={area.name}>{area.name}</option>)}</select>
        </div>

        {showStatus ? (
          <div className="flex flex-col gap-1">
            <Label
              htmlFor={statusId}
              className="text-mg-caption font-medium text-muted-foreground"
            >
              {t('filters.status')}
            </Label>
            <select
              id={statusId}
              value={value.status ?? ''}
              onChange={(event) => {
                onChange({
                  ...value,
                  status: event.target.value === '' ? null : event.target.value,
                })
              }}
              className="h-9 min-w-[12rem] rounded-sm border border-input bg-background px-2.5 text-mg-body-sm text-foreground"
            >
              <option value="">{t('filters.allStatuses')}</option>
              {OBSERVED_STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <Button
          size="sm"
          variant="outline"
          disabled={!filtersActive}
          onClick={() => {
            onChange(EMPTY_FILTERS)
          }}
        >
          <FilterX aria-hidden="true" className="size-3.5" />
          {t('filters.clear')}
        </Button>
      </div>

      <p className="mt-2 text-mg-caption text-muted-foreground">
        {filtersActive
          ? t('filters.applied', {
              region: value.region ?? t('filters.allRegions'),
              status: value.status ?? t('filters.allStatuses'),
            })
          : t('filters.applied.none')}
      </p>
    </div>
  )
}


