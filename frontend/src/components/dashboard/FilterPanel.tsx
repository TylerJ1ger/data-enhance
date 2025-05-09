import React, { useState, useEffect } from 'react';
import { FiFilter, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import RangeSlider from '../common/RangeSlider';
import Button from '../common/Button';
import { FilterRanges, FilterRangeValues } from '../../types';

interface FilterPanelProps {
  filterRanges: FilterRangeValues;
  onApplyFilter: (filters: FilterRanges) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filterRanges,
  onApplyFilter,
  isLoading = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [positionRange, setPositionRange] = useState<[number, number]>(filterRanges.position);
  const [searchVolumeRange, setSearchVolumeRange] = useState<[number, number]>(filterRanges.search_volume);
  const [keywordDifficultyRange, setKeywordDifficultyRange] = useState<[number, number]>(filterRanges.keyword_difficulty);
  const [cpcRange, setCpcRange] = useState<[number, number]>(filterRanges.cpc);
  // 新增关键词频率状态
  const [keywordFrequencyRange, setKeywordFrequencyRange] = useState<[number, number]>(filterRanges.keyword_frequency || [1, 100]);

  // Update local state when props change
  useEffect(() => {
    setPositionRange(filterRanges.position);
    setSearchVolumeRange(filterRanges.search_volume);
    setKeywordDifficultyRange(filterRanges.keyword_difficulty);
    setCpcRange(filterRanges.cpc);
    // 更新关键词频率
    if (filterRanges.keyword_frequency) {
      setKeywordFrequencyRange(filterRanges.keyword_frequency);
    }
  }, [filterRanges]);

  const handleApplyFilter = () => {
    onApplyFilter({
      position_range: positionRange,
      search_volume_range: searchVolumeRange,
      keyword_difficulty_range: keywordDifficultyRange,
      cpc_range: cpcRange,
      keyword_frequency_range: keywordFrequencyRange, // 加入新筛选条件
    });
  };

  const handleResetFilters = () => {
    setPositionRange(filterRanges.position);
    setSearchVolumeRange(filterRanges.search_volume);
    setKeywordDifficultyRange(filterRanges.keyword_difficulty);
    setCpcRange(filterRanges.cpc);
    setKeywordFrequencyRange(filterRanges.keyword_frequency || [1, 100]); // 重置频率
  };

  // Format values for display
  const formatPosition = (value: number) => `${value.toFixed(0)}`;
  const formatSearchVolume = (value: number) => 
    value >= 1000000 
      ? `${(value / 1000000).toFixed(1)}M` 
      : value >= 1000 
        ? `${(value / 1000).toFixed(1)}K` 
        : `${value}`;
  const formatKeywordDifficulty = (value: number) => `${value.toFixed(0)}`;
  const formatCPC = (value: number) => `$${value.toFixed(2)}`;
  // 新增频率格式化函数
  const formatKeywordFrequency = (value: number) => `${value.toFixed(0)}`;

  // 包装 setter 函数以解决类型不匹配问题
  const handlePositionChange = (values: number[]) => {
    setPositionRange([values[0], values[1]] as [number, number]);
  };

  const handleSearchVolumeChange = (values: number[]) => {
    setSearchVolumeRange([values[0], values[1]] as [number, number]);
  };

  const handleKeywordDifficultyChange = (values: number[]) => {
    setKeywordDifficultyRange([values[0], values[1]] as [number, number]);
  };

  const handleCpcChange = (values: number[]) => {
    setCpcRange([values[0], values[1]] as [number, number]);
  };

  // 新增频率处理函数
  const handleKeywordFrequencyChange = (values: number[]) => {
    setKeywordFrequencyRange([values[0], values[1]] as [number, number]);
  };

  return (
    <div className="card mb-6">
      <div 
        className="flex justify-between items-center cursor-pointer" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <FiFilter className="mr-2 text-primary-600" />
          <h3 className="text-lg font-medium text-gray-800">筛选条件</h3>
        </div>
        <div>
          {isOpen ? <FiChevronUp /> : <FiChevronDown />}
        </div>
      </div>
      
      {isOpen && (
        <div className="mt-4 space-y-6">
          <div>
            <RangeSlider
              min={filterRanges.position[0]}
              max={filterRanges.position[1]}
              values={positionRange}
              onChange={handlePositionChange}
              label="排名位置"
              formatValue={formatPosition}
              disabled={disabled}
            />
          </div>
          
          <div>
            <RangeSlider
              min={filterRanges.search_volume[0]}
              max={filterRanges.search_volume[1]}
              values={searchVolumeRange}
              onChange={handleSearchVolumeChange}
              label="搜索量"
              formatValue={formatSearchVolume}
              disabled={disabled}
            />
          </div>
          
          <div>
            <RangeSlider
              min={filterRanges.keyword_difficulty[0]}
              max={filterRanges.keyword_difficulty[1]}
              values={keywordDifficultyRange}
              onChange={handleKeywordDifficultyChange}
              label="关键词难度"
              formatValue={formatKeywordDifficulty}
              disabled={disabled}
            />
          </div>
          
          <div>
            <RangeSlider
              min={filterRanges.cpc[0]}
              max={filterRanges.cpc[1]}
              values={cpcRange}
              onChange={handleCpcChange}
              label="点击成本 (CPC)"
              formatValue={formatCPC}
              disabled={disabled}
            />
          </div>
          
          {/* 新增关键词频率筛选 */}
          <div>
            <RangeSlider
              min={1}
              max={100}
              values={keywordFrequencyRange}
              onChange={handleKeywordFrequencyChange}
              label="关键词重复次数"
              formatValue={formatKeywordFrequency}
              disabled={disabled}
            />
          </div>
          
          <div className="flex space-x-4 pt-4">
            <Button
              variant="primary"
              onClick={handleApplyFilter}
              disabled={isLoading || disabled}
              fullWidth
            >
              应用筛选
            </Button>
            <Button
              variant="secondary"
              onClick={handleResetFilters}
              disabled={isLoading || disabled}
            >
              重置
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;