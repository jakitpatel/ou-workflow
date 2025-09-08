import { createFileRoute, Link } from '@tanstack/react-router'
import '../App.css'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="App">
      <header className="App-header">
        {/* ✅ Only OU Workflow link remains */}
        <Link
          to="/ou-workflow"
          className="App-link"
        >
          Go to OU Workflow
        </Link>
      </header>
    </div>
  )
}
