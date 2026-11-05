/** Shared guard for editor writes, protocol recovery and message rendering. */
export type EditableMessage = {
  mes?: string;
  swipe_id?: number;
  extra?: Record<string, unknown>;
};
export const MANUAL_EDIT_KEY = '_mjr_variable_editor_edit';
export const LEGACY_MANUAL_EDIT_KEY = '_mjr_variable_editor_swipe';

/** A new protocol in the message takes precedence over the saved, cleaned copy. */
export function readVariableProtocol(message: EditableMessage): string {
  if (typeof message.mes === 'string' && /<UpdateVariable\b/i.test(message.mes)) return message.mes;
  const saved = message.extra?._mfrs_raw_protocol_message;
  return typeof saved === 'string' ? saved : (message.mes ?? '');
}

export function manualEditProtocolKey(message: EditableMessage): string {
  const blocks = readVariableProtocol(message).match(/<UpdateVariable\b[^>]*>[\s\S]*?<\/UpdateVariable>/gi) ?? [];
  const protocol = blocks.join('\n').replace(/\r\n/g, '\n');
  let hash = 0x811c9dc5;
  for (let index = 0; index < protocol.length; index++) {
    hash = Math.imul(hash ^ protocol.charCodeAt(index), 0x01000193);
  }
  return `${message.swipe_id ?? 0}:${protocol.length}:${(hash >>> 0).toString(16)}`;
}

export function hasManualVariableEdit(message: EditableMessage | undefined): boolean {
  if (!message) return false;
  const marker = message.extra?.[MANUAL_EDIT_KEY];
  if (typeof marker === 'string') return marker === manualEditProtocolKey(message);
  // Compatibility with already saved editor marks. New writes also bind the protocol.
  return message.extra?.[LEGACY_MANUAL_EDIT_KEY] === (message.swipe_id ?? 0);
}

/** Install before the first await, so queued recovery cannot overwrite this edit. */
export function beginManualVariableEdit(message: EditableMessage): () => void {
  const extra = (message.extra ??= {});
  const previous = [extra[MANUAL_EDIT_KEY], extra[LEGACY_MANUAL_EDIT_KEY]];
  const marker = manualEditProtocolKey(message);
  extra[MANUAL_EDIT_KEY] = marker;
  extra[LEGACY_MANUAL_EDIT_KEY] = message.swipe_id ?? 0;
  return () => {
    if (message.extra?.[MANUAL_EDIT_KEY] !== marker) return;
    [MANUAL_EDIT_KEY, LEGACY_MANUAL_EDIT_KEY].forEach((key, index) => {
      if (previous[index] === undefined) delete message.extra![key];
      else message.extra![key] = previous[index];
    });
  };
}
