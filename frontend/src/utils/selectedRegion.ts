export const defaultRegion = '서울특별시 강남구'
const storageKey = 'reown-selected-region'

export const getSelectedRegion = (): string => {
  const savedRegion = window.localStorage.getItem(storageKey)
  return savedRegion?.trim() || defaultRegion
}

export const saveSelectedRegion = (region: string): void => {
  window.localStorage.setItem(storageKey, region)
}
