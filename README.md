# 🔗 URL Formatter for Obsidian

Automatically transforms messy URLs into clean, readable Markdown links when you paste them into [Obsidian](https://obsidian.md/).



## 📖 Overview

**URL Formatter** helps you maintain clean and organized notes by automatically converting long, complex URLs into concise Markdown links based on customizable patterns.

### 💡 The Problem

Constantly pasting long URLs like this into your daily notes:
```
https://your-company.atlassian.net/browse/PROJ-12345
```

### ✨ The Solution

This plugin automatically formats them into clean links:
```markdown
[PROJ-12345](https://your-company.atlassian.net/browse/PROJ-12345)
```

Or even:
```markdown
[Jira: PROJ-12345 (your-company)](https://your-company.atlassian.net/browse/PROJ-12345)
```

> [!TIP]
> Perfect for anyone who frequently pastes URLs containing meaningful identifiers (like Jira tickets, blog posts, documentation pages) into their vault!



## 🎯 Usage Examples

Here are practical examples showing how to configure patterns and their outputs:

### Example 1: Jira Ticket Formatting

| Setting | Value |
|---------|-------|
| **Pattern Name** | My Jira Tickets |
| **Regular Expression** | `https:\/\/yourcompany\.atlassian\.net\/browse\/([A-Z0-9-]+)` |
| **Output Format** | `$1` |

**Input:**
```
https://yourcompany.atlassian.net/browse/PROJ-4567
```

**Output:**
```markdown
[PROJ-4567](https://yourcompany.atlassian.net/browse/PROJ-4567)
```

---

### Example 2: Blog Posts with Year & Slug

| Setting | Value |
|---------|-------|
| **Pattern Name** | My Blog Posts |
| **Regular Expression** | `https:\/\/www\.example\.com\/blog\/(\d{4})\/([a-zA-Z0-9_-]+)` |
| **Output Format** | `Blog ($1): $2` |

**Input:**
```
https://www.example.com/blog/2023/my-awesome-article
```

**Output:**
```markdown
[Blog (2023): my-awesome-article](https://www.example.com/blog/2023/my-awesome-article)
```

---

### Example 3: Documentation Pages

| Setting | Value |
|---------|-------|
| **Pattern Name** | Specific Docs Page |
| **Regular Expression** | `https:\/\/docs\.mycompany\.com\/pages\/([a-z0-9-]+)` |
| **Output Format** | `Docs: $1` |

**Input:**
```
https://docs.mycompany.com/pages/getting-started
```

**Output:**
```markdown
[Docs: getting-started](https://docs.mycompany.com/pages/getting-started)
```



## ☕ Support

Coffee is life and it sure helps me keep going!

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/snoeckie)


