# DocuRepo

A powerful Next.js web app that transforms GitHub repositories into beautiful, interactive study environments. Designed for students to share, view, and study notes without cloning repositories or dealing with Git. Features advanced theming, flashcards with spaced repetition, and a command palette for rapid navigation.

## Key Features

### 📚 **Multi-Repository Support**
- Add and manage multiple GitHub repositories simultaneously
- Quick repository switching with keyboard shortcuts (`Cmd/Ctrl + 1, 2, 3`)
- Repository stats tracking (file count, folder count, last fetched)
- Seamless switching between different note collections

### 🎨 **Advanced Theme System**
- **6 Curated Themes**: Midnight (dark), Solarized, Catppuccin, Nord, Tokyo Night, Gruvbox
- **10 Typography Options**: System fonts, Geist, IBM Plex, JetBrains Mono, SF Mono, Fira Code, and more
- **Custom Google Fonts**: Import any Google Font via URL
- **3 Text Sizes**: Small, Medium, Large for comfortable reading
- **OKLCH Color Space**: Modern color system for consistent, accessible themes
- **Real-time Switching**: No page reload required

### 🃏 **Flashcard System (Balatro-Inspired)**
- **YAML-Based Decks**: Create flashcards using simple YAML syntax
- **Spaced Repetition**: SM-2 algorithm tracks card difficulty and schedules reviews
- **4-Rating System**: Again, Hard, Good, Easy with intelligent interval calculations
- **Two Game Modes**:
  - **Unit Mode**: Study a specific deck systematically
  - **Random Mode**: Progress through 3 "Blinds" (Small, Big, Boss) with increasing difficulty
- **Statistics Tracking**: Reviews, lapses, ease factor, due dates per card
- **3D Card Animations**: Smooth flip transitions with keyboard controls

### 🧭 **Rich Navigation**
- **Command Palette** (`/`): Quick access to all actions and notes
- **Search Modal**: Search notes by title or content
- **Recent Notes**: Track your last 10 viewed notes with timestamps
- **Random Note** (`R`): Discover notes serendipitously
- **Continue Reading** (`C`): Jump back to your last note
- **Keyboard Shortcuts** (`?`): View all available shortcuts

### 📝 **Enhanced Markdown Rendering**
- **Standard + GitHub Flavored Markdown**: Full support for tables, task lists, strikethrough
- **Obsidian-Style Callouts**: 12 callout types (info, warning, tip, note, abstract, success, question, failure, danger, bug, example, quote)
- **Mermaid Diagrams**: Full Mermaid.js support for flowcharts, sequence diagrams, and more
- **Syntax Highlighting**: Beautiful code blocks with language detection and copy button
- **Smart Image Resolution**: Automatically converts relative paths to GitHub raw URLs
- **Typography**: Optimized reading experience with proper spacing and hierarchy

### 🎯 **Dashboard & Recent Notes**
- Clean dashboard with quick actions (Search, Continue Reading)
- Recent notes list with previews and timestamps
- Repository overview with file and folder counts
- Quick access to all features

### ⌨️ **Keyboard-First Design**
- Global shortcuts work from anywhere in the app
- Command palette for quick actions
- Navigation with arrow keys in command palette and modals
- Shortcuts modal (`?`) for discoverability

### 🔧 **Developer Experience**
- Full TypeScript support with strict type checking
- Component-based architecture with React Context for state management
- Server/Client component split for optimal performance
- Event-driven cross-component communication
- Comprehensive error handling with user-friendly messages

## Repository Setup Guide

To use DocuRepo effectively, your GitHub repository should follow these conventions:

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
│   ├── Flashcards/          # Optional flashcard decks
│   │   ├── Chapter1.yaml
│   │   └── Chapter2.yaml
│   └── Summary.md
├── Subject Folder 2/
│   ├── Assets/
│   │   └── image.png
│   ├── Notes/
│   │   └── topic.md
│   └── Flashcards/
│       └── deck.yaml
└── ...
```

### Important Requirements

1. **Branch**: Use `main` as your default branch (not `master`)
2. **Assets Folder**: Store images in an `Assets` folder at the appropriate level
3. **Public Repository**: Repository must be public (private repos not yet supported)
4. **File Extensions**: Use `.md` for Markdown files, `.yaml` for flashcard decks
5. **Filename Characters**: Avoid these characters in filenames: `[ ] # ^ | %`
   - These characters may cause parsing issues or URL encoding problems
   - Use hyphens (`-`) or underscores (`_`) instead of spaces
   - Example: `my-notes.md` instead of `my notes.md` or `my%20notes.md`

### Image Conventions

DocuRepo automatically transforms relative image paths to GitHub raw URLs. Here's how to reference images:

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

### Flashcard Deck Format

Create flashcard decks using YAML syntax in a `Flashcards` folder:

```yaml
# Chapter1.yaml
title: Introduction to Computer Science
cards:
  - id: cs-101
    front: What is an algorithm?
    back: A step-by-step procedure for solving a problem or accomplishing a task.
  
  - id: cs-102
    front: Define Big O notation
    back: A mathematical notation that describes the limiting behavior of a function when the argument tends towards a particular value or infinity.
  
  - id: cs-103
    front: What are the three basic control structures?
    back: |
      1. Sequence - executing statements in order
      2. Selection - choosing between alternatives (if/else)
      3. Iteration - repeating statements (loops)
```

**Flashcard Deck Requirements:**
- Must be in a folder named `Flashcards` (case-insensitive)
- Use `.yaml` or `.yml` file extension
- Include `title` and `cards` fields
- Each card must have `id`, `front`, and `back` fields
- Use YAML's multiline syntax (`|`) for longer content

### Tips for Organizing Content

1. **Keep Assets Close**: Place the `Assets` folder at the same level as your notes for that subject
2. **Use Descriptive Names**: Name images descriptively (e.g., `database-erd-diagram.png` instead of `image1.png`)
3. **No Spaces in Filenames**: While supported, it's better to use hyphens or underscores
4. **Optimize Images**: Compress images before committing to keep your repo size manageable
5. **Use Relative Paths**: Always use relative paths (`../Assets/...`) instead of absolute GitHub URLs
6. **Group Flashcards**: Organize flashcard decks by topic or chapter for easier navigation

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)
- A public GitHub repository with your notes

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd docurepo
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

1. A welcome modal will appear
2. Enter your GitHub repository URL (e.g., `https://github.com/username/notes`)
3. Click "Fetch notes" to load your repository
4. The app will fetch your repository structure and display it in the sidebar
5. Start browsing notes or click the Flashcards folder to study

Your settings are saved in browser localStorage, so you won't need to re-enter them on subsequent visits.

### Adding More Repositories

To add additional repositories:

1. Click the repository dropdown in the sidebar
2. Click "Add Repository"
3. Enter the new repository URL
4. Switch between repositories using the dropdown or keyboard shortcuts

## Usage

### Viewing Notes

1. **Via Sidebar**: Click any `.md` file in the left sidebar to view it
2. **Via Search**: Press `/` to open the command palette, then search for a note
3. **Via URL**: Navigate directly to a file:
   ```
   http://localhost:3000/notes/Subject/Notes/file.md
   ```

### Using Flashcards

1. **Access Decks**: Click the Flashcards folder in the sidebar
2. **Choose Mode**:
   - **Unit Mode**: Study a specific deck with spaced repetition
   - **Random Mode**: Play through 3 progressive "Blinds" (Small: 3 cards, Big: 5 cards, Boss: 8 cards)
3. **Rate Cards**: Use keyboard or click to rate each card:
   - `1` or click "Again" - Restart the card (hard reset)
   - `2` or click "Hard" - Short interval, slight difficulty increase
   - `3` or click "Good" - Standard progression
   - `4` or click "Easy" - Longer interval, card gets easier
4. **Track Progress**: View statistics after each session

### Supported Markdown Features

- **Standard Markdown**: Headings, lists, links, bold, italic, strikethrough
- **GitHub Flavored Markdown**: Tables, task lists, autolinks
- **Code Blocks**: Syntax highlighting for 100+ languages with copy button
  ````markdown
  ```javascript
  console.log("Hello, world!");
  ```
  ````
- **Obsidian Callouts**: 12 callout types with icons
  ```markdown
  > [!info] Information
  > This is an info callout
  
  > [!warning]- Collapsible Warning
  > This callout is collapsed by default
  
  > [!tip]+ Expanded Tip
  > This callout is expanded by default
  ```
  
  Available types: `info`, `warning`, `tip`, `note`, `abstract`, `success`, `question`, `failure`, `danger`, `bug`, `example`, `quote`

- **Mermaid Diagrams**: Full Mermaid.js support
  ````markdown
  ```mermaid
  graph TD
      A[Start] --> B{Is it?}
      B -->|Yes| C[OK]
      B -->|No| D[End]
  ```
  ````

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Open command palette |
| `?` | Show keyboard shortcuts |
| `R` | Open random note |
| `C` | Continue reading (last note) |
| `Cmd/Ctrl + 1-3` | Switch between first 3 repositories |
| `↑ / ↓` | Navigate items in command palette |
| `Enter` | Select item in command palette |
| `ESC` | Close modal or command palette |

**In Flashcard Mode:**
| Key | Action |
|-----|--------|
| `Space` | Flip card |
| `1` | Rate as "Again" |
| `2` | Rate as "Hard" |
| `3` | Rate as "Good" |
| `4` | Rate as "Easy" |

### Customizing Appearance

1. **Change Theme**: Click the theme selector on the dashboard
   - Choose from 6 curated themes
   - Themes update in real-time across all tabs
   
2. **Change Font**: Select from 10 built-in fonts or add a custom Google Font
   - Separate selections for UI font and code font
   - Import custom fonts via Google Fonts URL
   
3. **Adjust Text Size**: Choose Small, Medium, or Large for comfortable reading

## Development

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 with OKLCH color space
- **UI Components**: shadcn/ui (headless, accessible components)
- **State Management**: React Context API with localStorage persistence
- **Markdown**: react-markdown + remark-gfm
- **Diagrams**: Mermaid.js
- **Flashcards**: Custom implementation with SM-2 spaced repetition
- **YAML Parsing**: js-yaml

### Project Structure

```
app/
├── page.tsx                    # Dashboard
├── notes/[...slug]/page.tsx    # Dynamic note viewer
├── flashcards/
│   ├── page.tsx                # Flashcard deck hub
│   └── play/page.tsx           # Flashcard game interface
├── layout.tsx                  # Root layout with providers
├── globals.css                 # Global styles and theme tokens
└── sidebar.css                 # Sidebar styling

components/
├── app-sidebar.tsx             # Server-rendered sidebar
├── app-sidebar-client.tsx      # Client sidebar with navigation
├── markdown-viewer.tsx         # Main markdown renderer
├── startup-modal.tsx           # Repository setup modal
├── theme/
│   ├── theme-provider.tsx      # Theme management and state
│   └── theme-selector.tsx      # Theme UI component
├── repo/
│   ├── repo-provider.tsx       # Multi-repo state management
│   └── repo-switcher.tsx       # Repository dropdown
├── command-palette/
│   └── command-palette-provider.tsx  # Command palette logic
├── search/
│   └── search-modal.tsx        # Search interface
├── shortcuts/
│   └── shortcuts-modal.tsx     # Keyboard shortcuts help
├── flashcards/
│   ├── FlashcardDeck.tsx       # Deck player component
│   ├── FlashcardCard.tsx       # Individual card with flip animation
│   └── flashcard-styles.css    # Flashcard UI styles
├── markdown/
│   ├── CodeBlock.tsx           # Code syntax highlighting
│   ├── Callout.tsx             # Obsidian callout rendering
│   ├── MermaidDiagram.tsx      # Mermaid diagram renderer
│   └── callout-utils.ts        # Callout parsing and config
└── ui/                         # shadcn/ui components

lib/
├── utils.ts                    # GitHub API, parsing, sidebar builder
├── flashcard-parser.ts         # YAML flashcard parsing
├── flashcard-types.ts          # Flashcard type definitions, Blinds config
└── spaced-repetition.ts        # SM-2 algorithm implementation
```

### Key Components

#### MarkdownViewer (`components/markdown-viewer.tsx`)

The main component that:
- Fetches Markdown from GitHub using the raw content API
- Renders using react-markdown with custom components
- Handles callouts, Mermaid diagrams, code blocks, and images
- Resolves relative image paths to GitHub raw URLs
- Tracks recently viewed notes

#### AppSidebar (`components/app-sidebar.tsx` & `app-sidebar-client.tsx`)

Two-part sidebar system:
- Server component provides initial static structure
- Client component handles dynamic navigation, collapsible folders, and state
- Automatically builds navigation tree from GitHub repository
- Supports multi-level nested folders
- Special handling for Flashcards folders

#### ThemeProvider (`components/theme/theme-provider.tsx`)

Comprehensive theme management:
- 6 predefined themes with OKLCH color tokens
- 10 font options with bundled and system fonts
- Custom Google Font import
- Real-time theme switching without page reload
- Persists all settings to localStorage

#### FlashcardDeck (`components/flashcards/FlashcardDeck.tsx`)

Flashcard game interface:
- Two game modes (Unit, Random)
- 3D card flip animations
- 4-rating system integration with spaced repetition
- Progress tracking and session summaries
- Keyboard and click controls

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

To add a new theme:

1. Edit `components/theme/theme-provider.tsx`
2. Add a new theme object to the `THEMES` array
3. Define all required color tokens using OKLCH values

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. No additional configuration needed
4. Your app will be live at `https://your-project.vercel.app`

### Deploy to Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Build command: `pnpm build`
4. Publish directory: `.next`

### Deploy to GitHub Pages

1. Update `next.config.ts`:
```typescript
const nextConfig = {
  output: 'export',
  basePath: '/your-repo-name',
  images: {
    unoptimized: true,
  },
}
```

2. Build and deploy:
```bash
pnpm build
# Push the `out` folder to gh-pages branch
```

### Environment Variables

No environment variables are required for basic functionality. However, you can optionally set:

- **`GITHUB_TOKEN`**: For higher API rate limits (optional)
- Currently supports public repositories only

## Troubleshooting

### Images Not Loading

1. Check that your repository uses the `main` branch (not `master`)
2. Verify the image path is correct relative to the Markdown file
3. Ensure the image is committed and pushed to GitHub
4. Check browser console for 404 errors
5. Verify the image file exists in the `Assets` folder

### Sidebar Not Loading

1. Verify the repository is public
2. Check that you entered the correct GitHub URL
3. Look for rate limiting errors in the console (GitHub API has limits for unauthenticated requests)
4. Try refreshing the repository from the repository dropdown

### Markdown Not Rendering

1. Ensure files have `.md` extension
2. Check for syntax errors in your Markdown
3. Verify the file exists in the repository
4. Clear browser cache and localStorage if needed

### Flashcards Not Appearing

1. Ensure the folder is named `Flashcards` (case-insensitive)
2. Verify deck files use `.yaml` or `.yml` extension
3. Check YAML syntax is valid (use a YAML validator)
4. Ensure each card has `id`, `front`, and `back` fields
5. Check browser console for parsing errors

### Theme Not Saving

1. Check that localStorage is enabled in your browser
2. Ensure you're not in private/incognito mode
3. Clear browser cache and try again
4. Check browser console for storage quota errors

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this for your own study notes!

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Open an issue on GitHub
3. Include your repository URL (if public) and the specific file causing problems
