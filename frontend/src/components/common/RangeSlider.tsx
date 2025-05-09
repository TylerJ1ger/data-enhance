import React, { useState, useEffect } from 'react';
import { Range, getTrackBackground } from 'react-range';

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  values: number[];
  onChange: (values: number[]) => void;
  label?: string;
  formatValue?: (value: number) => string;
  disabled?: boolean;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  step = 1,
  values,
  onChange,
  label,
  formatValue = (value) => value.toString(),
  disabled = false,
}) => {
  // 确保min不等于max以防止滑块问题
  const actualMin = min === max ? min - 1 : min;
  const actualMax = min === max ? max + 1 : max;
  
  // 初始化值在边界内
  const [localValues, setLocalValues] = useState<number[]>([
    Math.max(actualMin, Math.min(values[0], actualMax)),
    Math.max(actualMin, Math.min(values[1], actualMax)),
  ]);

  // 当props变化时更新本地值
  useEffect(() => {
    setLocalValues([
      Math.max(actualMin, Math.min(values[0], actualMax)),
      Math.max(actualMin, Math.min(values[1], actualMax)),
    ]);
  }, [values, actualMin, actualMax]);

  // 处理本地值变化
  const handleChange = (newValues: number[]) => {
    setLocalValues(newValues);
  };

  // 当值最终确定时更新父组件
  const handleFinalChange = (newValues: number[]) => {
    onChange(newValues);
  };

  return (
    <div className={`w-full py-4 ${disabled ? 'opacity-50' : ''}`}>
      {label && (
        <div className="text-sm font-medium text-gray-700 mb-2">{label}</div>
      )}
      
      <Range
        step={step}
        min={actualMin}
        max={actualMax}
        values={localValues}
        onChange={handleChange}
        onFinalChange={handleFinalChange}
        disabled={disabled}
        renderTrack={({ props, children }) => (
          <div
            {...props}
            className="w-full h-3 rounded-md"
            style={{
              background: getTrackBackground({
                values: localValues,
                colors: ['#e2e8f0', '#0ea5e9', '#e2e8f0'],
                min: actualMin,
                max: actualMax,
              }),
            }}
          >
            {children}
          </div>
        )}
        renderThumb={({ props, index }) => (
          <div
            {...props}
            className="h-5 w-5 rounded-full bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-center justify-center"
          >
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
              {formatValue(localValues[index])}
            </div>
          </div>
        )}
      />
      
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <div>{formatValue(actualMin)}</div>
        <div>{formatValue(actualMax)}</div>
      </div>
    </div>
  );
};

export default RangeSlider;