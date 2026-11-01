import type { ComponentProps, PropsWithChildren } from 'react'

type ExternalLinkProps = PropsWithChildren<Omit<ComponentProps<'a'>, 'rel' | 'target'>>

export function ExternalLink({ children, ...props }: ExternalLinkProps) {
  return (
    <a {...props} target="_blank" rel="noreferrer">
      {children}
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <path d="M5 3h8v8M13 3 3 13" />
      </svg>
    </a>
  )
}
