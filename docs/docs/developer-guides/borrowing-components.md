# Borrowing Components from Main App

This guide shows you how to reuse components, styles, and utilities from your main ElizaOS React app within your Docusaurus documentation site.

## 🎯 Why Borrow Components?

- **Consistency**: Maintain the same visual language across docs and app
- **Efficiency**: Don't rebuild what already exists
- **Accuracy**: Show exactly how your app looks and behaves
- **Maintenance**: Single source of truth for design components

## 🛠️ Setup & Configuration

### Webpack Aliases

The Docusaurus config includes webpack aliases to make importing easier:

```typescript
// Available aliases:
'@main' -> '../src'
'@main-components' -> '../src/components'
'@main-lib' -> '../src/lib'
'@main-hooks' -> '../src/hooks'
```

### Direct Import Example

```typescript
// Instead of relative paths:
import { StatCard } from "../../../src/components/stat-card";

// Use aliases:
import { StatCard } from "@main-components/stat-card";
```

## 📦 Available Components to Borrow

Based on your main app, these components are excellent candidates for borrowing:

### UI Components (`src/components/ui/`)

- `Badge` - Status indicators and labels
- `Button` - Consistent button styling
- `Card` - Container components
- `Avatar` - User profile images
- `Progress` - XP and skill progress bars
- `Tooltip` - Contextual help

### Feature Components (`src/components/`)

- `stat-card.tsx` - Metric display cards
- `skill-card.tsx` - XP and level visualization
- `leaderboard-card.tsx` - Ranking displays
- `badge-list.tsx` - Achievement collections
- `contributor-item.tsx` - User profile snippets

## 🔄 Adaptation Strategies

### 1. Direct Import (Recommended)

```typescript
// docs/src/components/LiveComponents.tsx
import React from 'react';
// Direct import from main app
import { StatCard } from '@main-components/stat-card';
import { Badge } from '@main-components/ui/badge';

export function LiveStatsDemo() {
  return (
    <div className="row">
      <div className="col col--4">
        <StatCard
          title="Live XP"
          value="12,547"
          trend="up"
        />
      </div>
      {/* More components */}
    </div>
  );
}
```

### 2. Style Adaptation

When direct import isn't possible, adapt the styling:

```typescript
// docs/src/components/AdaptedComponents.tsx
interface StatCardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
}

export const DocStatCard: React.FC<StatCardProps> = ({ title, value, trend }) => {
  return (
    <div className="card padding--md">
      {/* Adapted from main app's StatCard styling */}
      <div style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        color: 'var(--ifm-color-primary)'
      }}>
        {value}
      </div>
      <div style={{ color: 'var(--ifm-color-emphasis-600)' }}>
        {title}
      </div>
    </div>
  );
};
```

### 3. Data Integration

Connect to the same data sources:

```typescript
// docs/src/components/LiveData.tsx
import React, { useEffect, useState } from 'react';

interface LeaderboardData {
  username: string;
  score: number;
  rank: number;
}

export function LiveLeaderboard() {
  const [data, setData] = useState<LeaderboardData[]>([]);

  useEffect(() => {
    // Fetch from same API as main app
    fetch('https://elizaos.github.io/api/leaderboard')
      .then(res => res.json())
      .then(setData);
  }, []);

  return (
    <div>
      {data.map((entry, index) => (
        <LeaderboardEntry key={index} {...entry} />
      ))}
    </div>
  );
}
```

## 🎨 Styling Considerations

### CSS Variables

Both sites use the same color scheme through CSS variables:

```css
/* Shared variables work across both apps */
--ifm-color-primary: #ff8c00;
--ifm-color-primary-dark: #e67e00;
/* etc. */
```

### Tailwind → Docusaurus CSS

When adapting Tailwind classes to Docusaurus:

```typescript
// Main app (Tailwind):
<div className="bg-orange-500 text-white p-4 rounded-lg">

// Docusaurus adaptation:
<div style={{
  backgroundColor: 'var(--ifm-color-primary)',
  color: 'white',
  padding: '1rem',
  borderRadius: '8px'
}}>
```

## 📱 Responsive Design

Maintain responsive behavior:

```typescript
// Mobile-first approach
const ResponsiveComponent = () => (
  <div className="row">
    <div className="col col--12 col--md-6 col--lg-4">
      {/* Responsive grid */}
    </div>
  </div>
);
```

## 🚀 Deployment Considerations

Since both apps deploy to the same branch:

### Shared Assets

```
docs/static/img/          # Docusaurus images
static/img/               # Main app images (if overlapping)
```

### Build Integration

```bash
# In your build process:
npm run build:docs        # Build Docusaurus
npm run build:app         # Build main app
# Deploy both to same branch
```

## 🔧 Best Practices

### 1. Component Wrapping

```typescript
// Wrap main app components for Docusaurus context
import { MainAppButton } from '@main-components/ui/button';

export const DocsButton = (props) => (
  <div className="margin--sm">
    <MainAppButton {...props} />
  </div>
);
```

### 2. Error Boundaries

```typescript
// Protect against main app component failures
import React from 'react';

export class ComponentBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.warn('Borrowed component failed:', error);
  }

  render() {
    if (this.state?.hasError) {
      return <div>Component temporarily unavailable</div>;
    }
    return this.props.children;
  }
}
```

### 3. Fallback Components

```typescript
// Provide fallbacks when main components aren't available
export const SafeStatCard = (props) => {
  try {
    return <MainAppStatCard {...props} />;
  } catch {
    return <SimpleDocusaurusCard {...props} />;
  }
};
```

## 📖 Live Examples

Check out `/docs/demo` to see these techniques in action with:

- ✅ Live stat cards with real styling
- ✅ Interactive leaderboard components
- ✅ Badge and skill components
- ✅ Consistent visual language

## 🎯 Next Steps

1. **Identify Key Components**: Which main app components would enhance your docs?
2. **Start Simple**: Begin with UI components like badges and cards
3. **Add Interactivity**: Integrate live data for demos
4. **Maintain Consistency**: Keep design language unified
5. **Document Usage**: Help others understand how to use borrowed components

---

_This approach lets you create documentation that truly represents your application while maintaining a single source of truth for your design system._ ✨
