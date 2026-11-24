/**
 * @file Card UI primitive: solid plum panel (`.glass`). Add `hud` in className for corner brackets.
 * @exports Card
 */
import type { ComponentProps } from 'react'

export function Card({ className = '', ...props }: ComponentProps<'div'>) {
  return <div className={`glass rounded-lg ${className}`} {...props} />
}
