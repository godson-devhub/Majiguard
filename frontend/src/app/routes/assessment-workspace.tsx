import { useState } from 'react'

import { useI18n } from '@/app/providers/locale-provider'
import { SectionPage } from '@/app/shell/section-page'
import { MasterIdSearch } from '@/components/data/master-id-search'
import { WaterPointInspectionPanel } from '@/components/data/water-point-inspection-panel'

/**
 * The single-point assessment workspace shared by the risk and impact routes:
 * a search box, then the four-section inspection panel. All four result
 * sections render only stored results, so an unassessed water point reads as
 * "not assessed yet", not as a zero risk or a zero impact.
 */
export function AssessmentWorkspace({
  titleKey,
  bodyKey,
  eyebrowKey,
}: {
  titleKey: Parameters<typeof SectionPage>[0]['titleKey']
  bodyKey: Parameters<typeof SectionPage>[0]['descriptionKey']
  eyebrowKey: Parameters<typeof SectionPage>[0]['eyebrowKey']
}) {
  const { t } = useI18n()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  return (
    <SectionPage titleKey={titleKey} descriptionKey={bodyKey} eyebrowKey={eyebrowKey} sourceNote={t('data.source')}>
      <div className="space-y-6">
        <section aria-label={t('assessment.heading')} className="max-w-xl space-y-2">
          <h2 className="text-mg-title-md font-semibold text-foreground">
            {t('assessment.heading')}
          </h2>
          <p className="max-w-[60ch] text-mg-body-sm text-muted-foreground">{t('assessment.body')}</p>
          <MasterIdSearch onResolve={setSelectedId} />
        </section>

        <WaterPointInspectionPanel id={selectedId} />
      </div>
    </SectionPage>
  )
}
