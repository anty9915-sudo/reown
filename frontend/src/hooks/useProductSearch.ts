import { useEffect, useState } from "react"
import type { ProductSort, ProductStatus } from "../api/products"
import type { Region } from "../components/RegionSelector"
import {
  clearSelectedRegion,
  getSelectedRegion,
  getSelectedRegionId,
  saveSelectedRegion,
} from "../utils/selectedRegion"
import { useProducts } from "./useProducts"
import { useCategories } from "./useCategories"

function useDebouncedValue(value: string) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), 300)
    return () => window.clearTimeout(timeout)
  }, [value])
  return debounced
}

export function useProductSearch() {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const categoryList = useCategories()
  const [selectedRegion, setSelectedRegion] = useState(() => ({
    id: getSelectedRegionId(),
    name: getSelectedRegionId() ? getSelectedRegion() : "전체 지역",
  }))
  const [status, setStatus] = useState<ProductStatus | "">("")
  const [sort, setSort] = useState<ProductSort>("latest")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const keyword = useDebouncedValue(search).trim()
  const minimum = useDebouncedValue(minPrice)
  const maximum = useDebouncedValue(maxPrice)

  const productList = useProducts({
    keyword: keyword || undefined,
    categoryId: selectedCategory || undefined,
    regionId: selectedRegion.id,
    status: status || undefined,
    minPrice: minimum || undefined,
    maxPrice: maximum || undefined,
    sort,
  })

  const selectRegion = (name: string, region: Region) => {
    if (region.localOnly || !/^[1-9]\d*$/.test(region.id)) return
    saveSelectedRegion(name, region.id)
    setSelectedRegion({ id: region.id, name })
  }
  const resetRegion = () => {
    clearSelectedRegion()
    setSelectedRegion({ id: undefined, name: "전체 지역" })
  }
  const resetFilters = () => {
    setSearch("")
    setSelectedCategory("")
    resetRegion()
    setStatus("")
    setSort("latest")
    setMinPrice("")
    setMaxPrice("")
  }

  return {
    productList, categoryList, search, setSearch, selectedCategory, setSelectedCategory,
    selectedRegion, selectRegion, resetRegion, status, setStatus,
    sort, setSort, minPrice, setMinPrice, maxPrice, setMaxPrice, resetFilters,
  }
}
