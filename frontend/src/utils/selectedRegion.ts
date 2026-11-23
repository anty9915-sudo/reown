export const defaultRegion = '서울특별시 강남구'
const storageKey = 'reown-selected-region'
const idStorageKey = 'reown-selected-region-id'

export const getSelectedRegion = (): string => {
  const savedRegion = window.localStorage.getItem(storageKey)
  return savedRegion?.trim() || defaultRegion
}

export const getSelectedRegionId = (): string | undefined => {
  const value = window.localStorage.getItem(idStorageKey)
  return value && /^[1-9]\d*$/.test(value) ? value : undefined
}

export const saveSelectedRegion = (region: string, regionId?: string): void => {
  window.localStorage.setItem(storageKey, region)
  if (regionId && /^[1-9]\d*$/.test(regionId)) {
    window.localStorage.setItem(idStorageKey, regionId)
  } else {
    window.localStorage.removeItem(idStorageKey)
  }
}

export const clearSelectedRegion = (): void => {
  window.localStorage.removeItem(storageKey)
  window.localStorage.removeItem(idStorageKey)
}
