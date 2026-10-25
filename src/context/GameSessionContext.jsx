import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  createGame,
  getGame,
  getScoreboard,
  getSession,
  playComputerMove,
  resetGame as resetGameApi,
  resetScoreboard as resetScoreboardApi,
  resetSession,
  submitMove,
  undoMove,
} from '../api/client.js';
import { STATUS_IN_PROGRESS } from '../constants.js';

/**
 * Centralized session state: the active game, the session scoreboard, and the
 * actions that mutate them through the API. Components read from this context
 * instead of juggling their own copies and imperative refresh callbacks.
 *
 * Presentational/UI-only state (e.g. the "computer thinking" pause) stays in
 * the components that own that interaction.
 */

/** @typedef {'restoring' | 'idle' | 'loading' | 'ready'} SessionStatus */

const GameSessionContext = createContext(null);

export function useGameSession() {
  const ctx = useContext(GameSessionContext);
  if (!ctx) {
    throw new Error('useGameSession must be used within a GameSessionProvider');
  }
  return ctx;
}

export function GameSessionProvider({ children }) {
  const [game, setGame] = useState(null);
  const [scoreboard, setScoreboard] = useState(null);
  /** @type {[SessionStatus, Function]} */
  const [status, setStatus] = useState('restoring');
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [pending, setPending] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshScoreboard = useCallback(async () => {
    try {
      const scores = await getScoreboard();
      if (mountedRef.current) setScoreboard(scores);
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    }
  }, []);

  // On mount: restore the active game (survives reload) and load scores.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [session] = await Promise.all([getSession(), refreshScoreboard()]);
        if (cancelled) return;
        if (session?.currentGameId) {
          setStatus('loading');
          const restored = await getGame(session.currentGameId);
          if (cancelled) return;
          setGame(restored);
          setStatus('ready');
        } else {
          setStatus('idle');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setStatus('idle');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshScoreboard]);

  /** Run an API call that returns the updated game, then adopt it. */
  const runGameMutation = useCallback(
    async (action) => {
      setPending(true);
      setError(null);
      try {
        const next = await action();
        if (mountedRef.current) setGame(next);
        return next;
      } catch (err) {
        if (mountedRef.current) setError(err.message);
        throw err;
      } finally {
        if (mountedRef.current) setPending(false);
      }
    },
    []
  );

  const startGame = useCallback(async (mode) => {
    setStarting(true);
    setError(null);
    try {
      const next = await createGame(mode);
      if (mountedRef.current) {
        setGame(next);
        setStatus('ready');
      }
      await refreshScoreboard();
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setStarting(false);
    }
  }, [refreshScoreboard]);

  /** Submit the human move; returns the updated game (bypasses pending). */
  const submitHumanMove = useCallback(
    async (index) => {
      if (!game) return null;
      const next = await runGameMutation(() => submitMove(game.id, index));
      if (next && next.status !== STATUS_IN_PROGRESS) {
        await refreshScoreboard();
      }
      return next;
    },
    [game, runGameMutation, refreshScoreboard]
  );

  /** Apply the computer's move (single-player); returns updated game. */
  const playComputer = useCallback(async () => {
    if (!game) return null;
    const next = await runGameMutation(() => playComputerMove(game.id));
    if (next && next.status !== STATUS_IN_PROGRESS) {
      await refreshScoreboard();
    }
    return next;
  }, [game, runGameMutation, refreshScoreboard]);

  const undo = useCallback(async () => {
    if (!game) return;
    await runGameMutation(() => undoMove(game.id));
    await refreshScoreboard();
  }, [game, runGameMutation, refreshScoreboard]);

  const resetGame = useCallback(async () => {
    if (!game) return;
    await runGameMutation(() => resetGameApi(game.id));
    await refreshScoreboard();
  }, [game, runGameMutation, refreshScoreboard]);

  /** Wipe games + scoreboard and return to mode select. */
  const newSession = useCallback(async () => {
    setError(null);
    try {
      await resetSession();
      if (!mountedRef.current) return;
      setGame(null);
      setStatus('idle');
      await refreshScoreboard();
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    }
  }, [refreshScoreboard]);

  const exitToModeSelect = useCallback(() => {
    setGame(null);
    setStatus('idle');
  }, []);

  const resetScoreboardAction = useCallback(async () => {
    setError(null);
    try {
      const scores = await resetScoreboardApi();
      if (mountedRef.current) setScoreboard(scores);
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    }
  }, []);

  const value = {
    // state
    game,
    gameId: game?.id ?? null,
    mode: game?.mode ?? null,
    scoreboard,
    status,
    error,
    starting,
    pending,
    // actions
    startGame,
    submitHumanMove,
    playComputer,
    undo,
    resetGame,
    newSession,
    exitToModeSelect,
    resetScoreboard: resetScoreboardAction,
    refreshScoreboard,
  };

  return (
    <GameSessionContext.Provider value={value}>
      {children}
    </GameSessionContext.Provider>
  );
}
