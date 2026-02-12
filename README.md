# Study Doc

A Next.js web app that fetches Markdown files from a GitHub repository and displays them as rendered HTML in the browser. Designed to make it easy for students to share study notes and view documents without cloning repositories or dealing with Git.

## Key Features

- **Markdown Rendering**: Beautifully renders Markdown files from GitHub repositories
- **Dynamic Sidebar**: Automatically generates a navigation sidebar from your repository structure
- **Image Support**: Automatically resolves relative image paths to GitHub raw URLs
- **Callouts**: Supports Obsidian-style callouts (info, warning, tip, etc.)
- **Mermaid Diagrams**: Renders Mermaid diagrams embedded in Markdown
- **Dark Mode**: Clean, readable dark UI perfect for studying
- **GitHub Integration**: Seamlessly fetches content from public GitHub repositories
- **Persistent Storage**: Remembers your repository settings in localStorage

## Demo

TODO: Add demo link

## Repository Setup Guide

To use Study Doc effectively, your GitHub repository should follow these conventions:

### Repository Structure

```
your-notes-repo/
├── README.md
├── Subject Folder 1/
│   ├── Assets/              # Images for this subject
│   │   ├── diagram.png
│   │   └── screenshot.jpg
│   ├── Notes/
│   │   ├── 1. Introduction.md
│   │   └── 2. Chapter Two.md
│   └── Summary.md
├── Subject Folder 2/
│   ├── Assets/
│   │   └── image.png
│   └── Notes/
│       └── topic.md
└── ...
```

### Important Requirements

1. **Branch**: Use `main` as your default branch (not `master`)
2. **Assets Folder**: Store images in an `Assets` folder at the appropriate level
3. **Public Repository**: Repository must be public (private repos not yet supported)
4. **File Extensions**: Use `.md` for Markdown files
5. **Filename Characters**: Avoid these characters in filenames: `[ ] # ^ | %`
   - These characters may cause parsing issues or URL encoding problems
   - Use hyphens (`-`) or underscores (`_`) instead of spaces
   - Example: `my-notes.md` instead of `my notes.md` or `my%20notes.md`

### Image Conventions

Study Doc automatically transforms relative image paths to GitHub raw URLs. Here's how to reference images:

#### Supported Path Formats

```markdown
<!-- Go up one directory from Notes/ to Subject Folder/, then into Assets/ -->
![My Diagram](../Assets/diagram.png)

<!-- Relative to current directory -->
![Screenshot](./Assets/screenshot.png)

<!-- Just the filename (assumes Assets is in current directory) -->
![Image](Assets/image.png)

<!-- Absolute URLs work as-is -->
![External Image](https://example.com/image.png)
```

#### Example Scenarios

**Scenario 1: Image in parent folder's Assets**
```
File: STU 1204/Notes/1. Introduction.md
Image: STU 1204/Assets/Pasted image.png
Reference: ![Diagram](../Assets/Pasted image.png)
Result: https://raw.githubusercontent.com/OWNER/REPO/main/STU%201204/Assets/Pasted%20image.png
```

**Scenario 2: Image in same folder's Assets**
```
File: README.md (in root)
Image: Assets/logo.png
Reference: ![Logo](Assets/logo.png)
Result: https://raw.githubusercontent.com/OWNER/REPO/main/Assets/logo.png
```

**Scenario 3: Image in subfolder's Assets**
```
File: Physics/Notes/lecture1.md
Image: Physics/Notes/Assets/formula.png
Reference: ![Formula](./Assets/formula.png)
Result: https://raw.githubusercontent.com/OWNER/REPO/main/Physics/Notes/Assets/formula.png
```

### Tips for Organizing Images

1. **Keep Assets Close**: Place the `Assets` folder at the same level as your notes for that subject
2. **Use Descriptive Names**: Name images descriptively (e.g., `database-erd-diagram.png` instead of `image1.png`)
3. **No Spaces in Filenames**: While supported, it's better to use hyphens or underscores
4. **Optimize Images**: Compress images before committing to keep your repo size manageable
5. **Use Relative Paths**: Always use relative paths (`../Assets/...`) instead of absolute GitHub URLs

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)
- A public GitHub repository with your notes

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd study-doc
```

2. Install dependencies:
```bash
pnpm install
```

3. Run the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### First Time Setup

When you first open the app:

1. Click "Configure Repository" 
2. Enter your GitHub username (owner) and repository name
3. The app will fetch your repository structure and display it in the sidebar
4. Click any `.md` file to view it

Your settings are saved in browser localStorage, so you won't need to re-enter them on subsequent visits.

## Usage

### Viewing Notes

1. **Via Sidebar**: Click any file in the left sidebar to view it
2. **Via URL**: Navigate directly to a file using the path:
   ```
   http://localhost:3000/view?path=Subject/Notes/file.md
   ```

### Supported Markdown Features

- Standard Markdown (headings, lists, links, bold, italic, etc.)
- Tables
- Code blocks with syntax highlighting
- Checkboxes (`- [ ]` and `- [x]`)
- **Obsidian Callouts**:
  ```markdown
  > [!info] Title
  > Content here
  
  > [!warning]- Collapsed by default
  > Hidden content
  
  > [!tip]+ Expanded by default
  > Visible content
  ```
- **Mermaid Diagrams**:
  ````markdown
  ```mermaid
  graph TD
      A[Start] --> B{Is it?}
      B -->|Yes| C[OK]
      B -->|No| D[End]
  ```
  ````

### Keyboard Shortcuts

- Collapse/expand sidebar sections by clicking the arrows

## Development

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Markdown**: react-markdown + remark-gfm
- **Diagrams**: Mermaid.js

### Project Structure

```
app/
├── page.tsx              # Main page with sidebar
├── view/
│   └── page.tsx          # Note viewer page
├── layout.tsx            # Root layout
└── globals.css           # Global styles

components/
├── app-sidebar.tsx       # Sidebar server component
├── app-sidebar-client.tsx # Sidebar client component
├── markdown-viewer.tsx   # Main markdown renderer
├── repo-modal.tsx        # Repository configuration modal
└── ui/                   # shadcn/ui components

lib/
├── utils.ts              # Utility functions (GitHub API, etc.)
└── ...

public/                   # Static assets
```

### Key Components

#### MarkdownViewer (`components/markdown-viewer.tsx`)

The main component that:
- Fetches Markdown from GitHub
- Renders it using react-markdown
- Handles custom components (callouts, Mermaid, images)
- Resolves relative image paths to GitHub raw URLs

#### AppSidebar (`components/app-sidebar.tsx` & `app-sidebar-client.tsx`)

Two-part sidebar system:
- Server component fetches initial data
- Client component handles navigation and state
- Automatically builds navigation tree from GitHub repository
- Supports collapsible folders

### Adding Custom Features

To add a new Markdown feature:

1. Edit `components/markdown-viewer.tsx`
2. Add your custom component to the `components` prop of `ReactMarkdown`
3. Follow the existing patterns for callouts and Mermaid diagrams

Example:
```typescript
components={{
  // ... existing components
  img: (props) => {
    // Your custom image handling
  },
}}
```

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. No additional configuration needed
4. Your app will be live at `https://your-project.vercel.app`

### Deploy to GitHub Pages

1. Update `next.config.ts`:
```typescript
const nextConfig = {
  output: 'export',
  basePath: '/your-repo-name',
}
```

2. Build and deploy:
```bash
pnpm build
# Push the `out` folder to gh-pages branch
```

### Environment Variables

No environment variables are required for basic functionality. However, if you want to:

- **Use a GitHub token** (for higher rate limits): Set `GITHUB_TOKEN`
- **Support private repos**: Add authentication logic in `lib/utils.ts`

## Troubleshooting

### Images Not Loading

1. Check that your repository uses the `main` branch (not `master`)
2. Verify the image path is correct relative to the Markdown file
3. Ensure the image is committed and pushed to GitHub
4. Check browser console for 404 errors

### Sidebar Not Loading

1. Verify the repository is public
2. Check that you entered the correct owner and repo name
3. Look for rate limiting (GitHub API has limits for unauthenticated requests)

### Markdown Not Rendering

1. Ensure files have `.md` extension
2. Check for syntax errors in your Markdown
3. Verify the file exists in the repository

## Future Enhancements

- [ ] Private repository support
- [ ] Offline mode with service workers
- [ ] Search functionality across all notes
- [ ] PDF export
- [ ] Collaborative annotations
- [ ] Flashcard game mode (inspired by Balatro)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this for your own study notes!

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Open an issue on GitHub
3. Include your repository URL (if public) and the specific file causing problems
