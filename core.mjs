export function chunks(text, size = 1900) {
  const result = [];
  for (const character of text) {
    if (!result.length || result.at(-1).length + character.length > size) result.push('');
    result[result.length - 1] += character;
  }
  return result;
}

export function shouldReply(message, botId, mode) {
  if (message.author.bot || message.webhookId) return false;
  return mode === 'always' || message.mentions.users.has(botId)
    || message.mentions.repliedUser?.id === botId;
}

export function responseText(response) {
  return (response.candidates?.[0]?.content?.parts ?? [])
    .filter(item => !item.thought && typeof item.text === 'string')
    .map(item => item.text).join('\n').trim();
}
