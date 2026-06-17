import React, { createContext, useContext } from 'react'
import type { LiveQuestProgressState } from '../liveQuestProgress'
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
