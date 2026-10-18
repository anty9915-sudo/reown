import { useEffect, useState } from 'react'
import './RegionSelector.css'

export type Region = {
  id: string
  sido: string
  sigungu: string | null
  eupmyeondong: string | null
}

type RegionsResponse = {
  data?: {
    items?: Region[]
  }
  error?: {
    message?: string
  }
}

type RegionSelectorProps = {
  selectedRegion: string
  // 두 번째 인자로 지역 객체(id 포함)를 넘긴다. 이름만 쓰는 기존 화면은 첫 번째 인자만 받으면 된다.
  onSelect: (regionName: string, region: Region) => void
}

// 세종특별자치시처럼 sigungu가 null인 지역은 빈 값을 빼고 이름을 만든다.
const getRegionName = (region: Region): string =>
  [region.sido, region.sigungu, region.eupmyeondong]
    .filter((part): part is string => Boolean(part))
    .join(' ')

function RegionSelector({ selectedRegion, onSelect }: RegionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [regions, setRegions] = useState<Region[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const query = keyword.trim()
    if (!isOpen || !query) return

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({ keyword: query, limit: '20' })
        const response = await fetch(`/api/v1/regions?${params}`, {
          signal: controller.signal,
        })
        const result = (await response.json()) as RegionsResponse

        if (!response.ok) {
          throw new Error(result.error?.message ?? '지역을 검색하지 못했습니다.')
        }

        setRegions(result.data?.items ?? [])
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === 'AbortError') {
          return
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : '지역 검색 중 오류가 발생했습니다.',
        )
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [isOpen, keyword])

  const selectRegion = (region: Region) => {
    onSelect(getRegionName(region), region)
    setKeyword('')
    setIsOpen(false)
  }

  return (
    <div className="region-selector">
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="location-filter"
        onClick={() => {
          if (isOpen) {
            setKeyword('')
            setRegions([])
            setError('')
            setIsLoading(false)
            setIsOpen(false)
            return
          }
          setIsOpen(true)
        }}
        type="button"
      >
        <span aria-hidden="true">⌖</span>
        {selectedRegion}
        <span className="filter-chevron">⌄</span>
      </button>

      {isOpen && (
        <div className="region-popover" role="dialog" aria-label="지역 선택">
          <label className="region-search-label" htmlFor="region-search">
            동네 이름으로 검색
          </label>
          <input
            autoFocus
            id="region-search"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="예: 역삼동, 강남구"
            value={keyword}
          />
          <div aria-live="polite" className="region-results">
            {!keyword.trim() && (
              <p className="region-hint">동네 이름이나 구 이름을 입력해 주세요.</p>
            )}
            {isLoading && <p className="region-hint">지역을 찾고 있어요...</p>}
            {!isLoading && error && <p className="region-error">{error}</p>}
            {!isLoading &&
              !error &&
              keyword.trim() &&
              regions.length === 0 && (
                <p className="region-hint">검색된 지역이 없습니다.</p>
              )}
            {keyword.trim() &&
              regions.map((region) => (
              <button
                className="region-result"
                key={region.id}
                onClick={() => selectRegion(region)}
                type="button"
              >
                <span className="region-result-icon" aria-hidden="true">⌖</span>
                <span>{getRegionName(region)}</span>
              </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default RegionSelector
