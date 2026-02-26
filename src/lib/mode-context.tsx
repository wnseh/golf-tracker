'use client';

import { createContext, useContext } from 'react';
import type { InputMode } from './types';

interface ModeContextValue {
  mode: InputMode;
  setMode: (m: InputMode) => void;
}

const ModeContext = createContext<ModeContextValue>({
  mode: 'serious',
  setMode: () => {},
});

export const ModeProvider = ModeContext.Provider;
export const useMode = () => useContext(ModeContext);
