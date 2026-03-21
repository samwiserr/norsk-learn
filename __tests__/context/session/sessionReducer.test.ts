import { sessionReducer, initialSessionState, type SessionState } from "@/src/context/session";
import { sessionActions } from "@/src/context/session";
import type { Session } from "@/lib/sessions";

const baseSession = (over: Partial<Session> = {}): Session => ({
  id: "s1",
  title: "T",
  createdAt: 1000,
  updatedAt: 1000,
  messages: [],
  messageCount: 0,
  cefrLevel: "A1",
  progress: 0,
  completedTasks: 0,
  srsReviewList: [],
  ...over,
});

describe("sessionReducer", () => {
  it("INIT_LOADED picks latest session as active", () => {
    const older = baseSession({ id: "old", updatedAt: 1 });
    const newer = baseSession({ id: "new", updatedAt: 9999 });
    const state = sessionReducer(
      initialSessionState,
      sessionActions.initLoaded([older, newer], "B1")
    );
    expect(state.activeSessionId).toBe("new");
    expect(state.cefrLevel).toBe("B1");
    expect(state.phase).toBe("ready");
  });

  it("UPDATE_SESSION merges into existing session", () => {
    const s = baseSession({ id: "a", title: "Old" });
    let state: SessionState = sessionReducer(
      initialSessionState,
      sessionActions.initLoaded([s], "A1")
    );
    state = sessionReducer(state, sessionActions.updateSession("a", { title: "New" }));
    expect(state.sessions[0]?.title).toBe("New");
  });

  it("DELETE_SESSION reassigns active to latest remaining", () => {
    const a = baseSession({ id: "a", updatedAt: 1 });
    const b = baseSession({ id: "b", updatedAt: 2 });
    let state = sessionReducer(initialSessionState, sessionActions.initLoaded([a, b], "A1"));
    state = sessionReducer(state, sessionActions.setActive("a"));
    state = sessionReducer(state, sessionActions.deleteSession("a"));
    expect(state.activeSessionId).toBe("b");
  });
});
