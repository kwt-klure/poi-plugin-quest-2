import React, { createContext, useContext } from 'react'
import type {
  LiveQuestProgressRecord,
  LiveQuestProgressState,
} from '../liveQuestProgress'
import { usePoiLiveQuestProgress } from '../poi/hooks'

const emptyLiveQuestProgress: LiveQuestProgressState = {
  records: {},
  lastUpdatedAt: null,
}

const LiveQuestProgressContext =
  createContext<LiveQuestProgressState>(emptyLiveQuestProgress)

export const LiveQuestProgressProvider = ({
  children,
}: {
  children?: React.ReactNode
}) => {
  const liveQuestProgress = usePoiLiveQuestProgress()
  return (
    <LiveQuestProgressContext.Provider value={liveQuestProgress}>
      {children}
    </LiveQuestProgressContext.Provider>
  )
}

export const useGlobalLiveQuestProgress = () =>
  useContext(LiveQuestProgressContext)

export const useLiveQuestProgressRecord = (
  gameId: number,
): LiveQuestProgressRecord | undefined =>
  useGlobalLiveQuestProgress().records[gameId]
