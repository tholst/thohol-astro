import { initColorContrastChecker } from './color-contrast-checker';
import { initCssGradientBuilder } from './css-gradient-builder';
import { initNestedBorderRadiusCalculator } from './nested-border-radius-calculator';
import { initRegexPlayground } from './regex-playground';
import { initSubnetPlanner } from './subnet-planner';
import { initTimezoneMeetingPlanner } from './timezone-meeting-planner';

const toolId = document.querySelector('main')?.dataset.toolId || '';

if (toolId === 'subnet-planner') {
  initSubnetPlanner();
}
if (toolId === 'color-contrast-checker') {
  initColorContrastChecker();
}
if (toolId === 'regex-playground') {
  initRegexPlayground();
}
if (toolId === 'css-gradient-builder') {
  initCssGradientBuilder();
}
if (toolId === 'nested-border-radius-calculator') {
  initNestedBorderRadiusCalculator();
}
if (toolId === 'timezone-meeting-planner') {
  initTimezoneMeetingPlanner();
}
