import { Droplets, Info, Loader, Moon, TriangleAlert } from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import { useTheme } from '@/app/providers/theme-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SemanticChip } from '@/components/status/semantic-chip'
import { Section, SpecimenTable, TokenCell } from '@/app/foundation/specimens'
import {
  elevationScale,
  mapFoundationTokens,
  radiusScale,
  spacingScale,
  type TokenRow,
} from '@/app/foundation/foundation-data'

const surfaceTokens: TokenRow[] = [
  { token: '--background', label: 'Page background', usage: 'Main canvas; white in light mode, deep navy in dark mode' },
  { token: '--foreground', label: 'Primary text', usage: 'Headings, body copy, table text' },
  { token: '--card', label: 'Card surface', usage: 'Bounded content units only' },
  { token: '--popover', label: 'Overlay surface', usage: 'Menus, tooltips, select and combobox panels' },
  { token: '--muted', label: 'Muted surface', usage: 'Table headers, skeleton blocks, quiet areas' },
  { token: '--muted-foreground', label: 'Secondary text', usage: 'Captions, helper text, metadata' },
  { token: '--primary', label: 'Institutional blue', usage: 'Primary actions, selected navigation, links' },
  { token: '--accent', label: 'Accent surface', usage: 'Hover and selected rows' },
  { token: '--border', label: 'Hairline', usage: 'Dividers and decorative separators' },
  { token: '--border-strong', label: 'Interactive boundary', usage: 'Input, select and checkbox borders; 3:1 minimum' },
  { token: '--ring', label: 'Focus ring', usage: 'Keyboard focus indicator' },
]

const statusTokens: TokenRow[] = [
  { token: '--status-functional', label: 'Functional', usage: 'Observed functional status' },
  { token: '--status-nonfunctional', label: 'Non-functional', usage: 'Observed non-functional status' },
  { token: '--status-warning', label: 'Elevated concern', usage: 'Attention without a status claim' },
  { token: '--status-info', label: 'Informational', usage: 'Neutral system messages' },
]

const riskTokens: TokenRow[] = [
  { token: '--risk-low', label: 'Low', usage: 'Lowest risk band' },
  { token: '--risk-moderate', label: 'Moderate', usage: 'Second risk band' },
  { token: '--risk-elevated', label: 'Elevated', usage: 'Third risk band' },
  { token: '--risk-high', label: 'High', usage: 'Highest risk band' },
]

const impactTokens: TokenRow[] = [
  { token: '--impact-low', label: 'Low', usage: 'Lowest impact level' },
  { token: '--impact-moderate', label: 'Moderate', usage: 'Middle impact level' },
  { token: '--impact-high', label: 'High', usage: 'Highest impact level' },
]

const seriesTokens: TokenRow[] = [
  { token: '--chart-1', label: 'Series 1', usage: 'Categorical charts only' },
  { token: '--chart-2', label: 'Series 2', usage: 'Categorical charts only' },
  { token: '--chart-3', label: 'Series 3', usage: 'Categorical charts only' },
  { token: '--chart-4', label: 'Series 4', usage: 'Categorical charts only' },
  { token: '--chart-5', label: 'Series 5', usage: 'Categorical charts only' },
]

const typeScale = [
  { name: 'display', className: 'text-mg-display font-semibold', sample: 'Water supply overview' },
  { name: 'title-lg', className: 'text-mg-title-lg font-semibold', sample: 'District water point risk' },
  { name: 'title-md', className: 'text-mg-title-md font-semibold', sample: 'Section heading' },
  { name: 'title-sm', className: 'text-mg-title-sm font-semibold', sample: 'Subsection heading' },
  { name: 'body', className: 'text-mg-body', sample: 'Body copy for descriptions and explanations.' },
  { name: 'body-sm', className: 'text-mg-body-sm', sample: 'Secondary body copy used in dense layouts.' },
  { name: 'label', className: 'text-mg-label font-medium', sample: 'Field label' },
  { name: 'caption', className: 'text-mg-caption', sample: 'Caption, source note or timestamp' },
  { name: 'figure', className: 'mg-figure text-mg-figure font-semibold', sample: '1,048' },
]

function TokenRows({ rows, caption }: { rows: TokenRow[]; caption: string }) {
  const { t } = useI18n()

  return (
    <SpecimenTable caption={caption} headers={[t('token.label'), t('token.usage')]}>
      {rows.map((row) => (
        <tr key={row.token} className="border-b border-border/60 last:border-b-0">
          <td>
            <TokenCell token={row.token} label={row.label} />
          </td>
          <td className="py-2 text-muted-foreground">{row.usage}</td>
        </tr>
      ))}
    </SpecimenTable>
  )
}

export function FoundationPage() {
  const { t, locale } = useI18n()
  const { theme } = useTheme()

  return (
    <div className="space-y-10 pb-16">
      <Section id="typography" title={t('foundation.typography')} description={t('foundation.typography.body')}>
        <SpecimenTable
          caption={t('foundation.typography')}
          headers={[t('token.label'), 'Sample']}
        >
          {typeScale.map((entry) => (
            <tr key={entry.name} className="border-b border-border/60 last:border-b-0">
              <td className="w-40 py-2 pe-4 align-top">
                <span className="block font-medium text-foreground">{entry.name}</span>
                <code className="text-mg-caption text-muted-foreground">{entry.className}</code>
              </td>
              <td className={`py-2 text-foreground ${entry.className}`}>{entry.sample}</td>
            </tr>
          ))}
        </SpecimenTable>
      </Section>

      <Section id="colour" title={t('foundation.colour')} description={t('foundation.colour.body')}>
        <div className="space-y-8">
          <div>
            <h3 className="text-mg-title-sm font-medium text-foreground">
              {t('foundation.surfaces')}
            </h3>
            <div className="mt-3">
              <TokenRows rows={surfaceTokens} caption={t('foundation.surfaces')} />
            </div>
          </div>

          <div>
            <h3 className="text-mg-title-sm font-medium text-foreground">
              {t('foundation.status')}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <SemanticChip kind="status" tone="functional" />
              <SemanticChip kind="status" tone="nonfunctional" />
              <SemanticChip kind="status" tone="warning" />
              <SemanticChip kind="status" tone="info" />
            </div>
            <div className="mt-3">
              <TokenRows rows={statusTokens} caption={t('foundation.status')} />
            </div>
          </div>

          <div>
            <h3 className="text-mg-title-sm font-medium text-foreground">
              {t('foundation.risk')}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <SemanticChip kind="risk" tone="low" />
              <SemanticChip kind="risk" tone="moderate" />
              <SemanticChip kind="risk" tone="elevated" />
              <SemanticChip kind="risk" tone="high" />
            </div>
            <div className="mt-3">
              <TokenRows rows={riskTokens} caption={t('foundation.risk')} />
            </div>
          </div>

          <div>
            <h3 className="text-mg-title-sm font-medium text-foreground">
              {t('foundation.impact')}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <SemanticChip kind="impact" tone="low" />
              <SemanticChip kind="impact" tone="moderate" />
              <SemanticChip kind="impact" tone="high" />
            </div>
            <div className="mt-3">
              <TokenRows rows={impactTokens} caption={t('foundation.impact')} />
            </div>
          </div>

          <div>
            <h3 className="text-mg-title-sm font-medium text-foreground">
              {t('foundation.series')}
            </h3>
            <p className="mt-1 text-mg-caption text-muted-foreground">
              {t('foundation.series.note')}
            </p>
            <div className="mt-3">
              <TokenRows rows={seriesTokens} caption={t('foundation.series')} />
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="structure"
        title={t('foundation.structure')}
        description={t('foundation.structure.body')}
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-mg-title-sm font-medium text-foreground">
              {t('foundation.spacing')}
            </h3>
            <p className="mt-1 text-mg-caption text-muted-foreground">
              {t('foundation.spacing.body')}
            </p>
            <ul className="mt-3 space-y-2">
              {spacingScale.map((step) => (
                <li key={step} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-3 shrink-0 rounded-xs bg-primary"
                    style={{ width: `${step * 0.25}rem` }}
                  />
                  <span className="text-mg-caption text-muted-foreground">
                    {step} · {step * 4}px
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-mg-title-sm font-medium text-foreground">
              {t('foundation.radius')}
            </h3>
            <p className="mt-1 text-mg-caption text-muted-foreground">
              {t('foundation.radius.body')}
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              {radiusScale.map((step) => (
                <div key={step} className="flex flex-col items-center gap-1">
                  <span
                    aria-hidden="true"
                    className="size-10 border border-border-strong bg-accent"
                    style={{ borderRadius: `var(--radius-${step})` }}
                  />
                  <span className="text-mg-caption text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-mg-title-sm font-medium text-foreground">
              {t('foundation.elevation')}
            </h3>
            <p className="mt-1 text-mg-caption text-muted-foreground">
              {t('foundation.elevation.body')}
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              {elevationScale.map((level) => (
                <div key={level} className="flex flex-col items-center gap-1">
                  <span
                    aria-hidden="true"
                    className="size-12 rounded-md border border-border bg-card"
                    style={{ boxShadow: `var(--shadow-mg-${level})` }}
                  />
                  <span className="text-mg-caption text-muted-foreground">
                    shadow-mg-{level}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-mg-title-sm font-medium text-foreground">
              {t('foundation.motion')}
            </h3>
            <p className="mt-1 text-mg-caption text-muted-foreground">
              {t('foundation.motion.body')}
            </p>
            <button
              type="button"
              className="mg-transition mt-3 rounded-md border border-border-strong bg-card px-4 py-2 text-mg-body-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {t('foundation.motion.sample')}
            </button>
          </div>
        </div>
      </Section>

      <Section id="components" title={t('foundation.components')}>
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <Button>{t('component.sample.action')}</Button>
            <Button variant="secondary">{t('component.sample.secondary')}</Button>
            <Button variant="outline">{t('component.sample.outline')}</Button>
            <Button variant="ghost">{t('component.sample.ghost')}</Button>
            <Button variant="destructive">{t('component.sample.destructive')}</Button>
            <Button disabled>{t('component.sample.disabled')}</Button>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={t('component.sample.tooltipTrigger')}
                  >
                    <Info className="size-4" />
                  </Button>
                }
              />
              <TooltipContent>{t('component.sample.tooltipText')}</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline">{t('component.sample.menu')}</Button>
                }
              />
              <DropdownMenuContent>
                <DropdownMenuItem>{t('component.sample.option')}</DropdownMenuItem>
                <DropdownMenuItem>{t('component.sample.option')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sample-input">{t('component.sample.label')}</Label>
              <Input id="sample-input" placeholder={t('component.sample.placeholder')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sample-select">{t('component.sample.label')}</Label>
              <Select>
                <SelectTrigger id="sample-select">
                  <SelectValue placeholder={t('component.sample.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one">{t('component.sample.option')}</SelectItem>
                  <SelectItem value="two">{t('component.sample.option')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="sample-switch" defaultChecked />
              <Label htmlFor="sample-switch">{t('component.sample.switch')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{t('component.sample.badge')}</Badge>
              <Badge variant="secondary">{t('component.sample.badge')}</Badge>
              <Badge variant="outline">{t('component.sample.badge')}</Badge>
              <Badge variant="destructive">{t('component.sample.badge')}</Badge>
            </div>
          </div>

          <Tabs defaultValue="one" className="max-w-2xl">
            <TabsList>
              <TabsTrigger value="one">{t('component.sample.tabOne')}</TabsTrigger>
              <TabsTrigger value="two">{t('component.sample.tabTwo')}</TabsTrigger>
              <TabsTrigger value="three">{t('component.sample.tabThree')}</TabsTrigger>
            </TabsList>
            <TabsContent value="one">
              <p className="text-mg-body-sm text-muted-foreground">
                {t('component.sample.placeholderText')}
              </p>
            </TabsContent>
            <TabsContent value="two">
              <p className="text-mg-body-sm text-muted-foreground">
                {t('component.sample.placeholderText')}
              </p>
            </TabsContent>
            <TabsContent value="three">
              <p className="text-mg-body-sm text-muted-foreground">
                {t('component.sample.placeholderText')}
              </p>
            </TabsContent>
          </Tabs>

          <div className="max-w-md">
            <Card>
              <CardHeader>
                <CardTitle>{t('component.sample.cardTitle')}</CardTitle>
                <CardDescription>
                  {t('component.sample.cardDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-mg-body-sm text-muted-foreground">
                  {t('component.sample.placeholderText')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Section>

      <Section id="states" title={t('foundation.states')}>
        <div className="grid max-w-3xl gap-4">
          <div className="flex items-center gap-3">
            <Loader aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
            <span className="text-mg-body-sm text-foreground">{t('state.loading')}</span>
            <span className="text-mg-body-sm text-muted-foreground">
              {t('state.loading.body')}
            </span>
          </div>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />

          <Alert>
            <Droplets aria-hidden="true" />
            <AlertTitle>{t('state.empty.title')}</AlertTitle>
            <AlertDescription>{t('state.empty.body')}</AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>{t('state.error.title')}</AlertTitle>
            <AlertDescription>{t('state.error.body')}</AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section id="map" title={t('foundation.map')} description={t('foundation.map.body')}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex min-h-48 flex-col gap-3 rounded-md border border-border bg-map-surface p-4">
            <div className="rounded-sm border border-map-overlay-border bg-map-overlay p-3 text-mg-caption text-foreground">
              <code>map-overlay</code>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-mg-caption text-muted-foreground">
                <Moon aria-hidden="true" className="size-3" />
                {t('foundation.map.markers')}
              </span>
              <SemanticChip kind="risk" tone="low" />
              <SemanticChip kind="risk" tone="high" />
            </div>
          </div>
          <div>
            <TokenRows rows={mapFoundationTokens} caption={t('foundation.map')} />
          </div>
        </div>
      </Section>

      <Section id="localisation" title={t('foundation.localisation')} description={t('foundation.localisation.body')}>
        <dl className="grid max-w-2xl gap-3 text-mg-body-sm sm:grid-cols-[12rem_1fr]">
          <dt className="text-muted-foreground">{t('foundation.locale')}</dt>
          <dd className="text-foreground">{locale === 'en' ? t('locale.en') : t('locale.sw')}</dd>
          <dt className="text-muted-foreground">{t('foundation.documentLanguage')}</dt>
          <dd className="text-foreground">
            <code>html lang="{locale}"</code>
          </dd>
          <dt className="text-muted-foreground">{t('foundation.activeTheme')}</dt>
          <dd className="text-foreground">
            <code>html class="{theme === 'dark' ? 'dark' : 'no class'}"</code>
          </dd>
          <dt className="text-muted-foreground">{t('foundation.example')}</dt>
          <dd className="text-foreground">{t('state.empty.title')}</dd>
        </dl>
      </Section>

      <Section id="accessibility" title={t('foundation.accessibility')}>
        <ul className="max-w-3xl list-disc space-y-2 ps-5 text-mg-body-sm text-muted-foreground">
          <li>{t('a11y.contrast')}</li>
          <li>{t('a11y.targets')}</li>
          <li>{t('a11y.focus')}</li>
          <li>{t('a11y.obscured')}</li>
          <li>{t('a11y.threeSignals')}</li>
          <li>{t('a11y.figures')}</li>
          <li>{t('a11y.motion')}</li>
          <li>{t('a11y.keyboard')}</li>
        </ul>
      </Section>
    </div>
  )
}
