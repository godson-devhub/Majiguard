import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router'

import { useAuth } from '@/app/providers/auth-provider'
import { useI18n } from '@/app/providers/locale-provider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type SignOutButtonProps = {
  /** icon-only presentation, matching the collapsed rail */
  compact: boolean
  onSignedOut?: () => void
}

/** Sidebar / drawer entry that ends the session and returns to the sign-in page. */
export function SignOutButton({ compact, onSignedOut }: SignOutButtonProps) {
  const { t } = useI18n()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const label = t('auth.logout')

  const button = (
    <button
      type="button"
      onClick={() => {
        logout()
        onSignedOut?.()
        navigate('/login', { replace: true })
      }}
      className={cn(
        'group flex min-h-12 w-full items-center rounded-lg text-mg-body text-sidebar-foreground transition-colors duration-200 hover:bg-status-nonfunctional-soft hover:text-status-nonfunctional-fg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
        compact ? 'justify-center px-2' : 'gap-3 px-3',
      )}
    >
      <LogOut aria-hidden="true" className="size-5 shrink-0 text-sidebar-foreground/80 group-hover:text-status-nonfunctional-fg" />
      <span className={compact ? 'sr-only' : undefined}>{label}</span>
    </button>
  )

  if (!compact) {
    return button
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
