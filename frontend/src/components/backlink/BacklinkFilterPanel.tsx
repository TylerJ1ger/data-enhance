// frontend/src/components/backlink/BacklinkFilterPanel.tsx
import React, { useState, useEffect } from 'react';
import { FiFilter, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import RangeSlider from '../common/RangeSlider';
import Button from '../common/Button';
import { BacklinkFilterRanges, BacklinkFilterRangeValues } from '../../types';

interface BacklinkFilterPanelProps {
  filterRanges: BacklinkFilterRangeValues;
  onApplyFilter: (filters: BacklinkFilterRanges) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const BacklinkFilterPanel: React.FC<BacklinkFilterPanelProps> = ({
  filterRanges,
  onApplyFilter,
  isLoading = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [domainAscoreRange, setDomainAscoreRange] = useState<[number, number]>(filterRanges.domain_ascore);
  const [backlinksRange, setBacklinksRange] = useState<[number, number]>(filterRanges.backlinks);
  const [domainFrequencyRange, setDomainFrequencyRange] = useState<[number, number]>(filterRanges.domain_frequency);

  // Update local state when props change
  useEffect(() => {
    setDomainAscoreRange(filterRanges.domain_ascore);
    setBacklinksRange(filterRanges.backlinks);
    setDomainFrequencyRange(filterRanges.domain_frequency);
  }, [filterRanges]);

  const handleApplyFilter = () => {
    onApplyFilter({
      domain_ascore_range: domainAscoreRange,
      backlinks_range: backlinksRange,
      domain_frequency_range: domainFrequencyRange,
    });
  };

  const handleResetFilters = () => {
    setDomainAscoreRange(filterRanges.domain_ascore);
    setBacklinksRange(filterRanges.backlinks);
    setDomainFrequencyRange(filterRanges.domain_frequency);
  };

  // Format values for display
  const formatDomainAscore = (value: number) => `${value.toFixed(0)}`;
  const formatBacklinks = (value: number) => 
    value >= 1000000 
      ? `${(value / 1000000).toFixed(1)}M` 
      : value >= 1000 
        ? `${(value / 1000).toFixed(1)}K` 
        : `${value}`;
  const formatDomainFrequency = (value: number) => `${value.toFixed(0)}`;

  // 包装 setter 函数以解决类型不匹配问题
  const handleDomainAscoreChange = (values: number[]) => {
    setDomainAscoreRange([values[0], values[1]] as [number, number]);
  };

  const handleBacklinksChange = (values: number[]) => {
    setBacklinksRange([values[0], values[1]] as [number, number]);
  };

  const handleDomainFrequencyChange = (values: number[]) => {
    setDomainFrequencyRange([values[0], values[1]] as [number, number]);
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
              min={filterRanges.domain_ascore[0]}
              max={filterRanges.domain_ascore[1]}
              values={domainAscoreRange}
              onChange={handleDomainAscoreChange}
              label="域名权重"
              formatValue={formatDomainAscore}
              disabled={disabled}
            />
          </div>
          
          <div>
            <RangeSlider
              min={filterRanges.backlinks[0]}
              max={filterRanges.backlinks[1]}
              values={backlinksRange}
              onChange={handleBacklinksChange}
              label="外链数"
              formatValue={formatBacklinks}
              disabled={disabled}
            />
          </div>
          
          <div>
            <RangeSlider
              min={filterRanges.domain_frequency[0]}
              max={filterRanges.domain_frequency[1]}
              values={domainFrequencyRange}
              onChange={handleDomainFrequencyChange}
              label="域名重复次数"
              formatValue={formatDomainFrequency}
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

export default BacklinkFilterPanel;