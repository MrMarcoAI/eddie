import { tags as t } from '@lezer/highlight';

/** Code token colors shared by the editor and the HTML export, so both look the same. */
export const codeTokens = [
  { tag: [t.keyword, t.modifier, t.operatorKeyword], class: 'tok-keyword', color: 'var(--code-keyword)' },
  { tag: [t.string, t.special(t.string), t.regexp], class: 'tok-string', color: 'var(--code-string)' },
  { tag: [t.number, t.bool, t.null], class: 'tok-number', color: 'var(--code-number)' },
  { tag: [t.comment, t.lineComment, t.blockComment], class: 'tok-comment', color: 'var(--text-muted)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], class: 'tok-function', color: 'var(--code-function)' },
  { tag: [t.typeName, t.className, t.tagName], class: 'tok-type', color: 'var(--code-type)' },
  { tag: [t.propertyName, t.attributeName], class: 'tok-property', color: 'var(--code-property)' },
];
