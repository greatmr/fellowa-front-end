// Fixture for test/rsc-boundary.test.ts: a server module with each mistake
// the guard must report, beside the imports it must allow.
// A side-effect import of a file that does not exist: unresolved.
import './missing'
import * as everything from './client-tabs'
import { Tabs, type Tab, tabs } from './client-tabs'
import './barrel'

export function ServerPage({ tab }: { tab: Tab }) {
  return tabs.includes(tab) && everything ? <Tabs /> : null
}
