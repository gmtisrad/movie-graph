import { createFileRoute } from '@tanstack/react-router'
import { GraphCanvas } from '../pages/Canvas';

export const Route = createFileRoute('/canvas')({
  component: GraphCanvas
});
