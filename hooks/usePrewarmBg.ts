import { useEffect } from 'react';
import { Asset } from 'expo-asset';

export function usePrewarmBg(mod: any) {
  useEffect(() => {
    Asset.fromModule(mod).downloadAsync().catch(() => {});
  }, [mod]);
}
