export interface Context {
	[key: string]: string | undefined;
}

export function replacePlaceholders(text: string | undefined, payload: Context) {
	if (!text) {
		return text;
	}

	// Replace placeholders
	const replacedText = Object.entries(payload).reduce((textAcc, [key, value]) => {
		return value ? textAcc.replace(new RegExp('\\${' + key + '}', 'g'), value) : textAcc;
	}, text);
	return replacedText;
}
