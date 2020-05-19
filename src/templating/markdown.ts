import marked from 'marked';

export function formatMarkdown(markdown: string | undefined) {
	const options: marked.MarkedOptions = {
		breaks: true,
	};
	return markdown ? marked(markdown, options) : markdown;
}
