import matter from "gray-matter";

export function parseMarkdown(raw = "") {
  const parsed = matter(raw);
  return {
    frontmatter: parsed.data || {},
    content: parsed.content || ""
  };
}

export function stringifyMarkdown(frontmatter = {}, content = "") {
  return matter.stringify(content.trim() + "\n", frontmatter);
}
