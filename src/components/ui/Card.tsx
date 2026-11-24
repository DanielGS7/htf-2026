/**
 * @file Card UI primitive: frosted themed surface.
 * @exports Card
 */
import type { ComponentProps } from 'react'

export function Card({ className = '', ...props }: ComponentProps<'div'>) {
  return <div className={`glass rounded-2xl ${className}`} {...props} />
}
