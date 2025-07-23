# url-formatter-obsidian
Automatically formats specific URLs pasted into [Obsidian](https://obsidian.md/) into clean Markdown links. 

## Overview
The URL Formatter plugin for Obsidian helps you keep your notes clean and organized by automatically transforming long, messy URLs into concise, readable Markdown links when you paste them into your editor.

I created it because I was constantly pasting long jira-url's in my daily notes and manually re-formatting them to only show the ticket-id. This plugin automates this process.

Instead of pasting a full URL like https://your-company.atlassian.net/browse/PROJ-12345, this plugin can automatically convert it to [PROJ-12345](https://your-company.atlassian.net/browse/PROJ-12345) or even [Jira: PROJ-12345 (your-company)](https://your-company.atlassian.net/browse/PROJ-12345).

This can be useful for everyone who often pastes (long/messy) url's, that contain a meaningful part, in their vault, making it cleaner.

## Examples

Here are some practical examples of how to set up patterns and what the output would look like:

### 1. Generic Jira Ticket Formatting
- **Pattern Name:** My Jira Tickets
- **Regular Expression:** https:\\/\\/yourcompany\\.atlassian\\.net\\/browse\\/([A-Z0-9-]+)
- **Output Format String:** Jira: $1
- **Pasting:** https://yourcompany.atlassian.net/browse/PROJ-4567
- **Result:** [Jira: PROJ-4567](https://yourcompany.atlassian.net/browse/PROJ-4567)

### 2. Blog Post with Year and Slug
- **Pattern Name:** My Blog Posts
- **Regular Expression:** https:\\/\\/www\\.example\\.com\\/blog\\/(\\d{4})\\/([a-zA-Z0-9_-]+)
- **Output Format String:** Blog ($1): $2
- **Pasting:** https://www.example.com/blog/2023/my-awesome-article
- **Result:** [Blog (2023): my-awesome-article](https://www.example.com/blog/2023/my-awesome-article)

### 3. Simple Domain-Based Link
- **Pattern Name:** Specific Docs Page
- **Regular Expression:** https:\\/\\/docs\\.mycompany\\.com\\/pages\\/([a-z0-9-]+)
- **Output Format String:** Docs: $1
- **Pasting:** https://docs.mycompany.com/pages/getting-started
- **Result:** [Docs: getting-started](https://docs.mycompany.com/pages/getting-started)

## Support
If you find this plugin useful and would like to support its development, consider buying me a coffee!

https://www.buymeacoffee.com/snoeckie

