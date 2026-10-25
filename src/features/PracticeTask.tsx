import { useState } from 'react';
import { Check } from 'lucide-react';
import type { GrowthController } from '../app/useGrowth';
import type { GrowthState } from '../domain/model';

export function PracticeTask({ task, app }: { task: GrowthState['exercises'][number]; app: GrowthController }) {
  const [reflection, setReflection] = useState(task.details?.reflection ?? '');
  const [busy, setBusy] = useState(false);
  const details = task.details;
  const resource = app.state!.resources.find((r) => r.id === details?.resourceId && !r.deleted);
  return <article className="practice-task">
    <div className="list-row"><button className={`check-button ${task.completed ? 'checked' : ''}`} disabled={task.completed || busy} aria-label={`Complete practice ${task.title}`} onClick={() => { setBusy(true); void app.dispatch({ type: 'exercise.complete', id: task.id }, 'Practice complete. Your world is growing.').finally(() => setBusy(false)); }}>{task.completed && <Check size={17} />}</button><div className="grow"><strong className={task.completed ? 'completed' : ''}>{task.title}</strong>{details && <span className="small">{details.minutes} min · {details.source} · {details.basis === 'selected-notes' ? 'Selected notes' : details.basis === 'resource-title' ? 'Topic and resource title' : 'Topic only'}</span>}</div></div>
    {details && <details className="practice-details"><summary>Assignment details & reflection</summary><p><strong>Working toward:</strong> {details.objective}</p>{details.instructions !== task.title && <p>{details.instructions}</p>}<p><strong>Done when:</strong> {details.criteria}</p>{details.resourceId && <p>{resource ? <a href={resource.url} target="_blank" rel="noopener noreferrer">{resource.title} ↗</a> : 'The linked resource was removed. You can still complete this practice.'}</p>}<label>My practice reflection<textarea maxLength={2000} value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="What did you try? What would you change next time?" /></label><button className="subtle-button" disabled={reflection === details.reflection} onClick={() => void app.dispatch({ type: 'exercise.reflect', id: task.id, reflection }, 'Reflection saved.')}>Save reflection</button></details>}
  </article>;
}
