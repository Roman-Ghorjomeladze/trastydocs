import type { TemplateStyle } from '../../types/index.ts';
import type { TemplateRenderFn } from './shared.ts';
import { renderClassic } from './classic.ts';
import { renderModern } from './modern.ts';
import { renderMinimal } from './minimal.ts';
import { renderBold } from './bold.ts';
import { renderCompact } from './compact.ts';

export const TEMPLATE_REGISTRY: Record<TemplateStyle, TemplateRenderFn> = {
  classic: renderClassic,
  modern: renderModern,
  minimal: renderMinimal,
  bold: renderBold,
  compact: renderCompact,
};

export const TEMPLATE_OPTIONS: Array<{ value: TemplateStyle; labelKey: 'templateClassic' | 'templateModern' | 'templateMinimal' | 'templateBold' | 'templateCompact' }> = [
  { value: 'classic', labelKey: 'templateClassic' },
  { value: 'modern', labelKey: 'templateModern' },
  { value: 'minimal', labelKey: 'templateMinimal' },
  { value: 'bold', labelKey: 'templateBold' },
  { value: 'compact', labelKey: 'templateCompact' },
];
