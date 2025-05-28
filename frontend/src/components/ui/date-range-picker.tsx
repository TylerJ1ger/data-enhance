//frontend/src/components/ui/date-range-picker.tsx
"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange?: (date: Date | undefined) => void;
  onEndDateChange?: (date: Date | undefined) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  startDateLabel?: string;
  endDateLabel?: string;
  placeholder?: {
    start?: string;
    end?: string;
  };
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled = false,
  className,
  label = "订单时间范围",
  startDateLabel = "开始日期",
  endDateLabel = "结束日期",
  placeholder = {
    start: "选择开始日期",
    end: "选择结束日期"
  }
}: DateRangePickerProps) {
  const formatDate = (date: Date | undefined) => {
    if (!date) return undefined;
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const calculateDaysDiff = () => {
    if (startDate && endDate) {
      const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return diff;
    }
    return 0;
  };

  const isDateDisabled = (date: Date, type: 'start' | 'end'): boolean => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // 设置为当天结束时间
    
    // 基本限制：不能选择未来日期
    if (date > today) {
      return true;
    }
    
    if (type === 'start') {
      // 开始日期不能晚于或等于结束日期
      // 修复：确保总是返回 boolean
      if (endDate && date >= endDate) {
        return true;
      }
      return false;
    } else {
      // 结束日期不能早于或等于开始日期
      // 修复：确保总是返回 boolean
      if (startDate && date <= startDate) {
        return true;
      }
      return false;
    }
  };

  const getDateRangeValidation = () => {
    if (!startDate || !endDate) {
      return null;
    }
    
    const daysDiff = calculateDaysDiff();
    
    if (daysDiff > 365) {
      return {
        type: 'error' as const,
        message: '日期范围不能超过365天'
      };
    }
    
    if (daysDiff < 1) {
      return {
        type: 'error' as const,
        message: '日期范围至少需要1天'
      };
    }
    
    if (daysDiff > 180) {
      return {
        type: 'warning' as const,
        message: '较长的日期范围可能会影响数据生成性能'
      };
    }
    
    return {
      type: 'success' as const,
      message: `将生成 ${daysDiff} 天内的订单数据`
    };
  };

  const validation = getDateRangeValidation();

  return (
    <div className={cn("space-y-3", className)}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 开始日期 */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{startDateLabel}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground",
                  validation?.type === 'error' && "border-destructive"
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? formatDate(startDate) : placeholder.start}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={onStartDateChange}
                disabled={(date) => isDateDisabled(date, 'start')}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* 结束日期 */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{endDateLabel}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground",
                  validation?.type === 'error' && "border-destructive"
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? formatDate(endDate) : placeholder.end}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={onEndDateChange}
                disabled={(date) => isDateDisabled(date, 'end')}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* 日期范围提示和验证信息 */}
      {validation && (
        <div className={cn(
          "text-xs rounded p-2",
          validation.type === 'success' && "text-muted-foreground bg-muted/50",
          validation.type === 'warning' && "text-amber-700 bg-amber-50 border border-amber-200",
          validation.type === 'error' && "text-destructive bg-destructive/10 border border-destructive/20"
        )}>
          {validation.type === 'success' && startDate && endDate && (
            <>
              将生成从 {formatDate(startDate)} 到 {formatDate(endDate)} 期间的订单数据
              （共 {calculateDaysDiff()} 天）
            </>
          )}
          {validation.type !== 'success' && validation.message}
        </div>
      )}
      
      {/* 快速选择选项 */}
      {!disabled && (
        <div className="flex flex-wrap gap-2">
          <Label className="text-xs text-muted-foreground w-full">快速选择：</Label>
          {[
            { label: '最近7天', days: 7 },
            { label: '最近30天', days: 30 },
            { label: '最近90天', days: 90 },
            { label: '最近半年', days: 180 }
          ].map((option) => (
            <Button
              key={option.days}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                const end = new Date();
                const start = new Date();
                start.setDate(end.getDate() - option.days);
                onStartDateChange?.(start);
                onEndDateChange?.(end);
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}