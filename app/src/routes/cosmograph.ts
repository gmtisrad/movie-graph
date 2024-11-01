import { createFileRoute } from '@tanstack/react-router'
import { CosmographComponent } from '../components/Cosmograph'

export const Route = createFileRoute('/cosmograph')({
  component: CosmographComponent,
})
